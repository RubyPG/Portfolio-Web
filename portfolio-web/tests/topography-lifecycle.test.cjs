// Runs the supplied renderer's real lifecycle with a recording WebGL stand-in.
// Shader appearance is checked separately in the real browser.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs
  .readFileSync(
    path.join(__dirname, "../src/components/ui/topography-engine.js"),
    "utf8",
  )
  .replace("export function createTopography", "function createTopography");

class Target {
  handlers = new Map();
  addEventListener(name, fn) {
    this.handlers.set(name, fn);
  }
  removeEventListener(name) {
    this.handlers.delete(name);
  }
  emit(name, event = {}) {
    this.handlers.get(name)?.(event);
  }
}

function setup({ gpu = true, reduced = false, floatTargets = true } = {}) {
  const frames = new Map();
  const idle = new Map();
  const observers = [];
  const uniforms = new Map();
  const trackedUniforms = [
    "uCamFrac",
    "uMorph",
    "uPulses",
    "uBase",
    "uCell",
    "uViewProj",
    "uFocus",
  ];
  let programCount = 0,
    currentProgram = null,
    terrainFrames = 0,
    fieldFrames = 0,
    matrixUploads = 0,
    bufferWrites = 0;
  let id = 0,
    now = 0,
    draws = 0,
    bounds = 0;
  const motion = Object.assign(new Target(), { matches: reduced });
  const window = Object.assign(new Target(), {
    devicePixelRatio: 3,
    matchMedia: () => motion,
    requestIdleCallback(fn) {
      idle.set(++id, fn);
      return id;
    },
    cancelIdleCallback(token) {
      idle.delete(token);
    },
  });
  const document = Object.assign(new Target(), {
    hidden: false,
    documentElement: new Target(),
  });
  const container = {
    dataset: {},
    clientWidth: 390,
    clientHeight: 844,
    getBoundingClientRect() {
      bounds++;
      return { left: 0, top: 0, width: 390, height: 844 };
    },
  };
  let constant = 0;
  const gl = new Proxy(
    {
      isContextLost: () => false,
      getExtension: (name) =>
        name === "EXT_color_buffer_float" && !floatTargets ? null : {},
      createProgram: () => ({ id: ++programCount }),
      useProgram(program) {
        currentProgram = program;
      },
      getShaderParameter: () => true,
      getProgramParameter: (_, flag) =>
        flag === gl.ACTIVE_UNIFORMS ? trackedUniforms.length : true,
      getActiveUniform: (_, index) => ({ name: trackedUniforms[index] }),
      getUniformLocation: (program, name) => `${program.id}:${name}`,
      uniform2f(location, x, y) {
        uniforms.set(location, [x, y]);
      },
      uniform3f(location, x, y, z) {
        uniforms.set(location, [x, y, z]);
      },
      uniformMatrix4fv() {
        matrixUploads++;
      },
      drawArrays() {
        draws++;
        if (currentProgram?.id === 2) fieldFrames++;
      },
      drawArraysInstanced() {
        draws++;
        if (currentProgram?.id === 1) terrainFrames++;
      },
    },
    {
      get(object, key) {
        if (key in object) return object[key];
        if (/^[A-Z_0-9]+$/.test(key)) return (object[key] = ++constant);
        return (object[key] = () => ({}));
      },
    },
  );
  const canvas = Object.assign(new Target(), {
    width: 1,
    height: 1,
    getContext: () => (gpu ? gl : null),
  });
  let width = 1,
    height = 1;
  Object.defineProperties(canvas, {
    width: {
      get: () => width,
      set: (value) => {
        width = value;
        bufferWrites++;
      },
    },
    height: {
      get: () => height,
      set: (value) => {
        height = value;
        bufferWrites++;
      },
    },
  });
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  const context = vm.createContext({
    window,
    document,
    ResizeObserver: Observer,
    IntersectionObserver: Observer,
    requestAnimationFrame(fn) {
      frames.set(++id, fn);
      return id;
    },
    cancelAnimationFrame(token) {
      frames.delete(token);
    },
  });
  vm.runInContext(`${source}\nthis.create = createTopography;`, context);
  return {
    create: (p = 1, active = false) =>
      context.create(container, canvas, p, active),
    frame(elapsed = 1000 / 30) {
      now += elapsed;
      const current = [...frames.values()];
      frames.clear();
      current.forEach((fn) => fn(now));
    },
    get draws() {
      return draws;
    },
    get bounds() {
      return bounds;
    },
    get terrainFrames() {
      return terrainFrames;
    },
    get fieldFrames() {
      return fieldFrames;
    },
    get matrixUploads() {
      return matrixUploads;
    },
    get bufferWrites() {
      return bufferWrites;
    },
    uniforms,
    frames,
    idle,
    observers,
    window,
    document,
    canvas,
    container,
    motion,
  };
}

