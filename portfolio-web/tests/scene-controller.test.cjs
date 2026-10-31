// Actual scene controller and Anime.js clocks with DOM/renderer boundary spies.
// No browser pixels, pointer hit testing, WebGL or wall-clock sleeps.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const anime = require("animejs");
const app = path.resolve(__dirname, "..");
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
function load(relative, dependencies = {}) {
  const loaded = { exports: {} };
  new Function(
    "exports",
    "require",
    "module",
    compile(fs.readFileSync(path.join(app, relative), "utf8")),
  )(
    loaded.exports,
    (name) => {
      assert.ok(
        Object.hasOwn(dependencies, name),
        `Unexpected dependency: ${name}`,
      );
      return dependencies[name];
    },
    loaded,
  );
  return loaded.exports;
}
const contact = load("src/lib/contact-transition.ts");
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
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "mountStory"
  )
    body = node.initializer.body.getText(source).slice(1, -1);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(body, "mountStory must remain independently exercisable");
const controllerCode = compile(`return (function(){${body}})();`);
const CLOCK = {
  hero: 0,
  stack: 1,
  about: 2,
  contact: 3,
};

function fixture(hash = "") {
  const listeners = new Map(),
    frames = new Map(),
    nodes = new Map();
  const clocks = [],
    clockRuns = [],
    menuRuns = [];
  let nextFrame = 0,
    inputOptions,
    resetCalls = 0,
    radarWrites = 0;
  let disposed = false;
  const doc = { documentElement: { scrollHeight: 2080 }, activeElement: null };
  class Style {
    setProperty(key, value) {
      this[key] = value;
    }
    getPropertyValue(key) {
      return this[key] || "";
    }
    getPropertyPriority() {
      return "";
    }
    removeProperty(key) {
      delete this[key];
    }
  }
  class Node {
    constructor(name) {
      Object.assign(this, {
        name,
        style: new Style(),
        dataset: {},
        attrs: {},
        inert: false,
        clientWidth: 1280,
        clientHeight: 800,
        offsetWidth: 1280,
        offsetHeight: 800,
        offsetTop: 0,
        offsetLeft: 0,
        scrollHeight: 800,
        scrollTop: 0,
      });
    }
    querySelector(selector) {
      return node(selector);
    }
    querySelectorAll(selector) {
      return [node(`${selector}1`), node(`${selector}2`)];
    }
    getBoundingClientRect() {
      return {
        top: -win.scrollY,
        bottom: 2080 - win.scrollY,
        left: 0,
        width: this.clientWidth,
        height: this.clientHeight,
      };
    }
    getAttribute(key) {
      if (key === "style") {
        const entries = Object.entries(this.style);
        return entries.length
          ? entries.map(([k, v]) => `${k}:${v}`).join(";")
          : null;
      }
      return this.attrs[key] ?? null;
    }
    setAttribute(key, value) {
      if (key === "style") {
        this.style = new Style();
        for (const entry of value.split(";")) {
          const divider = entry.indexOf(":");
          if (divider >= 0)
            this.style[entry.slice(0, divider)] = entry.slice(divider + 1);
        }
      } else this.attrs[key] = value;
    }
    removeAttribute(key) {
      if (key === "style") this.style = new Style();
      else delete this.attrs[key];
    }
    hasAttribute(key) {
      return Object.hasOwn(this.attrs, key);
    }
    closest(selector) {
      return selector
        .split(",")
        .some((part) => this.hasAttribute(part.trim().slice(1, -1)))
        ? this
        : null;
    }
    addEventListener(key, callback) {
      listeners.set(key, callback);
    }
    removeEventListener(key) {
      listeners.delete(key);
    }
    contains(value) {
      return value instanceof Node;
    }
    focus() {
      doc.activeElement = this;
    }
  }
  function node(name) {
    if (!nodes.has(name)) {
      const element = new Node(name);
      nodes.set(name, element);
    }
    return nodes.get(name);
  }
  const container = node("root"),
    viewport = node("viewport");
  container.offsetHeight = 2080;
  const win = {
    scrollY: 0,
    innerHeight: 800,
    location: { pathname: "/", search: "", hash },
    history: {
      state: null,
      replaceState(_state, _title, url) {
        win.location.hash = url.includes("#")
          ? url.slice(url.indexOf("#"))
          : "";
      },
    },
    scrollTo({ top }) {
      this.scrollY = top;
    },
    addEventListener(key, callback) {
      listeners.set(key, callback);
    },
    removeEventListener(key) {
      listeners.delete(key);
    },
  };
  const clockModule = load("src/lib/scene-clock.ts", {
    animejs: {
      animate(...args) {
        const result = anime.animate(...args);
        clockRuns.push(result);
        return result;
      },
    },
  });
  const environmentState = {
    stack: 0,
    about: 0,
    measurements: [],
    destroyed: 0,
  };
  const radarState = { active: true, view: {}, technologyProgress: 0 };
  const waveState = { active: true, terrain: 0 };
  const showcaseState = {
    active: false,
    interactive: true,
    intro: 0,
    selected: false,
    transitioning: false,
    closeCalls: 0,
  };
  const sandbox = {
    animate(...args) {
      const result = anime.animate(...args);
      menuRuns.push(result);
      return result;
    },
    eases: anime.eases,
    createSceneClock(options) {
      const result = clockModule.createSceneClock(options);
      clocks.push(result);
      return result;
    },
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
    backgroundLayer: node("background"),
    surface: { current: node("surface") },
    world: { current: node("world") },
    radar: {
      current: {
        prepare() {},
        setView(value) {
          radarWrites++;
          Object.assign(radarState.view, value);
        },
        setActive(value) {
          radarState.active = value;
        },
        setTechnologyProgress(value) {
          radarState.technologyProgress = value;
        },
      },
    },
    showcase: {
      current: {
        setInteractionEnabled(value) {
          showcaseState.interactive = value;
        },
        setIntroProgress(value) {
          showcaseState.intro = value;
        },
        setActive(value) {
          showcaseState.active = value;
        },
        hasSelection() {
          return showcaseState.selected;
        },
        isTransitioning() {
          return showcaseState.transitioning;
        },
        closeFocus() {
          showcaseState.closeCalls++;
          const selected = showcaseState.selected;
          showcaseState.selected = false;
          return selected;
        },
        resetForNavigation() {
          resetCalls++;
          sandbox.detailIsOpen.current = false;
          showcaseState.selected = false;
        },
      },
    },
    waves: {
      current: {
        setTerrainProgress(value) {
          waveState.terrain = value;
        },
        setActive(value) {
          waveState.active = value;
        },
      },
    },
    dither: { current: { setRevealProgress() {} } },
    projectsReady: { current: true },
    menuAnchors: {
      hero: "inicio",
      projects: "proyectos",
      stack: "stack",
      about: "sobre-mi",
      contact: "contacto",
    },
    detailIsOpen: { current: false },
    syncScene: { current() {} },
    detailMode: { current() {} },
    menuOpen: { current: false },
    menuGate: { current() {} },
    menuNavigate: { current: null },
    setSceneBusy() {},
    setMenuSection() {},
    ...contact,
    window: win,
    document: doc,
    Element: Node,
    performance,
    requestAnimationFrame(callback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    createSceneInput(options) {
      inputOptions = options;
      return { destroy() {}, resetGesture() {} };
    },
    createEnvironmentTransition({
      viewport: measuredViewport,
      projectLayer,
      world,
    }) {
      assert.equal(measuredViewport, viewport);
      assert.equal(world, sandbox.world.current);
      assert.equal(projectLayer, node("[data-project-environment]"));
      assert.notEqual(
        projectLayer,
        node("project"),
        "environment transforms use an independent wrapper",
      );
      return {
        render(stack, about) {
          environmentState.stack = stack;
          environmentState.about = about;
        },
        measure() {
          environmentState.measurements.push([
            viewport.clientWidth,
            viewport.clientHeight,
          ]);
        },
        getRadarView() {
          return {
            tilt: 72 - 8 * environmentState.about,
            centerX: 0.5,
            centerY: 0.94,
            scale: 1.3,
          };
        },
        destroy() {
          environmentState.destroyed++;
        },
      };
    },
  };
  sandbox.portrait.parentElement = node("composition");
  const dispose = new Function(...Object.keys(sandbox), controllerCode)(
    ...Object.values(sandbox),
  );
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback());
  };
  return {
    ...sandbox,
    clocks,
    clockRuns,
    menuRuns,
    options: inputOptions,
    environmentState,
    radarState,
    waveState,
    showcaseState,
    listeners,
    node,
    flush,
    complete(name, progress) {
      clocks[CLOCK[name]].pause().progress(progress, false);
      flush();
    },
    tick(progress = 1) {
      const animation = clockRuns.at(-1);
      animation.pause().seek(animation.duration * progress, false);
      flush();
    },
    clickNavigation(attribute) {
      const link = node(attribute);
      link.setAttribute(attribute, "");
      let prevented = false;
      listeners.get("click")({
        button: 0,
        target: link,
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, true);
    },
    resize(width, height) {
      viewport.clientWidth = width;
      viewport.clientHeight = height;
      win.innerHeight = height;
      listeners.get("resize")();
      flush();
    },
    cleanup() {
      if (disposed) return;
      disposed = true;
      dispose();
    },
    get radarWrites() {
      return radarWrites;
    },
    get resetCalls() {
      return resetCalls;
    },
  };
}

