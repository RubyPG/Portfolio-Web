// Real veil/exposure lifecycle with a recording OGL stand-in; no shader pixels.
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
  emit(name, value = {}) {
    for (const callback of [...(this.handlers.get(name) ?? [])])
      callback(value);
  }
  listenerCount() {
    return [...this.handlers.values()].reduce(
      (count, set) => count + set.size,
      0,
    );
  }
}

function setup(t) {
  const frames = new Map();
  const mutations = [];
  const intersections = [];
  const sizes = [];
  const draws = [];
  const masks = [];
  let token = 0;
  let now = 1000;
  let ready = 0;
  let fallback = 0;
  let hit;
  const tracked = [];
  class Element extends Target {
    constructor(name, parent = null) {
      super();
      this.name = name;
      this.parentElement = parent;
      this.style = { getPropertyValue: (key) => this.style[key] ?? "" };
      this.dataset = {};
      this.attributes = new Map();
      this.hidden = false;
      this.inert = false;
      this.clientWidth = 40;
      this.clientHeight = 60;
      this.rect = { left: 100, top: 80, width: 40, height: 60 };
      tracked.push(this);
    }
    getBoundingClientRect() {
      return {
        ...this.rect,
        right: this.rect.left + this.rect.width,
        bottom: this.rect.top + this.rect.height,
      };
    }
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }
    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
    closest(selector) {
      if (selector === "[data-hero]" && this.name === "hero") return this;
      if (selector === "[inert]" && this.inert) return this;
      if (selector === "[data-site-menu]" && this.name === "menu") return this;
      return this.parentElement?.closest(selector) ?? null;
    }
    contains(element) {
      for (let node = element; node; node = node.parentElement)
        if (node === this) return true;
      return false;
    }
    appendChild(element) {
      element.parentElement = this;
    }
    remove() {
      this.parentElement = null;
    }
  }
  const html = new Element("html");
  const body = new Element("body", html);
  const scene = new Element("scene", body);
  const hero = new Element("hero", scene);
  const host = new Element("host", hero);
  const overlay = new Element("menu", body);
  hit = host;
  const win = Object.assign(new Target(), {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    scrollX: 0,
    scrollY: 0,
  });
  const gl = {
    LINEAR: 1,
    NEAREST: 2,
    UNSIGNED_BYTE: 3,
    RGBA: 4,
    RGBA16F: 5,
    HALF_FLOAT: 6,
    LINK_STATUS: 7,
    clearColor() {},
    deleteTexture() {},
    deleteFramebuffer() {},
    getProgramParameter: () => true,
    getExtension: (name) =>
      name === "WEBGL_lose_context" ? { loseContext() {} } : {},
  };
  const doc = Object.assign(new Target(), {
    hidden: false,
    body,
    documentElement: html,
    hasFocus: () => true,
    elementFromPoint: () => hit,
    elementsFromPoint: () => (hit ? [hit] : []),
    createElement() {
      const canvas = new Element("canvas");
      canvas.width = canvas.height = 1;
      canvas.getContext = (type) => {
        if (type === "webgl2") return gl;
        if (type !== "2d") return null;
        return {
          drawImage() {},
          getImageData(_x, _y, width, height) {
            const data = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < data.length; i += 4) {
              data[i] = data[i + 1] = data[i + 2] = 100;
              data[i + 3] = 255;
            }
            return { data };
          },
        };
      };
      return canvas;
    },
  });
  class Renderer {
    constructor({ canvas, dpr }) {
      this.canvas = canvas;
      this.dpr = dpr;
      this.gl = gl;
    }
    setSize(width, height) {
      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
    }
    render({ scene }) {
      const uniforms = scene.program.uniforms;
      draws.push(scene);
      if (uniforms.uStrength)
        masks.push({
          strength: uniforms.uStrength.value,
          from: [...uniforms.uFrom.value],
          to: [...uniforms.uTo.value],
          fade: uniforms.uFade.value,
        });
    }
  }
  class Program {
    constructor(_gl, options) {
      this.uniforms = options.uniforms;
      this.program = {};
    }
    remove() {}
  }
  class Texture {
    constructor(_gl, options = {}) {
      Object.assign(this, options);
      this.texture = {};
    }
  }
  class RenderTarget {
    constructor() {
      this.buffer = {};
      this.texture = new Texture();
    }
  }
  class Mesh {
    constructor(_gl, options) {
      Object.assign(this, options);
    }
  }
  class Triangle {
    remove() {}
  }
  const sandbox = {
    window: win,
    document: doc,
    Element,
    devicePixelRatio: 1,
    performance: { now: () => now },
    getComputedStyle: (element) => ({
      visibility: element.style.visibility ?? "visible",
      display: element.style.display ?? "block",
      opacity: element.style.opacity ?? "1",
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
        sizes.push(this);
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
  };
  const visibility = { exports: {} };
  vm.runInNewContext(compile("src/components/ui/effect-visibility.ts"), {
    ...sandbox,
    exports: visibility.exports,
    module: visibility,
  });
  const loaded = { exports: {} };
  vm.runInNewContext(compile("src/components/ui/dither-veil.ts"), {
    ...sandbox,
    exports: loaded.exports,
    module: loaded,
    require(name) {
      if (name === "ogl")
        return { Renderer, Program, Mesh, Triangle, Texture, RenderTarget };
      if (name.includes("effect-visibility")) return visibility.exports;
      throw Error("Unexpected dependency: " + name);
    },
  });
  const controller = loaded.exports.createDitherVeil(
    host,
    {},
    {
      inkColor: "#27563f",
      paperColor: "#e4eae8",
      pixelSize: 1,
      revealRadius: 200,
      softness: 0.6,
      linger: 1,
      onReady: () => ready++,
      onFallback: () => fallback++,
    },
  );
  t.after(() => controller.destroy());
  const flush = (elapsed = 16) => {
    now += elapsed;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  };
  const settle = () => {
    for (let count = 0; frames.size && count < 400; count++) flush();
    assert.equal(frames.size, 0, "the veil idles after a settled interaction");
  };
  const mutate = (element, attributeName) => {
    for (const observer of mutations)
      if (!observer.disconnected)
        observer.callback([{ target: element, attributeName }]);
  };
  for (const observer of intersections)
    observer.callback([{ isIntersecting: true }]);
  flush();
  settle();
  return {
    controller,
    hero,
    scene,
    host,
    overlay,
    window: win,
    document: doc,
    masks,
    draws,
    frames,
    sizes,
    intersections,
    mutations,
    tracked,
    flush,
    settle,
    mutate,
    advance: (elapsed) => (now += elapsed),
    hit: (element) => (hit = element),
    move(x = 120, y = 110, pointerType = "mouse") {
      win.emit("pointermove", { clientX: x, clientY: y, pointerType });
    },
    get ready() {
      return ready;
    },
    get fallback() {
      return fallback;
    },
  };
}

test("DitherVeil starts a long-idle hover below 20% and reveals progressively", (t) => {
  const f = setup(t);
  assert.equal(f.ready, 1);
  f.advance(15000);
  f.move();
  f.flush();
  const first = f.masks.at(-1).strength;
  assert.ok(
    first > 0 && first < 0.2,
    "first frame cannot consume the idle gap",
  );
  f.flush();
  const second = f.masks.at(-1).strength;
  assert.ok(second > first && second < 0.4);
  f.settle();
  assert.ok(f.masks.at(-1).strength > 0.95);
});

test("a stationary cursor is reacquired after the Hero becomes exposed again", (t) => {
  const f = setup(t);
  f.hero.inert = true;
  f.mutate(f.hero, "inert");
  f.flush();
  const draws = f.draws.length;
  f.move();
  f.flush(1200);
  assert.equal(
    f.draws.length,
    draws,
    "hidden Hero does not render cursor activity",
  );
  f.hero.inert = false;
  f.mutate(f.hero, "inert");
  f.flush();
  const first = f.masks.at(-1);
  assert.ok(first.strength > 0 && first.strength < 0.2);
  assert.deepEqual(first.to, [20, 30]);
  f.settle();
  assert.ok(f.masks.at(-1).strength > 0.95);
});

test("an outside cursor and an overlay cannot reveal the returned portrait", (t) => {
  const f = setup(t);
  f.hero.inert = true;
  f.mutate(f.hero, "inert");
  f.move(500, 400);
  f.hero.inert = false;
  f.mutate(f.hero, "inert");
  f.settle();
  assert.equal(f.masks.at(-1).strength, 0);
  f.hit(f.overlay);
  f.move();
  f.settle();
  assert.equal(
    f.masks.at(-1).strength,
    0,
    "menu owns the pointer above the Hero",
  );
});

test("scroll geometry reconciles a stationary cursor and keeps off-portrait movement inactive", (t) => {
  const f = setup(t);
  f.move(80, 110);
  f.settle();
  assert.equal(f.masks.at(-1).strength, 0);
  f.host.rect.left = 60;
  f.window.emit("scroll");
  f.flush();
  assert.ok(f.masks.at(-1).strength > 0 && f.masks.at(-1).strength < 0.2);
  assert.deepEqual(f.masks.at(-1).to, [20, 30]);
  f.host.rect.left = 400;
  f.window.emit("scroll");
  f.settle();
  assert.ok(f.masks.at(-1).strength < 0.01);
});

test("DitherVeil cleanup cancels pending frames and removes observers and pointer listeners", (t) => {
  const f = setup(t);
  f.move();
  f.flush();
  f.controller.destroy();
  assert.equal(f.frames.size, 0);
  assert.equal(f.fallback, 1);
  assert.equal(f.window.listenerCount(), 0);
  assert.equal(f.document.listenerCount(), 0);
  assert.ok(f.tracked.every((element) => element.listenerCount() === 0));
  assert.ok(
    [...f.sizes, ...f.intersections, ...f.mutations].every(
      (observer) => observer.disconnected,
    ),
  );
  const draws = f.draws.length;
  f.move();
  f.flush(15000);
  f.controller.setRevealProgress(1);
  f.flush();
  assert.equal(f.draws.length, draws);
  f.controller.destroy();
  assert.equal(f.fallback, 1);
});
