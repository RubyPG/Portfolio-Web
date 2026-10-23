const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const app = path.resolve(__dirname, "..");
const ts = require(path.join(app, "node_modules/typescript"));
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(app, "src/lib/scene-input.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
class ElementStub {
  closest() {
    return null;
  }
  getBoundingClientRect() {
    return { top: 0, bottom: 800 };
  }
}
const win = new EventTarget();
win.innerHeight = 800;
const element = new ElementStub();
const doc = { body: {}, documentElement: {} };
let now = 1000;
const moduleStub = { exports: {} };
vm.runInNewContext(compiled, {
  exports: moduleStub.exports,
  module: moduleStub,
  window: win,
  document: doc,
  Element: ElementStub,
  performance: { now: () => now },
});
let stage = 3,
  position = 100,
  bottom = 1000,
  busy = false;
const steps = [];
// Use the real routing callback from LandingStory, not a parallel stage model.
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
let routing;
let bottomCheck;
function inspect(node) {
  if (
    ts.isPropertyAssignment(node) &&
    node.name.getText(source) === "handlesDirection"
  )
    routing = node.initializer.getText(source);
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "atBottom"
  )
    bottomCheck = node.initializer.getText(source);
  ts.forEachChild(node, inspect);
}
inspect(source);
assert.ok(routing && bottomCheck);
const scrollport = {
  get scrollTop() {
    return position;
  },
  get scrollHeight() {
    return bottom + 800;
  },
  clientHeight: 800,
};
const routeContext = {
  get settled() {
    return stage;
  },
  stackContent: scrollport,
  aboutContent: scrollport,
  contactContent: scrollport,
  showcase: { current: { hasSelection: () => false } },
};
vm.createContext(routeContext);
vm.runInContext(
  ts.transpileModule(
    `const atBottom = ${bottomCheck}; this.handlesDirection = ${routing}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  routeContext,
);
const controller = moduleStub.exports.createSceneInput({
  element,
  isBlocked: () => busy,
  isDetailOpen: () => false,
  handlesDirection: routeContext.handlesDirection,
  onStep: (direction) => {
    steps.push([stage, direction]);
    stage += direction;
    busy = true;
  },
});
function dispatch(type, properties = {}) {
  const event = new Event(type, { cancelable: true });
  const { target, ...eventProperties } = properties;
  Object.assign(event, eventProperties);
  if (target) Object.defineProperty(event, "target", { value: target });
  event.composedPath = () => (target ? [target, element] : [element]);
  win.dispatchEvent(event);
  return event;
}
function wheel(deltaY, gap = 16) {
  now += gap;
  return dispatch("wheel", { deltaY, deltaX: 0, deltaMode: 0 });
}
assert.equal(wheel(70, 300).defaultPrevented, false, "native stack scroll");
position = bottom;
assert.equal(wheel(70).defaultPrevented, true, "tail at bottom is consumed");
assert.equal(steps.length, 0, "same gesture cannot open next section");
wheel(70, 300);
assert.deepEqual(steps, [[3, 1]], "fresh gesture opens About");
wheel(3000);
assert.equal(steps.length, 1, "fast scrolling cannot chain a transition");
busy = false;
position = 0;
wheel(-70);
assert.equal(steps.length, 1, "tail cannot reverse just-completed transition");
wheel(-70, 300);
assert.deepEqual(
  steps,
  [
    [3, 1],
    [4, -1],
  ],
  "fresh gesture reverses About",
);
busy = false;
position = bottom;
dispatch("keydown", { key: "PageDown", repeat: false });
assert.equal(stage, 4, "keyboard can open About");
busy = false;
position = 0;
dispatch("keydown", { key: "PageUp", repeat: true });
assert.equal(stage, 4, "held keyboard does not chain");
dispatch("keydown", { key: "PageUp", repeat: false });
assert.equal(stage, 3, "fresh keyboard can reverse");
busy = false;
position = 100;
dispatch("touchstart", {
  touches: [{ identifier: 1, clientX: 100, clientY: 300 }],
});
assert.equal(
  dispatch("touchmove", {
    touches: [{ identifier: 1, clientX: 100, clientY: 240 }],
  }).defaultPrevented,
  false,
);
position = bottom;
assert.equal(
  dispatch("touchmove", {
    touches: [{ identifier: 1, clientX: 100, clientY: 150 }],
  }).defaultPrevented,
  true,
);
assert.equal(stage, 3, "touch route is not promoted at bottom");
dispatch("touchend");
dispatch("touchstart", {
  touches: [{ identifier: 2, clientX: 100, clientY: 300 }],
});
dispatch("touchmove", {
  touches: [{ identifier: 2, clientX: 100, clientY: 240 }],
});
assert.equal(stage, 4, "fresh touch opens About");
dispatch("touchend");
busy = false;
position = 100;
assert.equal(
  wheel(70, 300).defaultPrevented,
  false,
  "About retains native scroll before its bottom",
);
position = bottom;
assert.equal(
  wheel(70).defaultPrevented,
  true,
  "About tail is consumed at its bottom",
);
assert.equal(stage, 4, "same gesture cannot open Contact");
wheel(7000, 300);
assert.equal(stage, 5, "fresh gesture opens Contact");
const contactStepCount = steps.length;
wheel(7000);
busy = false;
position = 0;
wheel(-7000);
assert.equal(
  steps.length,
  contactStepCount,
  "fast tail cannot skip or reverse the contact transition",
);
wheel(-70, 300);
assert.equal(stage, 4, "fresh gesture reverses Contact");
busy = false;
position = bottom;
dispatch("keydown", { key: "PageDown", repeat: false });
assert.equal(stage, 5, "keyboard opens Contact");
busy = false;
position = 100;
assert.equal(
  dispatch("keydown", { key: "PageUp", repeat: false }).defaultPrevented,
  false,
  "Contact scrolls natively before its top",
);
position = 0;
dispatch("keydown", { key: "PageUp", repeat: true });
assert.equal(stage, 5, "held key cannot chain a reverse");
dispatch("keydown", { key: "PageUp", repeat: false });
assert.equal(stage, 4, "fresh keyboard reverses Contact");
busy = false;
position = bottom;
dispatch("touchstart", {
  touches: [{ identifier: 3, clientX: 100, clientY: 300 }],
});
dispatch("touchmove", {
  touches: [{ identifier: 3, clientX: 100, clientY: 240 }],
});
assert.equal(stage, 5, "fresh touch opens Contact");
dispatch("touchend");
busy = false;
position = 0;
dispatch("touchstart", {
  touches: [{ identifier: 4, clientX: 100, clientY: 200 }],
});
dispatch("touchmove", {
  touches: [{ identifier: 4, clientX: 100, clientY: 260 }],
});
assert.equal(stage, 4, "fresh touch reverses Contact");
dispatch("touchend");
// Editing a message must not rotate Contact away when its parent is at the top.
const textareaTarget = new ElementStub();
textareaTarget.closest = (selector) =>
  selector.includes("textarea") ? textareaTarget : null;
stage = 5;
position = 0;
busy = false;
const beforeEditing = steps.length;
const fieldWheel = (gap = 300) => {
  now += gap;
  return dispatch("wheel", {
    target: textareaTarget,
    deltaY: -70,
    deltaX: 0,
    deltaMode: 0,
  });
};
assert.equal(
  fieldWheel().defaultPrevented,
  false,
  "textarea owns wheel scroll",
);
assert.equal(
  wheel(-70).defaultPrevented,
  false,
  "wheel ownership survives leaving the textarea during the same gesture",
);
for (const key of ["ArrowUp", "PageUp", "Home", "End", " "])
  assert.equal(
    dispatch("keydown", { target: textareaTarget, key, repeat: false })
      .defaultPrevented,
    false,
    `textarea retains ${key} editing`,
  );
assert.equal(steps.length, beforeEditing, "editing does not leave Contact");
wheel(-70, 300);
assert.equal(
  stage,
  4,
  "a fresh gesture outside the field still reverses Contact",
);
stage = 5;
busy = false;
dispatch("touchstart", {
  target: textareaTarget,
  touches: [{ identifier: 6, clientX: 100, clientY: 200 }],
});
assert.equal(
  dispatch("touchmove", {
    target: textareaTarget,
    touches: [{ identifier: 6, clientX: 100, clientY: 260 }],
  }).defaultPrevented,
  false,
  "textarea owns touch scroll",
);
assert.equal(
  dispatch("touchmove", {
    touches: [{ identifier: 6, clientX: 100, clientY: 320 }],
  }).defaultPrevented,
  false,
  "touch ownership survives leaving the field until release",
);
assert.equal(stage, 5, "scrolling the message keeps Contact open");
dispatch("touchend");
// Native-field ownership must never bypass an in-flight scene transition.
busy = true;
assert.equal(
  fieldWheel().defaultPrevented,
  true,
  "busy scene blocks field wheel",
);
busy = false;
assert.equal(
  fieldWheel(16).defaultPrevented,
  true,
  "blocked field gesture stays consumed after the transition",
);
assert.equal(
  fieldWheel().defaultPrevented,
  false,
  "fresh field wheel is restored",
);
busy = true;
dispatch("touchstart", {
  target: textareaTarget,
  touches: [{ identifier: 7, clientX: 100, clientY: 200 }],
});
assert.equal(
  dispatch("touchmove", {
    target: textareaTarget,
    touches: [{ identifier: 7, clientX: 100, clientY: 260 }],
  }).defaultPrevented,
  true,
  "busy scene blocks field touch",
);
busy = false;
assert.equal(
  dispatch("touchmove", {
    target: textareaTarget,
    touches: [{ identifier: 7, clientX: 100, clientY: 320 }],
  }).defaultPrevented,
  true,
  "blocked field touch stays consumed after the transition",
);
dispatch("touchend");
// The menu owns its keyboard and scroll even though it sits inside the story.
const menuTarget = new ElementStub();
menuTarget.closest = (selector) =>
  selector === "[data-site-menu]" ? menuTarget : null;
const beforeMenu = steps.length;
busy = false;
position = bottom;
for (const [type, properties] of [
  ["wheel", { deltaY: 7000, deltaX: 0, deltaMode: 0 }],
  ["keydown", { key: "PageDown", repeat: false }],
  ["touchstart", { touches: [{ identifier: 5, clientX: 100, clientY: 300 }] }],
  ["touchmove", { touches: [{ identifier: 5, clientX: 100, clientY: 100 }] }],
]) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, properties);
  Object.defineProperty(event, "target", { value: menuTarget });
  event.composedPath = () => [menuTarget, element];
  win.dispatchEvent(event);
  assert.equal(
    event.defaultPrevented,
    false,
    "scene leaves menu input untouched",
  );
}
assert.equal(
  steps.length,
  beforeMenu,
  "menu scroll and keys never advance the scene",
);
controller.destroy();
console.log(
  "PASS: real scene routing for Stack/About/Contact with synthetic wheel, inertia, keyboard and touch; no browser or visual assertions.",
);