function setup(t, hash) {
  const f = fixture(hash);
  t.after(() => f.cleanup());
  return f;
}

for (const [hash, stage, stack, about] of [
  ["", "hero", 0, 0],
  ["#cubo", "projects", 0, 0],
  ["#proyectos", "projects", 0, 0],
  ["#stack", "stack", 1, 0],
  ["#sobre-mi", "about", 1, 1],
  ["#contacto", "contact", 1, 1],
])
  test(
    "direct " +
      (hash || "Hero") +
      " entry places clocks, environment and controls",
    (t) => {
      const f = setup(t, hash);
      f.flush();
      assert.equal(f.container.dataset.sceneStage, stage);
      assert.equal(f.environmentState.stack, stack);
      assert.equal(f.environmentState.about, about);
      assert.equal(f.options.isBlocked(), false);
      assert.equal(f.showcaseState.interactive, stage === "projects");
      assert.equal(
        f.heroLayer.inert,
        stage !== "hero",
        "hidden Hero cannot intercept input",
      );
      assert.equal(f.waveState.terrain, stage === "hero" ? 0 : 1);
      assert.equal(f.waveState.active, ["hero", "projects"].includes(stage));
      assert.equal(f.radarState.technologyProgress, about);
      const expectedFocus = {
        projects: f.node("[data-project-gallery]"),
        stack: f.stackContent,
        about: f.aboutContent,
        contact: f.contactContent,
      }[stage];
      if (expectedFocus) assert.equal(f.document.activeElement, expectedFocus);
    },
  );

