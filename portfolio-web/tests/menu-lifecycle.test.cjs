// Actual component controller + GSAP, with plain-object DOM stand-ins.
// Does not render a browser or assert visual results.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const app = path.resolve(__dirname, "..");
const ts = require(path.join(app, "node_modules/typescript"));
const { gsap } = require(path.join(app, "node_modules/gsap/dist/gsap"));
const source = ts.createSourceFile(
  "StaggeredMenu.tsx",
  fs.readFileSync(
    path.join(app, "src/components/ui/StaggeredMenu.tsx"),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let callback, navigate;
function visit(node) {
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(source) === "useGSAP"
  )
    callback = node.arguments[0].getText(source);
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "navigate"
  )
    navigate = node.initializer.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(callback && navigate);
const compile = (text) =>
  ts.transpileModule(text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;

function fixture(reduced = false) {
  const timelines = [],
    frames = new Map(),
    calls = [],
    state = {};
  let nextFrame = 0;
  const document = { activeElement: null };
  class Element {
    constructor(name, parent) {
      Object.assign(this, {
        name,
        parent,
        xPercent: 0,
        yPercent: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        scrollTop: 0,
        inert: false,
        disabled: false,
        listeners: new Map(),
      });
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    }
    querySelectorAll(selector) {
      return selectors.get(selector) ?? [];
    }
    addEventListener(event, fn) {
      this.listeners.set(event, fn);
    }
    removeEventListener(event) {
      this.listeners.delete(event);
    }
    contains(target) {
      for (let n = target; n; n = n.parent) if (n === this) return true;
      return false;
    }
    closest(selector) {
      if (selector === "[inert]")
        return this.inert ? this : (this.parent?.closest(selector) ?? null);
      return null;
    }
    hasAttribute(name) {
      return name === "disabled" && this.disabled;
    }
    focus() {
      document.activeElement = this;
    }
  }
  const scope = new Element("root"),
    surface = new Element("surface", scope),
    trigger = new Element("trigger", scope);
  const layers = [new Element("jade", scope), new Element("sangria", scope)];
  const links = Array.from(
    { length: 7 },
    (_, i) => new Element("link" + i, surface),
  );
  const labels = links
    .slice(0, 5)
    .map((link, i) => new Element("label" + i, link));
  const numbers = links
    .slice(0, 5)
    .map((link, i) => new Element("number" + i, link));
  const socials = links.slice(5);
  const roll = new Element("roll", trigger),
    horizontal = new Element("horizontal", trigger),
    vertical = new Element("vertical", trigger),
    backdrop = new Element("backdrop", scope);
  const selectors = new Map([
    ["[data-menu-layer]", layers],
    ["[data-menu-link]", links.slice(0, 5)],
    ["[data-menu-label]", labels],
    ["[data-menu-number]", numbers],
    ["[data-menu-social]", socials],
    ["[data-menu-toggle-text]", [roll]],
    ["[data-menu-plus-h]", [horizontal]],
    ["[data-menu-plus-v]", [vertical]],
    ["[data-menu-backdrop]", [backdrop]],
    ["a[href],button:not(:disabled)", links],
  ]);
  const motion = {
    matches: reduced,
    listeners: new Map(),
    addEventListener(event, fn) {
      this.listeners.set(event, fn);
    },
    removeEventListener(event) {
      this.listeners.delete(event);
    },
  };
  const controls = { current: null },
    phase = { current: "closed" },
    navigating = { current: false };
  const latest = {
    current: {
      ready: true,
      disabled: false,
      onOpenChange(open) {
        calls.push(open);
      },
    },
  };
  let resolveNavigation;
  const navigationDone = new Promise((resolve) => {
    resolveNavigation = resolve;
  });
  const context = {
    gsap: {
      ...gsap,
      utils: { ...gsap.utils, toArray: (selector) => selectors.get(selector) },
      timeline(options) {
        const tl = gsap.timeline(options);
        timelines.push(tl);
        return tl;
      },
    },
    root: { current: scope },
    panel: { current: surface },
    button: { current: trigger },
    controls,
    phase,
    navigating,
    latest,
    setPresent(value) {
      state.present = value;
    },
    setOpen(value) {
      state.open = value;
      surface.inert = !value;
    },
    window: { matchMedia: () => motion },
    document,
    requestAnimationFrame(fn) {
      frames.set(++nextFrame, fn);
      return nextFrame;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    disabled: false,
    onNavigate(section) {
      calls.push(section);
      return navigationDone;
    },
  };
  const cleanup = vm.runInNewContext(
    compile(`(${callback})(null, fn => fn)`),
    context,
  );
  const navigateTo = vm.runInNewContext(compile(`(${navigate})`), context);
  const frame = () => {
    const queue = [...frames.values()];
    frames.clear();
    queue.forEach((fn) => fn());
  };
  const finish = () => {
    timelines.at(-1).progress(1);
    frame();
  };
  const event = (type, props = {}) => {
    const e = {
      type,
      target: backdrop,
      key: "",
      shiftKey: false,
      prevented: false,
      stopped: false,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
      ...props,
    };
    scope.listeners.get(type)?.(e);
    return e;
  };
  const dispose = () => {
    cleanup();
    timelines.forEach((tl) => tl.kill());
  };
  return {
    controls,
    phase,
    navigating,
    latest,
    state,
    calls,
    document,
    scope,
    surface,
    trigger,
    links,
    layers,
    labels,
    numbers,
    roll,
    horizontal,
    vertical,
    backdrop,
    motion,
    timelines,
    frames,
    navigateTo,
    resolveNavigation,
    frame,
    finish,
    event,
    dispose,
  };
}

async function run() {
  {
    const f = fixture();
    assert.equal(f.surface.xPercent, 100);
    f.controls.current.open();
    assert.equal(f.phase.current, "opening");
    assert.deepEqual(f.calls, [true]);
    const opening = f.timelines.at(-1);
    opening.progress(0.2);
    const close = f.controls.current.close(false);
    assert.equal(
      f.controls.current.close(true),
      close,
      "Repeated close shares one promise",
    );
    assert.equal(f.phase.current, "closing");
    assert.deepEqual(
      f.calls,
      [true],
      "Background remains blocked until exit completes",
    );
    assert.equal(
      opening.parent,
      null,
      "Opening timeline killed when close interrupts",
    );
    f.finish();
    await close;
    assert.equal(f.phase.current, "closed");
    assert.equal(f.surface.xPercent, 100);
    assert.equal(f.state.present, false);
    assert.equal(
      f.document.activeElement,
      null,
      "Navigation close never steals focus",
    );
    assert.deepEqual(f.calls, [true, false]);
    f.controls.current.open();
    f.finish();
    assert.equal(f.document.activeElement, f.links[0]);
    assert.equal(f.surface.xPercent, 0);
    assert.equal(f.roll.yPercent, -75);
    assert.equal(f.horizontal.rotation, 45);
    assert.equal(f.vertical.rotation, -45);
    f.trigger.focus();
    assert.equal(
      f.event("keydown", { key: "Tab", shiftKey: true }).prevented,
      true,
    );
    assert.equal(f.document.activeElement, f.links.at(-1));
    assert.equal(f.event("keydown", { key: "Tab" }).prevented, true);
    assert.equal(f.document.activeElement, f.trigger);
    assert.equal(f.event("wheel").prevented, true);
    assert.equal(f.event("touchmove").prevented, true);
    assert.equal(
      f.event("wheel", { target: f.links[0] }).prevented,
      false,
      "Panel may scroll independently",
    );
    f.links[2].focus();
    const escape = f.event("keydown", { key: "Escape" });
    assert.equal(escape.stopped, true);
    assert.equal(
      f.document.activeElement,
      f.links[2],
      "Focus waits until exit finishes",
    );
    f.finish();
    assert.equal(f.document.activeElement, f.trigger);
    f.latest.current.disabled = true;
    f.controls.current.open();
    assert.equal(f.phase.current, "closed");
    f.latest.current.disabled = false;
    f.latest.current.ready = false;
    f.controls.current.open();
    assert.equal(f.phase.current, "closed");
    f.dispose();
    assert.equal(f.scope.listeners.size, 0);
    assert.equal(f.motion.listeners.size, 0);
    assert.equal(f.controls.current, null);
  }
  {
    const f = fixture(true);
    f.controls.current.open();
    assert.equal(f.phase.current, "open");
    f.frame();
    assert.equal(f.document.activeElement, f.links[0]);
    await f.controls.current.close(true);
    assert.equal(f.phase.current, "closed");
    assert.equal(f.document.activeElement, f.trigger);
    assert.deepEqual(f.calls, [true, false]);
    f.dispose();
  }
  {
    const f = fixture();
    f.controls.current.open();
    f.motion.matches = true;
    f.motion.listeners.get("change")();
    assert.equal(f.phase.current, "open");
    f.frame();
    f.motion.matches = false;
    let prevented = false;
    const pending = f.navigateTo(
      {
        button: 0,
        preventDefault() {
          prevented = true;
        },
      },
      "contact",
    );
    assert.equal(prevented, true);
    assert.equal(f.navigating.current, true);
    assert.deepEqual(
      f.calls,
      [true, "contact"],
      "Scene starts while the menu closes",
    );
    f.finish();
    assert.equal(f.navigating.current, true, "Waits for scene navigation too");
    assert.equal(
      f.document.activeElement,
      f.links[0],
      "No toggle focus on navigation",
    );
    f.resolveNavigation();
    await pending;
    assert.equal(f.navigating.current, false);
    assert.deepEqual(f.calls, [true, "contact", false]);
    f.controls.current.open();
    f.finish();
    const close = f.controls.current.close(false);
    f.dispose();
    await close;
    assert.equal(f.frames.size, 0);
  }
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  console.log(
    "PASS menu lifecycle: interruption, reopening, reduced motion, focus trap, backdrop scroll, concurrent navigation, cleanup",
  );
}
run().catch((error) => {
  console.error(error);
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  process.exitCode = 1;
});
