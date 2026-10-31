// Uses the real Anime.js timelines and DOM geometry stand-ins, not browser pixels.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const anime = require("animejs");

function load(relativePath, dependencies = {}) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loadedModule = { exports: {} };
  // Anime.js identifies plain objects by constructor. Keep animation parameters
  // in its realm rather than passing cross-realm objects from vm.runInNewContext.
  new Function("exports", "require", "module", compiled)(
    loadedModule.exports,
    (name) => {
      assert.ok(
        Object.hasOwn(dependencies, name),
        `Unexpected import: ${name}`,
      );
      return dependencies[name];
    },
    loadedModule,
  );
  return loadedModule.exports;
}

const contact = load("src/lib/contact-transition.ts");
const radarTechnologies = load("src/lib/radar-technologies.ts");
const { createEnvironmentTransition } = load(
  "src/components/animations/environment-transition.ts",
  {
    animejs: anime,
    "@/lib/contact-transition": contact,
    "@/lib/radar-technologies": radarTechnologies,
  },
);

class Style {
  values = new Map();
  reads = 0;
  writes = 0;
  getPropertyValue(property) {
    this.reads++;
    return this.values.get(property)?.value ?? "";
  }
  getPropertyPriority(property) {
    this.reads++;
    return this.values.get(property)?.priority ?? "";
  }
  setProperty(property, value, priority = "") {
    this.writes++;
    this.values.set(property, { value, priority });
  }
  removeProperty(property) {
    this.writes++;
    this.values.delete(property);
  }
}