test("Hero enters the terrain and reveals projects in one reversible passage", (t) => {
  const f = setup(t);
  assert.equal(f.waveState.active, true);
  assert.equal(f.heroLayer.inert, false);
  f.options.onStep(1);
  assert.equal(f.clockRuns.at(-1).duration, 1250);
  f.complete("hero", 0.2);
  const terrain = f.waveState.terrain;
  const portrait = f.portrait.getAttribute("style");
  assert.ok(terrain > 0 && terrain < 1);
  assert.equal(f.showcaseState.intro, 0);
  assert.equal(f.heroLayer.inert, true);
  assert.equal(f.options.isBlocked(), true);
  f.options.onStep(1);
  f.options.onStep(-1);
  assert.equal(
    f.container.dataset.sceneTarget,
    "projects",
    "busy gestures cannot queue another scene",
  );
  assert.equal(f.clockRuns.length, 1);
  f.complete("hero", 0.72);
  assert.ok(f.showcaseState.intro > 0 && f.showcaseState.intro < 1);
  assert.equal(f.projectLayer.inert, true);
  f.resize(390, 844);
  assert.equal(f.clocks[CLOCK.hero].progress(), 0.72);
  f.complete("hero", 1);
  assert.equal(f.container.dataset.sceneStage, "projects");
  assert.equal(f.window.location.hash, "#proyectos");
  assert.equal(f.waveState.terrain, 1);
  assert.equal(
    f.waveState.active,
    true,
    "terrain remains behind the project marks",
  );
  assert.equal(f.showcaseState.interactive, true);
  assert.equal(f.document.activeElement, f.node("[data-project-gallery]"));
  f.resize(1280, 800);
  f.options.onStep(-1);
  f.complete("hero", 0.2);
  assert.equal(f.waveState.terrain, terrain);
  assert.equal(f.portrait.getAttribute("style"), portrait);
  assert.equal(f.heroLayer.inert, true);
  f.complete("hero", 0);
  assert.equal(f.container.dataset.sceneStage, "hero");
  assert.equal(f.waveState.terrain, 0);
  assert.equal(f.heroLayer.inert, false);
  assert.equal(f.portrait.style.opacity, "1");
});

