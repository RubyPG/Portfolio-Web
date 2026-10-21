// Runs the actual animation controller with GSAP and plain-object DOM stand-ins.
// No browser, page rendering, network or WebGL assertions.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const app = path.resolve(__dirname, "..");
const ts = require(path.join(app, "node_modules/typescript"));
const { gsap } = require(path.join(app, "node_modules/gsap/dist/gsap"));
const source = ts.createSourceFile(
  "LandingStory.tsx",
  fs.readFileSync(
    path.join(app, "src/components/layout/LandingStory.tsx"),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let body;
function visit(node) {
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(source) === "media.add"
  )
    body = node.arguments[1].body.getText(source).slice(1, -1);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(body);
const compiled = ts.transpileModule(`(function(){${body}})()`, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const modelCode = ts.transpileModule(
  fs.readFileSync(path.join(app, "src/lib/contact-transition.ts"), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  },
).outputText;
const model = { exports: {} };
vm.runInNewContext(modelCode, { module: model, exports: model.exports });

function fixture(hash) {
  const listeners = new Map(),
    frames = new Map(),
    nodes = new Map(),
    timelines = [];
  let nextFrame = 0,
    options,
    context,
    dispose;
  const document = {
    documentElement: { scrollHeight: 2080 },
    activeElement: null,
  };
  class Node {
    constructor(name) {
      Object.assign(this, {
        name,
        style: {
          setProperty(k, v) {
            this[k] = v;
          },
          removeProperty(k) {
            delete this[k];
          },
        },
        dataset: {},
        attrs: {},
        inert: false,
        clientWidth: 1280,
        clientHeight: 800,
        offsetWidth: 1280,
        offsetHeight: 800,
        offsetTop: 0,
        scrollHeight: 800,
        scrollTop: 0,
        x: 0,
        y: 0,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        rotationX: 0,
        transformPerspective: 0,
        transformOrigin: "",
        autoAlpha: 1,
        opacity: 1,
        clipPath: "",
        filter: "none",
      });
    }
    querySelector(sel) {
      return node(sel);
    }
    querySelectorAll(sel) {
      return [node(sel + "1"), node(sel + "2")];
    }
    getBoundingClientRect() {
      return { top: -window.scrollY, bottom: 2080 - window.scrollY };
    }
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
    removeAttribute(k) {
      delete this.attrs[k];
    }
    getAttribute(k) {
      return this.attrs[k];
    }
    addEventListener(k, fn) {
      listeners.set(k, fn);
    }
    removeEventListener(k) {
      listeners.delete(k);
    }
    contains(n) {
      return n instanceof Node;
    }
    focus() {
      document.activeElement = this;
    }
  }
  const node = (name) => {
    if (!nodes.has(name)) nodes.set(name, new Node(name));
    return nodes.get(name);
  };
  const container = node("root"),
    viewport = node("viewport");
  container.offsetHeight = 2080;
  const window = {
    scrollY: 0,
    innerHeight: 800,
    location: { pathname: "/", search: "", hash },
    history: {
      state: null,
      replaceState(_s, _t, url) {
        window.location.hash = url.includes("#")
          ? url.slice(url.indexOf("#"))
          : "";
      },
    },
    scrollTo({ top }) {
      this.scrollY = top;
    },
    addEventListener(k, fn) {
      listeners.set(k, fn);
    },
    removeEventListener(k) {
      listeners.delete(k);
    },
  };
  const resolve = (t) => (typeof t === "string" ? node(t) : t);
  const wrappedGsap = {
    set(t, v) {
      return gsap.set(Array.isArray(t) ? t.map(resolve) : resolve(t), v);
    },
    // Plain objects have no CSSPlugin. Match its property writes without tween creation.
    quickSetter(t) {
      return (v) => Object.assign(resolve(t), v);
    },
    timeline(o) {
      const tl = gsap.timeline(o);
      const proxy = new Proxy(tl, {
        get(target, k) {
          if (k === "to")
            return (t, v, p) => {
              target.to(resolve(t), v, p);
              return proxy;
            };
          if (k === "fromTo")
            return (t, a, b, p) => {
              target.fromTo(resolve(t), a, b, p);
              return proxy;
            };
          const v = target[k];
          return typeof v === "function" ? v.bind(target) : v;
        },
      });
      timelines.push(tl);
      return proxy;
    },
  };
  const radarState = { active: true, view: {} };
  let radarWrites = 0,
    resetCalls = 0;
  const waveState = { active: true, exit: 0 };
  const refs = {
    canvas: { current: node("canvas") },
    radar: {
      current: {
        setView(v) {
          Object.assign(radarState.view, v);
        },
        setActive(v) {
          radarState.active = v;
        },
      },
    },
    showcase: {
      current: {
        setInteractionEnabled() {},
        setIntroProgress() {},
        setActive() {},
        hasSelection() {
          return false;
        },
        isTransitioning() {
          return false;
        },
        closeFocus() {
          return false;
        },
      },
    },
    dither: { current: { setRevealProgress() {} } },
    carouselReady: { current: true },
    detailIsOpen: { current: false },
    selectedProject: { current: 0 },
    setParticleProject: { current() {} },
    syncScene: { current() {} },
    detailMode: { current() {} },
  };
  const sandbox = {
    gsap: wrappedGsap,
    container,
    viewport,
    stackLayer: node("stack"),
    stackContent: node("stackContent"),
    aboutLayer: node("about"),
    aboutContent: node("aboutContent"),
    personalLayer: node("personal"),
    radarSurface: node("radar"),
    contactLayer: node("contact"),
    contactContent: node("contactContent"),
    projectLayer: node("project"),
    heroLayer: node("hero"),
    portrait: node("portrait"),
    photo: { complete: false },
    projects: [],
    getProjectCardHeight: () => 0.5,
    getProjectCardBackground: () => "",
    ...refs,
    ...model.exports,
    window,
    document,
    Element: Node,
    performance,
    requestAnimationFrame(fn) {
      frames.set(++nextFrame, fn);
      return nextFrame;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    createSceneInput(o) {
      options = o;
      return { destroy() {}, resetGesture() {} };
    },
  };
  sandbox.backgroundLayer = node("background");
  sandbox.surface = { current: node("surface") };
  sandbox.menuOpen = { current: false };
  sandbox.menuGate = { current() {} };
  sandbox.menuNavigate = { current: null };
  sandbox.setSceneBusy = () => {};
  sandbox.setMenuSection = () => {};
  sandbox.radar.current.prepare = () => {};
  sandbox.radar.current.setView = (v) => {
    radarWrites++;
    Object.assign(radarState.view, v);
  };
  sandbox.showcase.current.resetForNavigation = () => {
    resetCalls++;
    sandbox.detailIsOpen.current = false;
  };
  sandbox.waves = {
    current: {
      setExitProgress(v) {
        waveState.exit = v;
      },
      setActive(v) {
        waveState.active = v;
      },
    },
  };
  sandbox.portrait.parentElement = node("composition");
  context = gsap.context(() => {
    dispose = vm.runInNewContext(compiled, sandbox);
  });
  const flush = () => {
    const f = [...frames.values()];
    frames.clear();
    f.forEach((fn) => fn());
  };
  const complete = (i, end) => {
    timelines[i].pause().progress(end, false);
    flush();
  };
  const cleanup = () => {
    context.revert();
    dispose();
    gsap.ticker.sleep();
  };
  return {
    ...sandbox,
    timelines,
    options,
    radarState,
    waveState,
    flush,
    complete,
    cleanup,
    listeners,
    context,
    get radarWrites() {
      return radarWrites;
    },
    get resetCalls() {
      return resetCalls;
    },
  };
}

const f = fixture("#sobre-mi");
assert.equal(f.container.dataset.sceneStage, "about");
assert.equal(f.personalLayer.xPercent, 0);
for (const copy of f.aboutLayer.querySelectorAll("[data-about-copy]")) {
  assert.equal(copy.filter, "none");
  assert.equal(copy.x, 0);
  assert.equal(copy.rotationX, 0);
  assert.equal(copy.scale, 1);
}
assert.equal(f.radarState.view.tilt, 64);
assert.equal(f.contactLayer.inert, true);
f.options.onStep(1);
assert.equal(f.container.dataset.sceneStage, "transitioning");
assert.equal(f.options.isBlocked(), true);
f.timelines[4].pause().progress(0.5, false);
assert.equal(f.radarState.view.tilt, 32);
assert.equal(f.contactLayer.rotationX, 32);
assert.equal(f.aboutLayer.rotationX, -32);
assert.equal(f.radarState.active, true);
assert.equal(f.radarSurface.attrs["aria-hidden"], "false");
const midway = JSON.stringify(f.radarState.view);
f.viewport.clientHeight = 600;
f.window.innerHeight = 600;
f.listeners.get("resize")();
f.flush();
assert.equal(
  JSON.stringify(f.radarState.view),
  midway,
  "resize preserves orbit",
);
assert.equal(f.aboutLayer.transformPerspective, 1200);
f.options.onStep(-1);
assert.equal(
  f.container.dataset.sceneTarget,
  "contact",
  "busy blocks reverse requests",
);
f.complete(4, 1);
assert.equal(f.container.dataset.sceneStage, "contact");
assert.equal(f.window.location.hash, "#contacto");
assert.equal(f.contactLayer.inert, false);
assert.equal(f.aboutLayer.inert, true);
assert.equal(f.contactLayer.scale, 1);
assert.equal(f.contactLayer.opacity, 1);
assert.equal(f.radarState.view.tilt, 0);
assert.equal(f.document.activeElement, f.contactContent);
f.options.onStep(-1);
f.timelines[4].pause().progress(0.5, false);
assert.equal(
  JSON.stringify(f.radarState.view),
  midway,
  "identical inverse camera path",
);
f.complete(4, 0);
assert.equal(f.container.dataset.sceneStage, "about");
assert.equal(f.aboutLayer.opacity, 1);
assert.equal(f.contactLayer.opacity, 0);
f.options.onStep(-1);
f.complete(3, 0);
assert.equal(f.container.dataset.sceneStage, "stack");
assert.equal(f.radarState.active, false);
assert.equal(f.stackLayer.rotationX, 0, "return restores Stack plane");
assert.equal(f.stackLayer.opacity, 1);
assert.equal(f.stackLayer.scale, 1);
assert.equal(f.stackLayer.xPercent, 0);
assert.equal(f.personalLayer.xPercent, 100);
f.options.onStep(1);
f.complete(3, 1);
assert.equal(f.container.dataset.sceneStage, "about");
f.options.onStep(1);
f.complete(4, 1);
assert.equal(f.container.dataset.sceneStage, "contact");
f.cleanup();
assert.equal(
  f.radarState.active,
  true,
  "natural flow reactivates the static radar",
);
assert.equal(f.radarState.view.tilt, 0);
assert.equal(f.contactLayer.inert, false);
assert.equal(f.aboutLayer.inert, false);
assert.equal(
  f.contactLayer.opacity,
  1,
  "context restores natural-flow visibility",
);
assert.equal(f.aboutLayer.opacity, 1);
assert.equal(f.contactLayer.rotationX, 0);

const direct = fixture("#contacto");
direct.flush();
assert.equal(direct.container.dataset.sceneStage, "contact");
assert.equal(direct.radarState.view.tilt, 0);
assert.equal(direct.contactLayer.opacity, 1);
assert.equal(direct.document.activeElement, direct.contactContent);
direct.options.onStep(-1);
direct.complete(4, 0);
assert.equal(direct.container.dataset.sceneStage, "about");
direct.cleanup();
const stackEntry = fixture("#stack");
assert.equal(
  stackEntry.waveState.exit,
  1,
  "direct entry into Stack hides the Hero pattern",
);
assert.equal(stackEntry.waveState.active, false);
stackEntry.stackContent.scrollHeight = 1600;
stackEntry.stackContent.scrollTop = 800;
stackEntry.options.onStep(1);
stackEntry.timelines[3].pause().progress(0.5, false);
assert.equal(stackEntry.container.dataset.sceneStage, "transitioning");
assert.equal(
  stackEntry.personalLayer.xPercent,
  50,
  "incoming page is half open",
);
assert.equal(
  stackEntry.stackLayer.xPercent,
  -8,
  "outgoing page moves at lower speed",
);
assert.equal(
  stackEntry.stackLayer.opacity,
  1,
  "opaque paper keeps gallery covered",
);
assert.equal(stackEntry.radarSurface.x, 0, "radar has no independent entrance");
assert.equal(stackEntry.radarSurface.y, 0);
assert.equal(stackEntry.radarSurface.scale, 1);
assert.equal(stackEntry.radarSurface.opacity, 1);
const pageAtHalf = stackEntry.personalLayer.xPercent;
stackEntry.viewport.clientHeight = 320;
stackEntry.window.innerHeight = 320;
stackEntry.viewport.clientWidth = 390;
stackEntry.listeners.get("resize")();
stackEntry.flush();
assert.equal(
  stackEntry.personalLayer.xPercent,
  pageAtHalf,
  "resize keeps the page at the same progress",
);
for (const copy of stackEntry.aboutLayer
  .querySelectorAll("[data-about-copy]")
  .slice(0, 1)) {
  assert.ok(
    Math.abs(copy.x - 9.75) < 0.01,
    "resize recalculates the text parallax for the narrower viewport",
  );
}
stackEntry.complete(3, 1);
assert.equal(stackEntry.container.dataset.sceneStage, "about");
stackEntry.options.onStep(-1);
stackEntry.timelines[3].pause().progress(0.5, false);
assert.equal(
  stackEntry.personalLayer.xPercent,
  pageAtHalf,
  "reverse follows the identical page path",
);
stackEntry.complete(3, 0);
assert.equal(
  stackEntry.stackContent.scrollTop,
  800,
  "reverse preserves stack reading position",
);
assert.equal(stackEntry.stackLayer.rotationX, 0);
assert.equal(stackEntry.stackLayer.xPercent, 0);
// Both opaque pages must overlap throughout, in either direction.
for (let cycle = 0; cycle < 3; cycle++) {
  stackEntry.options.onStep(1);
  for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    stackEntry.timelines[3].pause().progress(progress, false);
    assert.ok(
      stackEntry.personalLayer.xPercent <= 100 + stackEntry.stackLayer.xPercent,
      "no gap exposes Projects",
    );
  }
  stackEntry.complete(3, 1);
  stackEntry.options.onStep(-1);
  stackEntry.complete(3, 0);
  assert.equal(stackEntry.personalLayer.xPercent, 100);
  assert.equal(stackEntry.stackLayer.xPercent, 0);
}
stackEntry.cleanup();
assert.equal(
  stackEntry.personalLayer.xPercent,
  0,
  "natural flow removes page translation",
);
assert.equal(
  stackEntry.waveState.exit,
  0,
  "natural flow restores the Hero background",
);
assert.equal(stackEntry.waveState.active, true);

const hero = fixture("");
assert.equal(hero.waveState.exit, 0);
assert.equal(hero.waveState.active, true);
hero.options.onStep(1);
hero.timelines[0].pause().progress(0.3, false);
const waveMidpoint = hero.waveState.exit;
assert.ok(
  waveMidpoint > 0 && waveMidpoint < 1,
  "strips move during the Hero departure",
);
hero.timelines[0].pause().progress(0.6, false);
assert.equal(
  hero.waveState.exit,
  1,
  "pattern clears before the project card is assembled",
);
assert.equal(hero.waveState.active, false);
assert.equal(hero.backgroundLayer.style.visibility, "hidden");
hero.complete(0, 1);
hero.complete(1, 1);
assert.equal(hero.container.dataset.sceneStage, "expanded");
hero.options.onStep(-1);
hero.complete(1, 0);
hero.timelines[0].pause().progress(0.3, false);
assert.equal(
  hero.waveState.exit,
  waveMidpoint,
  "reverse uses the identical diagonal strip path",
);
assert.equal(hero.waveState.active, true);
assert.equal(hero.backgroundLayer.style.visibility, "visible");
hero.complete(0, 0);
assert.equal(hero.waveState.exit, 0);
assert.equal(hero.container.dataset.sceneStage, "hero");
hero.cleanup();
const menu = fixture("#stack");
const oldCameraWrites = menu.radarWrites;
for (let n = 0; n < 120; n++) menu.syncScene.current();
assert.equal(
  menu.radarWrites,
  oldCameraWrites,
  "steady frames never recompute/rewrite the same radar camera",
);
for (const [section, stage, hash] of [
  ["contact", "contact", "#contacto"],
  ["hero", "hero", ""],
  ["about", "about", "#sobre-mi"],
  ["projects", "expanded", "#proyectos"],
  ["stack", "stack", "#stack"],
]) {
  menu.menuOpen.current = true;
  menu.menuGate.current(true);
  menu.menuNavigate.current(section);
  const nav = menu.timelines.at(-1);
  nav.pause().time(0.24, false);
  assert.equal(
    menu.surface.current.opacity,
    0,
    "scene changes only when invisible",
  );
  assert.equal(menu.container.dataset.sceneTarget, stage);
  menu.menuOpen.current = false;
  menu.menuGate.current(false);
  nav.progress(1, false);
  menu.flush();
  assert.equal(menu.container.dataset.sceneStage, stage);
  assert.equal(menu.window.location.hash, hash);
  assert.equal(menu.surface.current.opacity, 1);
  assert.equal(menu.surface.current.y, 0);
  assert.equal(menu.options.isBlocked(), false);
}
assert.equal(
  menu.resetCalls,
  5,
  "each direct jump clears stale project focus/detail",
);
menu.detailIsOpen.current = true;
menu.menuNavigate.current("about");
menu.timelines.at(-1).pause().progress(1, false);
menu.flush();
assert.equal(menu.detailIsOpen.current, false, "menu can leave an open detail");
assert.equal(menu.container.dataset.sceneStage, "about");
menu.cleanup();
for (const interruptedAt of [0.1, 0.5]) {
  const interrupted = fixture("#stack");
  interrupted.menuNavigate.current("contact");
  interrupted.timelines.at(-1).pause().time(interruptedAt, false);
  interrupted.cleanup();
  assert.equal(
    interrupted.surface.current.y,
    0,
    "reduced-motion cleanup restores the scene surface position",
  );
  assert.equal(
    interrupted.surface.current.opacity,
    1,
    "reduced-motion cleanup cannot leave the page faded",
  );
  assert.equal(interrupted.menuNavigate.current, null);
}
console.log(
  "PASS: actual controller with real GSAP: Hero pattern departure/reverse/visibility, About/Contact/Stack, busy input, hash, resize, focus and cleanup. Plain-object styles; no visual/WebGL assertions.",
);