function fixture() {
  const size = { width: 1280, height: 800 };
  const scroll = { top: 0 };
  const measuredParents = [];
  let reads = 0;
  class Element {
    style = new Style();
    children = new Map();
    parent = null;
    constructor(
      box = () => ({ left: 0, top: 0, width: size.width, height: size.height }),
    ) {
      this.box = box;
    }
    get clientWidth() {
      return size.width;
    }
    get clientHeight() {
      return size.height;
    }
    querySelectorAll(selector) {
      return this.children.get(selector) ?? [];
    }
    querySelector(selector) {
      return this.children.get(selector)?.[0] ?? null;
    }
    getBoundingClientRect() {
      reads++;
      const box = this.box();
      const transform = this.style.getPropertyValue("transform");
      const translation = /translate3d\(([-\d.]+)px,([-\d.]+)px,/.exec(
        transform,
      );
      let left = box.left + Number(translation?.[1] ?? 0);
      let top = box.top + Number(translation?.[2] ?? 0);
      let width = box.width;
      let height = box.height;
      if (this.parent) {
        const parentTransform = this.parent.style.getPropertyValue("transform");
        measuredParents.push(parentTransform);
        const parentScale = Number(
          /scale\(([-\d.]+)\)/.exec(parentTransform)?.[1] ?? 1,
        );
        const parentTranslation =
          /translate3d\(([-\d.]+)(?:px)?,([-\d.]+)(?:px)?,/.exec(
            parentTransform,
          );
        left =
          size.width / 2 +
          (left - size.width / 2) * parentScale +
          Number(parentTranslation?.[1] ?? 0);
        top =
          size.height / 2 +
          (top - size.height / 2) * parentScale +
          Number(parentTranslation?.[2] ?? 0);
        width *= parentScale;
        height *= parentScale;
      }
      return {
        ...box,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
      };
    }
  }
  const viewport = new Element();
  const projectLayer = new Element();
  const stackLayer = new Element();
  const personalLayer = new Element();
  const aboutLayer = new Element();
  const world = new Element();
  const technologies = Array.from(
    { length: 12 },
    (_, index) =>
      new Element(() => ({
        left: size.width * (0.4 + (index % 3) * 0.16),
        top: 110 + Math.floor(index / 3) * 170 - scroll.top,
        width: size.width < 500 ? 72 : 110,
        height: 80,
      })),
  );
  const headings = [new Element(), new Element(), new Element()];
  const copy = [new Element(), new Element()];
  const labels = technologies.map((element) => {
    const label = new Element();
    element.parent = stackLayer;
    element.children.set(":scope > span:not([aria-hidden])", [label]);
    return label;
  });
  stackLayer.children.set("[data-technology]", technologies);
  stackLayer.children.set(
    "[data-stack-heading], [data-stack-group] h3, [data-about-open]",
    headings,
  );
  aboutLayer.children.set("[data-about-copy]", copy);
  const elements = {
    viewport,
    projectLayer,
    stackLayer,
    personalLayer,
    aboutLayer,
    world,
  };
  const all = [
    ...Object.values(elements),
    ...technologies,
    ...labels,
    ...headings,
    ...copy,
  ];
  return {
    ...elements,
    technologies,
    labels,
    headings,
    copy,
    all,
    size,
    scroll,
    measuredParents,
    reads: () => reads,
    styleAccesses: () =>
      all.reduce(
        (total, element) => ({
          reads: total.reads + element.style.reads,
          writes: total.writes + element.style.writes,
        }),
        { reads: 0, writes: 0 },
      ),
    create: () => createEnvironmentTransition(elements),
    sample: () => all.map((element) => Array.from(element.style.values)),
  };
}

test("environment endpoints preserve readable scenes and finish at the radar horizon", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  assert.equal(f.projectLayer.style.getPropertyValue("transform"), "none");
  assert.equal(f.projectLayer.style.getPropertyValue("opacity"), "1");
  assert.equal(f.world.style.getPropertyValue("opacity"), "0");

  effect.render(1, 0);
  assert.equal(f.projectLayer.style.getPropertyValue("opacity"), "0");
  assert.equal(f.world.style.getPropertyValue("opacity"), "1");
  for (const element of [...f.technologies, ...f.headings]) {
    assert.equal(element.style.getPropertyValue("transform"), "none");
    assert.equal(element.style.getPropertyValue("opacity"), "1");
  }

  effect.render(1, 1);
  assert.equal(f.world.style.getPropertyValue("opacity"), "0");
  assert.equal(f.personalLayer.style.getPropertyValue("opacity"), "1");
  assert.deepEqual(effect.getRadarView(), contact.HORIZON_VIEW);
  for (const element of f.copy) {
    assert.equal(element.style.getPropertyValue("transform"), "none");
    assert.equal(element.style.getPropertyValue("opacity"), "1");
  }
  for (const element of f.technologies)
    assert.equal(element.style.getPropertyValue("opacity"), "0");
});

test("project marks fade while the terrain gains Sangria before the Stack group enters", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  effect.render(0.25, 0);
  assert.equal(f.projectLayer.style.getPropertyValue("transform"), "none");
  const projectOpacity = Number(
    f.projectLayer.style.getPropertyValue("opacity"),
  );
  const earlyInk = Number(f.world.style.getPropertyValue("opacity"));
  assert.ok(projectOpacity > 0 && projectOpacity < 1);
  assert.ok(earlyInk > 0 && earlyInk < 1);
  assert.equal(f.stackLayer.style.getPropertyValue("opacity"), "0");

  effect.render(0.42, 0);
  assert.equal(f.projectLayer.style.getPropertyValue("opacity"), "0");
  assert.ok(
    Math.abs(Number(f.world.style.getPropertyValue("opacity")) - 0.5) < 1e-8,
  );
  assert.equal(f.stackLayer.style.getPropertyValue("opacity"), "0");
  effect.render(0.8, 0);
  assert.equal(f.world.style.getPropertyValue("opacity"), "1");
  const groupOpacity = Number(f.stackLayer.style.getPropertyValue("opacity"));
  assert.ok(groupOpacity > 0 && groupOpacity < 1);
  for (const element of [...f.technologies, ...f.headings]) {
    assert.equal(element.style.getPropertyValue("transform"), "none");
    assert.equal(element.style.getPropertyValue("opacity"), "1");
  }
  for (const label of f.labels)
    assert.equal(
      label.style.getPropertyValue("opacity"),
      "1",
      "names enter with their icon group",
    );

  const before = f.sample();
  f.measuredParents.length = 0;
  effect.measure();
  assert.equal(f.measuredParents.length, f.technologies.length);
  assert.ok(
    f.measuredParents.every((transform) => transform === "none"),
    "measurement removes the Stack parent's translation",
  );
  assert.deepEqual(
    f.sample(),
    before,
    "measurement restores the same partially revealed frame",
  );
  effect.render(1, 0);
  assert.equal(f.stackLayer.style.getPropertyValue("transform"), "none");
  assert.equal(f.stackLayer.style.getPropertyValue("opacity"), "1");
});