test("projects wait for readiness and prevent gestures during project selection", (t) => {
  const f = setup(t, "#proyectos");
  f.projectsReady.current = false;
  f.syncScene.current();
  assert.equal(f.showcaseState.interactive, false);
  f.projectsReady.current = true;
  f.syncScene.current();
  assert.equal(f.showcaseState.interactive, true);
  f.showcaseState.transitioning = true;
  assert.equal(f.options.isBlocked(), true);
  f.options.onStep(1);
  assert.equal(f.clockRuns.length, 0);
  f.showcaseState.transitioning = false;
  f.options.onStep(1);
  assert.equal(f.clockRuns.length, 1);
});

test("Projects and Stack share reversible progress across resize in one gesture", (t) => {
  const f = setup(t, "#proyectos");
  f.options.onStep(1);
  assert.equal(f.clockRuns.at(-1).duration, 1000);
  f.complete("stack", 0.5);
  assert.equal(f.environmentState.stack, 0.5);
  assert.equal(f.projectLayer.inert, true);
  assert.equal(f.stackLayer.inert, true);
  assert.equal(f.waveState.active, true);
  f.resize(390, 844);
  assert.equal(f.environmentState.stack, 0.5);
  assert.deepEqual(f.environmentState.measurements.at(-1), [390, 844]);
  f.complete("stack", 1);
  assert.equal(f.container.dataset.sceneStage, "stack");
  assert.equal(f.stackLayer.inert, false);
  assert.equal(f.document.activeElement, f.stackContent);
  assert.equal(f.waveState.active, false);
  f.options.onStep(-1);
  f.complete("stack", 0.5);
  assert.equal(f.environmentState.stack, 0.5);
  f.complete("stack", 0);
  assert.equal(f.container.dataset.sceneStage, "projects");
  assert.equal(f.showcaseState.intro, 1);
  assert.equal(f.projectLayer.inert, false);
  assert.equal(f.waveState.active, true);
});

