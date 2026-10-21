// Exercises the real engine with measured-text/canvas stand-ins, not browser pixels.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");

test("TechText defers hidden work and restores the semantic text", async () => {
  const sourceCode = fs.readFileSync(
    path.join(__dirname, "../src/components/ui/tech-text-engine.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(sourceCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  class Target {
    handlers = new Map();
    addEventListener(type, listener) {
      this.handlers.set(type, listener);
    }
    removeEventListener(type) {
      this.handlers.delete(type);
    }
    emit(type, event) {
      this.handlers.get(type)?.(event);
    }
  }
  const frames = new Map();
  const observers = {};
  let frameId = 0,
    sprites = 0,
    measurements = 0,
    clears = 0;
  const motion = Object.assign(new Target(), { matches: false });
  const pointer = Object.assign(new Target(), { matches: true });
  const layer = {
    inert: true,
    getAttribute: () => (layer.inert ? "true" : "false"),
  };
  const root = Object.assign(new Target(), {
    closest: () => layer,
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 100 }),
  });
  const context = {
    clearRect() {
      clears++;
    },
    drawImage() {},
    setTransform() {},
    strokeRect() {},
    fillRect() {},
    setLineDash() {},
    strokeText() {},
    fillText() {},
    measureText() {
      measurements++;
      return {
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 20,
        actualBoundingBoxAscent: 80,
        actualBoundingBoxDescent: 0,
      };
    },
  };
  const canvas = { width: 0, height: 0, style: {}, getContext: () => context };
  const source = { firstChild: { nodeType: 3, textContent: "MI STACK" } };
  const baseline = { getBoundingClientRect: () => ({ top: 80 }) };
  const fonts = Object.assign(new Target(), { ready: Promise.resolve() });
  const document = Object.assign(new Target(), {
    hidden: false,
    fonts,
    createElement() {
      sprites++;
      return { getContext: () => context };
    },
    createRange() {
      let start = 0;
      return {
        setStart(_node, offset) {
          start = offset;
        },
        setEnd() {},
        getBoundingClientRect: () => ({ left: start * 25 }),
      };
    },
  });
  const observer = (name) =>
    class {
      constructor(callback) {
        observers[name] = this;
        this.callback = callback;
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    };
  const engine = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: engine.exports,
    module: engine,
    document,
    Node: { TEXT_NODE: 3 },
    matchMedia: (query) => (query.includes("reduced") ? motion : pointer),
    devicePixelRatio: 2,
    performance: { now: () => 0 },
    getComputedStyle: () => ({
      fontSize: "100px",
      fontWeight: "400",
      fontFamily: "League Gothic",
      color: "#E4EAE8",
      getPropertyValue: () => "#479C73",
    }),
    requestAnimationFrame(callback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    ResizeObserver: observer("resize"),
    IntersectionObserver: observer("intersection"),
    MutationObserver: observer("layer"),
  });
  const destroy = engine.exports.createTechText({
    root,
    source,
    baseline,
    canvas,
  });
  await Promise.resolve();
  observers.resize.callback();
  observers.intersection.callback([{ isIntersecting: true }]);
  assert.equal(
    sprites,
    0,
    "fonts and intersection cannot allocate glyphs for an inert section",
  );
  layer.inert = false;
  observers.layer.callback();
  assert.equal(
    sprites,
    14,
    "seven visible letters have their fill and outline",
  );
  const initialMeasurements = measurements;
  for (let i = 0; i < 120; i++) observers.layer.callback();
  assert.equal(
    measurements,
    initialMeasurements,
    "unchanged availability never rebuilds glyphs",
  );
  root.emit("pointermove", { pointerType: "mouse", clientX: 10, clientY: 40 });
  const flush = (time) => {
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach((fn) => fn(time));
  };
  flush(16);
  assert.ok(
    root.attributes.has("data-effect-active"),
    "interaction displays the effect",
  );
  layer.inert = true;
  observers.layer.callback();
  assert.equal(frames.size, 0, "leaving the section cancels animation");
  assert.equal(
    root.attributes.has("data-effect-active"),
    false,
    "real text becomes visible again",
  );
  observers.resize.callback();
  assert.equal(sprites, 14, "resize while hidden defers rasterization");
  layer.inert = false;
  observers.layer.callback();
  assert.equal(sprites, 28, "return applies the deferred resize once");
  motion.matches = true;
  motion.emit("change");
  root.emit("pointermove", { pointerType: "mouse", clientX: 10, clientY: 40 });
  assert.equal(frames.size, 0, "reduced motion retains readable DOM text");
  assert.ok(clears > 0);
  destroy();
  assert.equal(root.handlers.size, 0);
  assert.equal(fonts.handlers.size, 0);
  assert.ok(Object.values(observers).every((item) => item.disconnected));
});