test("About shares one smooth camera angle with a floor that covers the viewport width", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  let lastTilt = 0;
  for (const progress of [0.0001, 0.1, 0.25, 0.5, 0.75, 0.9999, 1]) {
    effect.render(1, progress);
    const view = effect.getRadarView();
    const transform = f.world.style.getPropertyValue("transform");
    const angle = Number(/rotateX\(([-\d.]+)deg\)/.exec(transform)?.[1] ?? 0);
    assert.equal(angle, view.tilt);
    assert.ok(view.tilt >= lastTilt && view.tilt <= 64);
    lastTilt = view.tilt;
    const scaleX = Number(/scaleX\(([-\d.]+)\)/.exec(transform)?.[1] ?? 1);
    const perspective = Math.max(900, f.size.height * 2.8);
    const farEdgeScale =
      perspective /
      (perspective + f.size.height * 0.94 * Math.sin((angle * Math.PI) / 180));
    assert.ok(
      scaleX * farEdgeScale >= 1 - 1e-9,
      "Pitching the floor must not expose side wedges",
    );
  }
  effect.render(1, 0.0001);
  assert.ok(
    effect.getRadarView().tilt < 0.00001,
    "The camera must start with near-zero angular velocity",
  );
  effect.render(1, 0.9999);
  assert.ok(
    64 - effect.getRadarView().tilt < 0.00001,
    "The camera must land with near-zero angular velocity",
  );
  assert.equal(f.stackLayer.style.getPropertyValue("transform"), "none");
});
test("both Anime.js scenes produce identical frames when seeking forward and backward", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  for (const [stack, about] of [
    [0.5, 0],
    [1, 0.5],
  ]) {
    effect.render(stack, about);
    const forward = f.sample();
    const camera = effect.getRadarView();
    effect.render(1, 1);
    effect.render(stack, about);
    assert.deepEqual(f.sample(), forward);
    assert.deepEqual(effect.getRadarView(), camera);
    effect.render(0, 0);
    effect.render(stack, about);
    assert.deepEqual(f.sample(), forward);
  }
  const reads = f.reads();
  effect.render(1, 0.6);
  effect.render(1, 0.7);
  assert.equal(f.reads(), reads, "Rendering must not read layout per frame");
});

test("mid-transition measurement updates geometry without changing scroll or camera time", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  effect.render(1, 0.5);
  const camera = effect.getRadarView();
  const desktop = f.sample();
  effect.measure();
  assert.deepEqual(
    f.sample(),
    desktop,
    "Unchanged measurement must not cause a jump",
  );

  f.size.width = 390;
  f.size.height = 844;
  f.scroll.top = 260;
  effect.measure();
  const mobile = f.sample();
  assert.notDeepEqual(mobile, desktop, "Geometry must respond to the viewport");
  assert.equal(f.scroll.top, 260, "Inner reading position must be preserved");
  assert.deepEqual(effect.getRadarView(), camera);
  effect.render(1, 1);
  effect.render(1, 0.5);
  assert.deepEqual(
    f.sample(),
    mobile,
    "Reverse must reuse the measured mobile geometry",
  );
});