test("explicit section links bypass inner scroll but retain the project selection guard", (t) => {
  const f = setup(t, "#proyectos");
  f.showcaseState.selected = true;
  f.clickNavigation("data-stack-open");
  assert.equal(f.clockRuns.length, 0);
  f.showcaseState.selected = false;
  f.clickNavigation("data-stack-open");
  assert.equal(f.clockRuns.at(-1).duration, 1000);
  f.tick(0.5);
  assert.equal(f.options.isBlocked(), true);
  f.tick();
  assert.equal(f.container.dataset.sceneStage, "stack");
  assert.equal(f.document.activeElement, f.stackContent);
  f.stackContent.scrollHeight = 1600;
  f.stackContent.scrollTop = 260;
  assert.equal(f.options.handlesDirection(-1), false);
  f.options.onStep(-1);
  assert.equal(f.container.dataset.sceneStage, "stack");
  f.clickNavigation("data-stack-back");
  assert.equal(f.clockRuns.at(-1).duration, 1000);
  f.tick();
  assert.equal(f.container.dataset.sceneStage, "projects");
  assert.equal(f.document.activeElement, f.node("[data-project-gallery]"));
});

test("the terrain pauses for menu and detail, resuming only in the project environment", (t) => {
  const f = setup(t, "#proyectos");
  assert.equal(f.waveState.active, true);
  f.menuOpen.current = true;
  f.menuGate.current(true);
  assert.equal(f.waveState.active, false);
  f.syncScene.current();
  assert.equal(f.waveState.active, false);
  f.menuOpen.current = false;
  f.menuGate.current(false);
  assert.equal(f.waveState.active, true);
  f.detailIsOpen.current = true;
  f.detailMode.current(true);
  assert.equal(f.waveState.active, false);
  f.syncScene.current();
  f.menuGate.current(false);
  assert.equal(f.waveState.active, false);
  const progress = f.waveState.terrain;
  f.options.onStep(1);
  assert.equal(f.clockRuns.length, 0);
  assert.equal(f.waveState.terrain, progress);
  f.detailIsOpen.current = false;
  f.detailMode.current(false);
  assert.equal(f.waveState.active, true);
  f.options.onStep(1);
  f.tick();
  assert.equal(f.container.dataset.sceneStage, "stack");
  f.menuGate.current(false);
  assert.equal(f.waveState.active, false);
});

test("native scroll bursts cannot enqueue transitions or leave inner reading scenes", (t) => {
  const f = setup(t);
  f.window.scrollY = 40;
  f.listeners.get("scroll")();
  assert.equal(f.clockRuns.length, 1);
  assert.equal(f.container.dataset.sceneTarget, "projects");
  f.tick();
  for (let index = 0; index < 3; index++) {
    f.window.scrollY += 30;
    f.listeners.get("scroll")();
  }
  assert.equal(f.clockRuns.length, 1);
  assert.equal(f.container.dataset.sceneStage, "projects");
  f.options.onStep(1);
  f.tick();
  f.window.scrollY -= 30;
  f.listeners.get("scroll")();
  assert.equal(f.container.dataset.sceneStage, "stack");
  assert.equal(f.clockRuns.length, 2);
});

test("disposing an active terrain passage restores flow and rejects stale completion", (t) => {
  const f = setup(t);
  f.options.onStep(1);
  f.tick(0.5);
  const interrupted = f.clockRuns.at(-1);
  f.cleanup();
  assert.equal(f.environmentState.destroyed, 1);
  assert.equal(f.container.dataset.scrollStory, undefined);
  assert.equal(f.heroLayer.inert, false);
  assert.equal(f.projectLayer.inert, false);
  assert.equal(f.stackLayer.inert, false);
  assert.equal(f.showcaseState.interactive, true);
  assert.equal(f.waveState.terrain, 0);
  assert.equal(f.portrait.getAttribute("style"), null);
  const state = f.environmentState.stack;
  const focus = f.document.activeElement;
  interrupted.onUpdate(interrupted);
  interrupted.onComplete(interrupted);
  assert.equal(f.environmentState.stack, state);
  assert.equal(f.document.activeElement, focus);
  assert.equal(f.container.dataset.sceneStage, undefined);
});