test("terrain renders only while its scene is active; batches pointer geometry and caps mobile DPR", () => {
  const h = setup();
  const c = h.create();
  assert.equal(h.frames.size, 0);
  assert.equal(h.draws, 0);
  assert.equal(h.canvas.width, Math.round(390 * 1.25));
  c.setActive(true);
  h.frame();
  assert.ok(h.draws > 0);
  const before = h.bounds;
  for (let i = 0; i < 100; i++)
    h.window.emit("pointermove", { clientX: 100 + i, clientY: 200 });
  assert.equal(h.bounds, before);
  h.frame();
  assert.equal(h.bounds, before + 1);
  c.setActive(false);
  const paused = h.draws;
  h.frame();
  assert.equal(h.frames.size, 0);
  assert.equal(h.draws, paused);
  c.destroy();
});

test("terrain pauses at Hero, offscreen, and in a hidden document, and cleans all listeners", () => {
  const h = setup();
  const c = h.create(1, true);
  c.setProgress(0);
  assert.equal(h.frames.size, 0);
  c.setProgress(0.5);
  assert.equal(h.frames.size, 1);
  h.observers[1].callback([{ isIntersecting: false }]);
  assert.equal(h.frames.size, 0);
  h.observers[1].callback([{ isIntersecting: true }]);
  assert.equal(h.frames.size, 1);
  h.document.hidden = true;
  h.document.emit("visibilitychange");
  assert.equal(h.frames.size, 0);
  c.destroy();
  assert.ok(h.observers.every((observer) => observer.disconnected));
  assert.equal(h.window.handlers.size, 0);
  assert.equal(h.document.handlers.size, 0);
  assert.equal(h.canvas.handlers.size, 0);
  assert.equal(h.motion.handlers.size, 0);
});

test("reduced motion settles to one static terrain and disabled GPU retains the fallback", () => {
  const h = setup({ reduced: true });
  const c = h.create(1, true);
  for (let i = 0; i < 90; i++) h.frame();
  assert.equal(h.frames.size, 0);
  const staticDraws = h.draws;
  h.window.emit("pointermove", { clientX: 200, clientY: 200 });
  h.frame();
  assert.equal(h.draws, staticDraws);
  c.destroy();
  const fallback = setup({ gpu: false });
  const missing = fallback.create(1, true);
  assert.equal(fallback.container.dataset.topographyReady, undefined);
  assert.equal(fallback.frames.size, 0);
  missing.setProgress(0.6);
  missing.destroy();
});

test("context restoration rebuilds terrain once; unmount cancels delayed preparation", () => {
  const h = setup();
  const c = h.create(1, true);
  let prevented = false;
  h.canvas.emit("webglcontextlost", {
    preventDefault() {
      prevented = true;
    },
  });
  assert.ok(prevented);
  assert.equal(h.frames.size, 0);
  assert.equal(h.container.dataset.topographyReady, undefined);
  h.canvas.emit("webglcontextrestored");
  assert.equal(h.container.dataset.topographyReady, "");
  assert.equal(h.frames.size, 1);
  c.destroy();
  const delayed = setup();
  const next = delayed.create(0, false);
  assert.equal(delayed.idle.size, 1);
  next.destroy();
  assert.equal(delayed.idle.size, 0);
  assert.equal(delayed.frames.size, 0);
});

