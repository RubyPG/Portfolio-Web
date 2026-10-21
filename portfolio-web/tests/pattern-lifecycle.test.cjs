// Actual controller logic with a recording GPU stand-in. No browser or shader rendering.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const app = path.resolve(__dirname, "..");
const ts = require(path.join(app, "node_modules/typescript"));
const compile = (file) =>
  ts.transpileModule(fs.readFileSync(path.join(app, file), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
const settings = { exports: {} };
vm.runInNewContext(compile("src/components/ui/pattern-waves-settings.ts"), {
  module: settings,
  exports: settings.exports,
});
const frames = new Map();
let counter = 0,
  now = 0,
  observer,
  resizeObserver,
  mutationObserver,
  styleReads = 0,
  boundsReads = 0;
class EventTarget {
  handlers = new Map();
  addEventListener(name, fn) {
    this.handlers.set(name, fn);
  }
  removeEventListener(name) {
    this.handlers.delete(name);
  }
  emit(name, value = {}) {
    this.handlers.get(name)?.(value);
  }
}
const motion = Object.assign(new EventTarget(), { matches: false });
const coarse = Object.assign(new EventTarget(), { matches: false });
const window = Object.assign(new EventTarget(), {
  devicePixelRatio: 2,
  matchMedia(query) {
    return query.includes("reduced") ? motion : coarse;
  },
});
const document = Object.assign(new EventTarget(), {
  hidden: false,
  createElement() {
    return {
      getContext() {
        return {
          fillRect() {},
          getImageData() {
            return { data: [71, 156, 115, 255] };
          },
        };
      },
    };
  },
});
const container = Object.assign(new EventTarget(), {
  dataset: {},
  style: {},
  parentElement: null,
  hidden: false,
  inert: false,
  clientWidth: 390,
  clientHeight: 844,
  getBoundingClientRect() {
    boundsReads++;
    return { left: 0, top: 0, width: 390, height: 844 };
  },
});
const canvas = new EventTarget();
const calls = { draw: [], clear: 0, destroy: 0, resize: [], surfaces: 0 };
const fakeSurface = () => {
  calls.surfaces++;
  return {
    draw(...args) {
      calls.draw.push(args);
    },
    clear() {
      calls.clear++;
    },
    destroy() {
      calls.destroy++;
    },
    resize(...args) {
      calls.resize.push(args);
    },
    hasRipples() {
      return true;
    },
  };
};
const moduleObject = { exports: {} };
const sandbox = {
  module: moduleObject,
  exports: moduleObject.exports,
  require(name) {
    if (name.includes("settings")) return settings.exports;
    if (name.includes("effect-visibility")) return visibility.exports;
    return {};
  },
  window,
  document,
  getComputedStyle: () => {
    styleReads++;
    return { visibility: container.style.visibility ?? "visible" };
  },
  fakeSurface,
  requestAnimationFrame(fn) {
    frames.set(++counter, fn);
    return counter;
  },
  cancelAnimationFrame(id) {
    frames.delete(id);
  },
  ResizeObserver: class {
    constructor(fn) {
      resizeObserver = { callback: fn, disconnected: false };
    }
    observe() {}
    disconnect() {
      resizeObserver.disconnected = true;
    }
  },
  IntersectionObserver: class {
    constructor(fn) {
      observer = { callback: fn, disconnected: false };
    }
    observe() {}
    disconnect() {
      observer.disconnected = true;
    }
  },
  MutationObserver: class {
    constructor(fn) {
      mutationObserver = { callback: fn, disconnected: false };
    }
    observe() {}
    disconnect() {
      mutationObserver.disconnected = true;
    }
  },
};
const visibility = { exports: {} };
vm.runInNewContext(compile("src/components/ui/effect-visibility.ts"), {
  ...sandbox,
  module: visibility,
  exports: visibility.exports,
});
vm.runInNewContext(
  compile("src/components/ui/pattern-waves-engine.ts") +
    "\ncreateSurface = fakeSurface;",
  sandbox,
);
const c = moduleObject.exports.createPatternWaves(container, canvas, {
  active: false,
});
const flush = (elapsed = 34) => {
  now += elapsed;
  const batch = [...frames.values()];
  frames.clear();
  batch.forEach((fn) => fn(now));
};
observer.callback([{ isIntersecting: true }]);
assert.equal(frames.size, 0, "loader does not start rendering");
c.update({ active: true });
flush();
assert.equal(calls.surfaces, 1);
assert.equal(calls.draw.length, 1);
assert.equal(frames.size, 1, "visible waves continue");
assert.equal(calls.resize[0][2], 1.75, "desktop DPR is bounded");
c.setExitProgress(0.45);
flush();
assert.equal(calls.draw.at(-1)[5], 0.45);
c.setExitProgress(1);
c.update({ active: false });
assert.equal(frames.size, 0);
assert.equal(calls.clear, 1, "complete exit clears synchronously");
assert.ok("patternExited" in container.dataset);
c.setExitProgress(0.45);
c.update({ active: true });
flush();
assert.equal(calls.surfaces, 1, "reverse reuses the GPU context");
assert.equal(calls.draw.at(-1)[5], 0.45);
c.setExitProgress(0);
flush();
motion.matches = true;
motion.emit("change");
flush();
assert.equal(frames.size, 0, "reduced motion draws once and stops");
const staticTime = calls.draw.at(-1)[3];
window.emit("pointermove", { clientX: 100, clientY: 100 });
assert.equal(frames.size, 0, "reduced motion ignores pointer ripples");
assert.equal(calls.draw.at(-1)[3], staticTime);
c.update({ active: true });
assert.equal(
  frames.size,
  0,
  "identical active setter keeps static mode asleep",
);
const beforeStyle = styleReads;
for (let i = 0; i < 60; i++) {
  container.style.transform = `translateX(${i}px)`;
  mutationObserver.callback([{ target: container, attributeName: "style" }]);
}
assert.equal(
  styleReads,
  beforeStyle,
  "transforms do not force style resolution",
);
assert.equal(frames.size, 0, "transforms do not redraw a static surface");
const beforeResize = calls.resize.length;
resizeObserver.callback();
window.emit("resize");
assert.equal(frames.size, 0, "duplicate resize notifications do not redraw");
assert.equal(calls.resize.length, beforeResize);
container.style.visibility = "hidden";
mutationObserver.callback([{ target: container, attributeName: "style" }]);
assert.equal(frames.size, 0);
container.style.visibility = "visible";
mutationObserver.callback([{ target: container, attributeName: "style" }]);
flush();
assert.equal(frames.size, 0, "genuine visibility restores one static frame");
motion.matches = false;
motion.emit("change");
flush();
const beforeCursor = boundsReads;
for (let i = 0; i < 100; i++)
  window.emit("pointermove", { clientX: 10 + i, clientY: 100 });
assert.equal(boundsReads, beforeCursor, "pointer events defer the layout read");
flush();
assert.equal(
  boundsReads,
  beforeCursor + 1,
  "one bounds read handles 100 events",
);
assert.equal(
  calls.draw.at(-1)[6].x,
  109,
  "latest pointer position is preserved",
);
window.emit("blur");
const beforeFrames = calls.draw.length;
for (let i = 0; i < 60; i++) {
  container.style.transform = `translateX(${i}px)`;
  mutationObserver.callback([{ target: container, attributeName: "style" }]);
  flush(1000 / 60);
}
const rendered = calls.draw.length - beforeFrames;
assert.ok(
  rendered >= 29 && rendered <= 31,
  `30fps cap survives transforms: ${rendered}`,
);
document.hidden = true;
document.emit("visibilitychange");
assert.equal(frames.size, 0, "hidden tab pauses");
document.hidden = false;
document.emit("visibilitychange");
flush();
observer.callback([{ isIntersecting: false }]);
assert.equal(frames.size, 0, "offscreen pauses");
observer.callback([{ isIntersecting: true }]);
flush();
let prevented = false;
canvas.emit("webglcontextlost", {
  preventDefault() {
    prevented = true;
  },
});
assert.equal(prevented, true);
assert.equal(frames.size, 0);
canvas.emit("webglcontextrestored");
flush();
assert.equal(calls.surfaces, 2, "restoration recreates only the lost surface");
c.destroy();
assert.equal(frames.size, 0);
assert.equal(window.handlers.size, 0);
assert.equal(document.handlers.size, 0);
assert.equal(canvas.handlers.size, 0);
assert.equal(motion.handlers.size, 0);
assert.equal(observer.disconnected, true);
assert.equal(resizeObserver.disconnected, true);
assert.equal(mutationObserver.disconnected, true);
console.log(
  "PASS: PatternWaves lifecycle and real visibility observer: loader, reverse, reduced motion, cleanup; 100 pointer events/1 bounds read; 60 transforms/0 style reads; 30 draws/60 refreshes. GPU stand-in, no visual assertions.",
);