test("Stack/About reverse preserves reading position, camera and repeated-cycle gates", (t) => {
  const f = setup(t, "#stack");
  f.stackContent.scrollHeight = 1588;
  f.stackContent.scrollTop = 788;
  f.options.onStep(1);
  f.complete("about", 0.5);
  const camera = JSON.stringify(f.radarState.view);
  assert.equal(f.environmentState.about, 0.5);
  assert.equal(f.radarState.view.tilt, 68);
  assert.equal(f.radarState.technologyProgress, 0.5);
  assert.equal(f.stackLayer.inert, true);
  assert.equal(f.aboutLayer.inert, true);
  f.resize(390, 320);
  assert.equal(f.environmentState.about, 0.5);
  assert.equal(JSON.stringify(f.radarState.view), camera);
  f.complete("about", 1);
  assert.equal(f.container.dataset.sceneStage, "about");
  assert.equal(f.radarState.view.tilt, 64);
  assert.equal(f.aboutLayer.inert, false);
  f.options.onStep(-1);
  f.complete("about", 0.5);
  assert.equal(JSON.stringify(f.radarState.view), camera);
  f.complete("about", 0);
  assert.equal(f.stackContent.scrollTop, 788);
  assert.equal(f.stackLayer.inert, false);
  for (let cycle = 0; cycle < 3; cycle++) {
    f.options.onStep(1);
    for (const progress of [0.1, 0.5, 0.9]) {
      f.complete("about", progress);
      assert.equal(f.environmentState.about, progress);
      assert.equal(f.projectLayer.inert, true);
      assert.equal(f.stackLayer.inert, true);
      assert.equal(f.aboutLayer.inert, true);
    }
    f.complete("about", 1);
    f.options.onStep(-1);
    f.complete("about", 0);
    assert.equal(f.environmentState.about, 0);
    assert.equal(f.stackContent.scrollTop, 788);
  }
});

test("About/Contact retains its shared reversible camera, focus and resize behavior", (t) => {
  const f = setup(t, "#sobre-mi");
  f.options.onStep(1);
  f.complete("contact", 0.5);
  assert.equal(f.radarState.view.tilt, 32);
  assert.match(f.contactLayer.style.transform, /rotateX\(32deg\)/);
  assert.match(f.aboutLayer.style.transform, /rotateX\(-32deg\)/);
  const camera = JSON.stringify(f.radarState.view);
  f.resize(1280, 600);
  assert.equal(JSON.stringify(f.radarState.view), camera);
  assert.match(f.aboutLayer.style.transform, /perspective\(1200px\)/);
  f.options.onStep(-1);
  assert.equal(f.container.dataset.sceneTarget, "contact");
  f.complete("contact", 1);
  assert.equal(f.window.location.hash, "#contacto");
  assert.equal(f.radarState.view.tilt, 0);
  assert.equal(f.contactLayer.inert, false);
  assert.equal(f.aboutLayer.inert, true);
  assert.equal(f.document.activeElement, f.contactContent);
  f.options.onStep(-1);
  f.complete("contact", 0.5);
  assert.equal(JSON.stringify(f.radarState.view), camera);
  f.complete("contact", 0);
  assert.equal(f.container.dataset.sceneStage, "about");
  assert.equal(f.aboutLayer.style.opacity, "1");
  assert.equal(f.contactLayer.style.opacity, "0");
});

