// Actual scheduling/exposure logic with a renderer stand-in; no shader pixels.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
const app = path.resolve(__dirname, "..");

const compile = (relative) =>
  ts.transpileModule(fs.readFileSync(path.join(app, relative), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;

class Target {
  handlers = new Map();
  addEventListener(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
  }
  removeEventListener(name, fn) {
    this.handlers.get(name)?.delete(fn);
  }
  emit(name, event = {}) {
    for (const callback of [...(this.handlers.get(name) ?? [])])
      callback(event);
  }
  listenerCount() {
    return [...this.handlers.values()].reduce(
      (count, set) => count + set.size,
      0,
    );
  }
}

function setup(t, { active = true, speed = 0.35, reduced = false } = {}) {
  const frames = new Map();
  const intersections = [];
  const resizes = [];
  const mutations = [];
  const draws = [];
  const callbacks = [];
  let now = 1000;
  let token = 0;
  let destroyed = 0;
  let created = 0;
  const motion = Object.assign(new Target(), { matches: reduced });
  const coarse = Object.assign(new Target(), { matches: false });
  const win = Object.assign(new Target(), {
    devicePixelRatio: 2,
    matchMedia: (query) => (query.includes("reduced") ? motion : coarse),
  });
  const doc = Object.assign(new Target(), { hidden: false });
  const layer = {
    parentElement: null,
    hidden: false,
    inert: false,
    style: {},
    ariaHidden: "false",
    getAttribute(name) {
      return name === "aria-hidden" ? this.ariaHidden : null;
    },
  };
  const container = {
    parentElement: layer,
    hidden: false,
    inert: false,
    style: {},
    dataset: {},
    clientWidth: 800,
    clientHeight: 600,
    closest: () => layer,
  };
  const canvas = Object.assign(new Target(), {
    width: 1,
    height: 1,
    getContext: () => ({ isContextLost: () => false }),
  });
  const visibility = { exports: {} };
  const sandbox = {
    window: win,
    document: doc,
    getComputedStyle: (element) => ({
      visibility: element.style.visibility ?? "visible",
    }),
    requestAnimationFrame(callback) {
      frames.set(++token, callback);
      return token;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    ResizeObserver: class {
      constructor(callback) {
        this.callback = callback;
        resizes.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
    IntersectionObserver: class {
      constructor(callback) {
        this.callback = callback;
        intersections.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
        mutations.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
    fakeRenderer(_gl, _canvas, getSettings, onFrame) {
      created++;
      let width = 1;
      let height = 1;
      let time = 0;
      return {
        resize(nextWidth, nextHeight) {
          width = nextWidth;
          height = nextHeight;
        },
        draw(dt) {
          time += dt;
          const settings = getSettings();
          draws.push({ dt, tilt: settings.tilt, centerY: settings.centerY });
          onFrame?.({
            time,
            sweep: time * settings.speed,
            speed: settings.speed,
            width,
            height,
            view: {
              tilt: (settings.tilt * 180) / Math.PI,
              centerX: settings.centerX,
              centerY: settings.centerY,
              scale: settings.scale,
            },
          });
        },
        destroy() {
          destroyed++;
        },
      };
    },
  };
  vm.runInNewContext(compile("src/components/ui/effect-visibility.ts"), {
    ...sandbox,
    exports: visibility.exports,
    module: visibility,
  });
  const loaded = { exports: {} };
  vm.runInNewContext(
    compile("src/components/ui/radar-engine.ts") +
      "\ncreateRenderer = fakeRenderer;",
    {
      ...sandbox,
      exports: loaded.exports,
      module: loaded,
      require(name) {
        if (name.includes("effect-visibility")) return visibility.exports;
        if (name.includes("radar-technologies")) return { RADAR_FOCAL: 2 };
        if (name.includes("radar-shaders")) return {};
        throw Error("Unexpected dependency: " + name);
      },
    },
  );
  const controller = loaded.exports.createRadar(
    container,
    canvas,
    {
      active,
      speed,
      tilt: 64,
      centerX: 0.5,
      centerY: 0.92,
      scale: 1.7,
      color: "#479C73",
      glow: 0.3,
      opacity: 0.55,
    },
    (frame) => callbacks.push(frame),
  );
  t.after(() => controller.destroy());
  const flush = (elapsed = 16) => {
    now += elapsed;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(now));
  };
  for (const observer of intersections)
    observer.callback([{ isIntersecting: true }]);
  flush();
  return {
    controller,
    container,
    canvas,
    layer,
    frames,
    draws,
    callbacks,
    flush,
    window: win,
    document: doc,
    motion,
    coarse,
    observers: [...intersections, ...resizes, ...mutations],
    expose(value) {
      layer.ariaHidden = value ? "false" : "true";
      for (const observer of mutations)
        observer.callback([{ target: layer, attributeName: "aria-hidden" }]);
    },
    get destroyed() {
      return destroyed;
    },
    get created() {
      return created;
    },
  };
}

test("radar invalidation and camera updates coalesce into one GPU callback", (t) => {
  const f = setup(t);
  const draws = f.draws.length;
  const callbacks = f.callbacks.length;
  for (let i = 0; i < 60; i++) f.controller.invalidate();
  f.controller.update({ tilt: 32, centerY: 0.75 });
  assert.equal(
    f.draws.length,
    draws,
    "invalidation does not paint synchronously",
  );
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.draws.length, draws + 1);
  assert.equal(f.callbacks.length, callbacks + 1);
  assert.ok(Math.abs(f.callbacks.at(-1).view.tilt - 32) < 1e-8);
  assert.equal(f.callbacks.at(-1).view.centerY, 0.75);
  assert.equal(f.created, 1);
});

for (const [name, options] of [
  ["speed zero", { speed: 0 }],
  ["reduced motion", { reduced: true }],
])
  test(
    "radar " +
      name +
      " receives one static frame for progress-only invalidation",
    (t) => {
      const f = setup(t, options);
      assert.equal(f.frames.size, 0);
      const time = f.callbacks.at(-1).time;
      const draws = f.draws.length;
      f.controller.update({ tilt: 64 });
      assert.equal(
        f.frames.size,
        0,
        "the unchanged camera does not request a draw",
      );
      f.controller.invalidate();
      f.controller.invalidate();
      assert.equal(f.frames.size, 1);
      f.flush();
      assert.equal(f.draws.length, draws + 1);
      assert.equal(f.callbacks.at(-1).time, time);
      assert.equal(f.draws.at(-1).dt, 0);
      assert.equal(
        f.frames.size,
        0,
        "the redraw does not start a permanent loop",
      );
    },
  );

test("inactive and hidden radar retain updates without allocating or drawing", (t) => {
  const f = setup(t, { active: false, speed: 0 });
  f.controller.invalidate();
  f.controller.update({ tilt: 25 });
  f.flush(1000);
  assert.equal(f.created, 0);
  assert.equal(f.draws.length, 0);
  assert.equal(f.frames.size, 0);
  f.controller.update({ active: true });
  f.flush();
  assert.equal(f.created, 1);
  assert.ok(Math.abs(f.callbacks.at(-1).view.tilt - 25) < 1e-8);
  f.expose(false);
  const draws = f.draws.length;
  f.controller.update({ tilt: 40 });
  f.controller.invalidate();
  f.flush(1000);
  assert.equal(f.draws.length, draws);
  assert.equal(f.frames.size, 0);
  f.expose(true);
  f.flush();
  assert.equal(f.draws.length, draws + 1);
  assert.ok(Math.abs(f.callbacks.at(-1).view.tilt - 40) < 1e-8);
});

test("radar cleanup cancels invalidation and makes subsequent calls inert", (t) => {
  const f = setup(t, { speed: 0 });
  f.controller.invalidate();
  assert.equal(f.frames.size, 1);
  const draws = f.draws.length;
  f.controller.destroy();
  assert.equal(f.frames.size, 0);
  assert.equal(f.destroyed, 1);
  assert.ok(f.observers.every((observer) => observer.disconnected));
  for (const target of [f.window, f.document, f.canvas, f.motion, f.coarse])
    assert.equal(target.listenerCount(), 0);
  f.controller.invalidate();
  f.controller.update({ active: true, tilt: 12 });
  f.flush(2000);
  assert.equal(f.frames.size, 0);
  assert.equal(f.draws.length, draws);
  assert.equal(f.callbacks.length, draws);
});