test("unchanged scenes avoid all style access and measurement invalidates the cached frame", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  for (const [stack, about] of [
    [0, 0],
    [0.5, 0],
    [1, 0.5],
    [1, 1],
  ]) {
    effect.render(stack, about);
    const accesses = f.styleAccesses();
    const measurements = f.reads();
    for (let frame = 0; frame < 120; frame++) effect.render(stack, about);
    assert.deepEqual(
      f.styleAccesses(),
      accesses,
      "Repeated frames must not read or write styles",
    );
    assert.equal(
      f.reads(),
      measurements,
      "Repeated frames must not measure layout",
    );
  }
  effect.render(1, 0.5);
  const before = f.sample();
  const accesses = f.styleAccesses();
  f.size.width = 390;
  effect.measure();
  const measured = f.sample();
  assert.notDeepEqual(
    measured,
    before,
    "Measurement must render new geometry at the same progress",
  );
  assert.ok(f.styleAccesses().reads > accesses.reads);
  assert.ok(f.styleAccesses().writes > accesses.writes);
  const after = f.styleAccesses();
  for (let frame = 0; frame < 120; frame++) effect.render(1, 0.5);
  assert.deepEqual(
    f.styleAccesses(),
    after,
    "The freshly measured frame must be cached again",
  );
  assert.deepEqual(f.sample(), measured);
});

test("cleanup restores only owned properties, including previous inline priorities", () => {
  const f = fixture();
  f.projectLayer.style.setProperty("transform", "translateX(2px)", "important");
  f.projectLayer.style.setProperty("opacity", "0.92");
  f.world.style.setProperty("transform-origin", "20% 80%", "important");
  f.technologies[0].style.setProperty("will-change", "contents");
  f.copy[0].style.setProperty("opacity", "0.8", "important");
  const previous = f.sample();
  const effect = f.create();
  effect.render(1, 0.58);
  f.world.style.setProperty("color", "red");
  effect.destroy();
  assert.equal(f.world.style.getPropertyValue("color"), "red");
  f.world.style.removeProperty("color");
  assert.deepEqual(f.sample(), previous);
  effect.destroy();
  effect.render(1, 1);
  effect.measure();
  assert.deepEqual(
    f.sample(),
    previous,
    "Disposed renderers must remain inert",
  );
});

test("departing technologies reach the exact projected positions used by the persistent radar icons", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  // Arrival precedes the .45 handoff: no second displaced icon is visible.
  effect.render(1, 0.449);
  const camera = effect.getRadarView();
  f.technologies.forEach((element, index) => {
    const expected = radarTechnologies.projectRadarTechnology(
      radarTechnologies.getRadarTechnologyPoint(index, f.technologies.length),
      camera,
      f.size.width,
      f.size.height,
    );
    const box = element.getBoundingClientRect();
    assert.ok(
      !element.style.getPropertyValue("transform").includes("rotate"),
      "SVGs must remain screen-facing like the persistent radar billboards",
    );
    assert.ok(Math.abs(box.left + box.width / 2 - expected.x) < 1e-8);
    assert.ok(Math.abs(box.top + box.height / 2 - expected.y) < 1e-8);
    assert.ok(Number(element.style.getPropertyValue("opacity")) > 0);
  });
});

test("changing About frames read no inline styles and stop promoting hidden icons", (t) => {
  const f = fixture();
  const effect = f.create();
  t.after(() => effect.destroy());
  effect.render(1, 0);
  const reads = f.styleAccesses().reads;
  for (const progress of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 0.95])
    effect.render(1, progress);
  assert.equal(
    f.styleAccesses().reads,
    reads,
    "Owned styles are compared in memory, not read each frame",
  );
  for (const element of f.technologies) {
    assert.equal(element.style.getPropertyValue("opacity"), "0");
    assert.equal(element.style.getPropertyValue("transform"), "none");
    assert.equal(element.style.getPropertyValue("will-change"), "auto");
  }
});