test("menu jumps place every scene while invisible and can leave a project detail", (t) => {
  const f = setup(t, "#stack");
  const cameraWrites = f.radarWrites;
  for (let frame = 0; frame < 120; frame++) f.syncScene.current();
  assert.equal(
    f.radarWrites,
    cameraWrites,
    "unchanged frames do not rewrite the camera",
  );
  for (const [section, stage, hash] of [
    ["contact", "contact", "#contacto"],
    ["hero", "hero", ""],
    ["about", "about", "#sobre-mi"],
    ["projects", "projects", "#proyectos"],
    ["stack", "stack", "#stack"],
  ]) {
    f.menuOpen.current = true;
    f.menuGate.current(true);
    f.menuNavigate.current(section);
    const animation = f.menuRuns.at(-1);
    animation.pause().seek(240, false);
    assert.equal(f.surface.current.style.opacity, "0");
    assert.equal(f.container.dataset.sceneTarget, stage);
    f.menuOpen.current = false;
    f.menuGate.current(false);
    animation.seek(animation.duration, false);
    f.flush();
    assert.equal(f.container.dataset.sceneStage, stage);
    assert.equal(f.window.location.hash, hash);
    assert.equal(f.heroLayer.inert, stage !== "hero");
    assert.equal(f.surface.current.style.opacity, "1");
    assert.equal(f.surface.current.style.transform, "none");
    assert.equal(
      f.environmentState.stack,
      ["stack", "about", "contact"].includes(stage) ? 1 : 0,
    );
    assert.equal(
      f.environmentState.about,
      ["about", "contact"].includes(stage) ? 1 : 0,
    );
    assert.equal(f.options.isBlocked(), false);
  }
  assert.equal(f.resetCalls, 6);
  f.detailIsOpen.current = true;
  f.menuNavigate.current("about");
  const animation = f.menuRuns.at(-1);
  animation.pause().seek(animation.duration, false);
  f.flush();
  assert.equal(f.detailIsOpen.current, false);
  assert.equal(f.container.dataset.sceneStage, "about");
});

test("focused projects close before leaving the atlas and cannot skip into Stack", (t) => {
  const f = setup(t, "#proyectos");
  f.showcaseState.selected = true;
  f.options.onStep(1);
  assert.equal(f.container.dataset.sceneStage, "projects");
  f.options.onStep(-1);
  assert.equal(f.container.dataset.sceneStage, "projects");
  assert.equal(f.showcaseState.closeCalls, 1);
  f.options.onStep(-1);
  assert.equal(f.container.dataset.sceneTarget, "hero");
});

for (const [hash, clock] of [
  ["", "hero"],
  ["#proyectos", "stack"],
  ["#stack", "about"],
  ["#sobre-mi", "contact"],
])
  test(`interrupted ${clock} cleanup restores natural flow and releases clocks`, (t) => {
    const f = setup(t, hash);
    f.options.onStep(1);
    f.complete(clock, 0.6);
    f.cleanup();
    assert.equal(f.environmentState.destroyed, 1);
    assert.equal(f.container.dataset.scrollStory, undefined);
    assert.equal(f.heroLayer.inert, false, "cleanup restores the natural Hero");
    assert.equal(f.stackLayer.inert, false);
    assert.equal(f.aboutLayer.inert, false);
    assert.equal(f.contactLayer.inert, false);
    assert.equal(f.projectLayer.style.visibility, "");
    assert.equal(f.projectLayer.style.opacity, undefined);
    assert.equal(f.aboutLayer.getAttribute("style"), null);
    assert.equal(f.contactLayer.getAttribute("style"), null);
    assert.equal(f.showcaseState.active, true);
    assert.equal(f.showcaseState.interactive, true);
    assert.equal(f.radarState.active, true);
    assert.equal(f.radarState.view.tilt, 0);
    assert.equal(f.menuNavigate.current, null);
    assert.equal(f.waveState.terrain, 0);
    assert.equal(f.portrait.getAttribute("style"), null);
    for (const animation of f.clockRuns)
      assert.equal(animation.cancelled, true);
  });

for (const time of [80, 400])
  test(`menu cleanup at ${time}ms restores its surface`, (t) => {
    const f = setup(t, "#stack");
    f.menuNavigate.current("contact");
    f.menuRuns.at(-1).pause().seek(time, false);
    f.cleanup();
    assert.equal(f.surface.current.getAttribute("style"), null);
    assert.equal(f.environmentState.destroyed, 1);
    assert.equal(f.menuNavigate.current, null);
    assert.equal(f.menuRuns.at(-1).cancelled, true);
  });