test("terrain pacing targets 60 frames across 60, 90 and 120 Hz without changing travel speed", () => {
  const positions = [];
  for (const hz of [60, 90, 120]) {
    const h = setup();
    const c = h.create();
    c.setActive(true);
    for (let i = 0; i < hz * 2; i++) h.frame(1000 / hz);
    assert.ok(
      h.terrainFrames >= 119 && h.terrainFrames <= 121,
      `${hz}Hz: ${h.terrainFrames} frames in two seconds`,
    );
    positions.push(h.uniforms.get("1:uCamFrac"));
    assert.equal(h.frames.size, 1, "only one future frame is scheduled");
    c.destroy();
  }
  for (const position of positions.slice(1)) {
    assert.ok(
      Math.abs(position[1] - positions[0][1]) < 0.001,
      "motion remains based on elapsed time",
    );
  }
});

test("passive frames reuse the height field and camera; sculpt interaction invalidates immediately", () => {
  const h = setup();
  const c = h.create();
  c.setActive(true);
  for (let i = 0; i < 120; i++) h.frame(1000 / 60);
  assert.ok(
    h.fieldFrames <= h.terrainFrames * 0.6,
    "height updates are shared by consecutive contour frames",
  );
  assert.equal(
    h.matrixUploads,
    1,
    "static camera uploads once while the terrain glides",
  );
  h.window.emit("pointermove", { clientX: 195, clientY: 422 });
  h.frame(1000 / 60);
  const before = h.fieldFrames;
  for (let i = 0; i < 10; i++) h.frame(1000 / 60);
  assert.equal(
    h.fieldFrames - before,
    10,
    "active sculpt refreshes the height field every contour frame",
  );
  c.destroy();
});

test("duplicate resize and activity notifications do not clear or redraw a static scene", () => {
  const h = setup({ reduced: true });
  const c = h.create(1, true);
  for (let i = 0; i < 90; i++) h.frame();
  const before = { draws: h.draws, writes: h.bufferWrites };
  h.observers[0].callback();
  h.observers[0].callback();
  c.setActive(true);
  h.frame();
  assert.equal(h.bufferWrites, before.writes);
  assert.equal(h.draws, before.draws);
  assert.equal(h.frames.size, 0);
  h.container.clientWidth = 768;
  h.observers[0].callback();
  assert.ok(
    h.bufferWrites > before.writes,
    "a real size change still resizes the drawing buffer",
  );
  assert.ok(h.draws > before.draws);
  c.destroy();
});

test("autofocus returns promptly after the pointer leaves, while sculpt trails can keep settling", () => {
  const h = setup();
  const c = h.create(1, true);
  const restingFocus = h.uniforms.get("1:uFocus")[0];
  h.window.emit("pointermove", { clientX: 10, clientY: 10 });
  for (let i = 0; i < 60; i++) h.frame(1000 / 60);
  const hoverDistance = Math.abs(h.uniforms.get("1:uFocus")[0] - restingFocus);
  assert.ok(hoverDistance > 0.5, "hover actually changes the focus plane");
  h.document.documentElement.emit("pointerleave");
  for (let i = 0; i < 45; i++) h.frame(1000 / 60);
  assert.ok(
    Math.abs(h.uniforms.get("1:uFocus")[0] - restingFocus) <
      hoverDistance * 0.2,
    "focus returns within 750ms instead of waiting for the retained hit to expire",
  );
  c.destroy();
});

test("the non-floating WebGL path retains a bounded 30fps cadence without height-cache passes", () => {
  const h = setup({ floatTargets: false });
  const c = h.create();
  c.setActive(true);
  for (let i = 0; i < 120; i++) h.frame(1000 / 120);
  assert.ok(h.terrainFrames >= 29 && h.terrainFrames <= 31);
  assert.equal(h.fieldFrames, 0);
  c.destroy();
});
