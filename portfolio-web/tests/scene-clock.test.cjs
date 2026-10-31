// Real Anime.js interpolation, with explicit seeks instead of wall-clock sleeps.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const anime = require("animejs");

const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../src/lib/scene-clock.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function fixture(options = {}) {
  const animations = [];
  const updates = [];
  const completions = [];
  const loaded = { exports: {} };
  // Keep parameter objects in Anime.js's realm so it recognizes plain objects.
  new Function("exports", "require", "module", compiled)(
    loaded.exports,
    () => ({
      animate(...args) {
        const animation = anime.animate(...args);
        animations.push(animation);
        return animation;
      },
    }),
    loaded,
  );
  const clock = loaded.exports.createSceneClock({
    duration: 1000,
    onUpdate: (value) => updates.push(value),
    onComplete: () => completions.push("forward"),
    onReverseComplete: () => completions.push("reverse"),
    ...options,
  });
  return {
    clock,
    animations,
    updates,
    completions,
    tick(progress) {
      const animation = animations.at(-1);
      animation.pause().seek(animation.duration * progress, false);
    },
  };
}

test("seeks render exact progress, while muted placement invokes no callbacks", () => {
  const f = fixture();
  assert.equal(f.clock.progress(), 0);
  assert.equal(f.clock.progress(0.4), f.clock);
  assert.deepEqual(f.updates, [0.4]);
  f.clock.progress(1, true);
  assert.equal(f.clock.progress(), 1);
  assert.deepEqual(f.updates, [0.4]);
  assert.deepEqual(f.completions, []);
  f.clock.progress(0, false);
  assert.deepEqual(f.completions, ["reverse"]);
  f.clock.progress(0);
  assert.deepEqual(
    f.completions,
    ["reverse"],
    "same endpoint cannot complete twice",
  );
  f.clock.progress(2);
  assert.equal(f.clock.progress(), 1);
  assert.deepEqual(f.completions, ["reverse", "forward"]);
  f.clock.progress(NaN, true);
  assert.equal(f.clock.progress(), 0);
  f.clock.kill();
});

test("forward and reverse use remaining distance without jumping", () => {
  const f = fixture();
  f.clock.progress(0.25, true).play();
  assert.equal(f.animations.at(-1).duration, 750);
  assert.equal(f.clock.progress(), 0.25);
  f.tick(0.5);
  assert.equal(f.clock.progress(), 0.625);
  const cancelled = f.animations.at(-1);
  f.clock.reverse();
  assert.equal(cancelled.cancelled, true);
  assert.equal(f.animations.at(-1).duration, 625);
  assert.equal(f.clock.progress(), 0.625);
  f.tick(0.5);
  assert.equal(f.clock.progress(), 0.3125);
  f.tick(1);
  assert.equal(f.clock.progress(), 0);
  assert.deepEqual(f.completions, ["reverse"]);
  f.clock.play();
  f.tick(1);
  assert.equal(f.clock.progress(), 1);
  assert.deepEqual(f.completions, ["reverse", "forward"]);
  f.clock.play();
  assert.deepEqual(f.completions, ["reverse", "forward"]);
  f.clock.kill();
});

test("pause retains progress and resuming uses only the unfinished duration", () => {
  const f = fixture();
  f.clock.play();
  f.tick(0.3);
  assert.equal(f.clock.pause(), f.clock);
  assert.equal(f.clock.progress(), 0.3);
  assert.equal(f.animations.at(-1).cancelled, true);
  assert.deepEqual(f.completions, []);
  f.clock.play();
  assert.equal(f.animations.at(-1).duration, 700);
  f.tick(1);
  assert.deepEqual(f.completions, ["forward"]);
  f.clock.kill();
});

test("easing is supplied to real Anime.js interpolation", () => {
  const f = fixture({ ease: "inQuad" });
  f.clock.play();
  f.tick(0.5);
  assert.equal(f.clock.progress(), 0.25);
  assert.equal(f.updates.at(-1), 0.25);
  f.clock.kill();
});

test("seek and kill invalidate callbacks from the previous animation", () => {
  const f = fixture();
  f.clock.play();
  f.tick(0.4);
  const obsolete = f.animations.at(-1);
  f.clock.progress(0.6, true);
  obsolete.onComplete(obsolete);
  assert.equal(f.clock.progress(), 0.6);
  assert.deepEqual(f.completions, []);
  f.clock.reverse();
  f.tick(0.5);
  const killed = f.animations.at(-1);
  const last = f.clock.progress();
  const updates = f.updates.length;
  f.clock.kill();
  killed.onUpdate(killed);
  killed.onComplete(killed);
  f.clock.progress(1).play().reverse().pause();
  assert.equal(f.clock.progress(), last);
  assert.equal(f.updates.length, updates);
  assert.deepEqual(f.completions, []);
  assert.equal(killed.cancelled, true);
});

test("a render callback can kill a completing scene without a late completion", () => {
  let clock;
  let completions = 0;
  const f = fixture({
    onUpdate: (value) => {
      if (value === 1) clock.kill();
    },
    onComplete: () => completions++,
  });
  clock = f.clock;
  clock.play();
  f.tick(1);
  assert.equal(completions, 0);
});

test("zero-duration scenes finish synchronously and invalid durations fail early", () => {
  const f = fixture({ duration: 0 });
  f.clock.play().reverse();
  assert.deepEqual(f.completions, ["forward", "reverse"]);
  assert.deepEqual(f.updates, [1, 0]);
  assert.equal(f.animations.length, 0);
  f.clock.kill();
  assert.throws(() => fixture({ duration: -1 }), RangeError);
  assert.throws(() => fixture({ duration: Infinity }), RangeError);
});

test("partial trips stop at their destination in either direction without completing the scene", (t) => {
  const f = fixture();
  t.after(() => f.clock.kill());
  const arrivals = [];
  const onArrive = () => arrivals.push(f.clock.progress());
  assert.equal(f.clock.playTo(0.25, onArrive), f.clock);
  assert.equal(f.animations.at(-1).duration, 250);
  f.tick(0.5);
  assert.equal(f.clock.progress(), 0.125);
  assert.deepEqual(arrivals, []);
  f.tick(1);
  assert.equal(f.clock.progress(), 0.25);
  assert.deepEqual(arrivals, [0.25]);
  assert.deepEqual(f.completions, []);

  f.clock.playTo(0.75, onArrive);
  assert.equal(f.animations.at(-1).duration, 500);
  f.tick(1);
  f.clock.playTo(0.5, onArrive);
  assert.equal(f.animations.at(-1).duration, 250);
  f.tick(0.5);
  assert.equal(f.clock.progress(), 0.625);
  f.tick(1);
  assert.equal(f.updates.at(-1), 0.5);
  assert.deepEqual(arrivals, [0.25, 0.75, 0.5]);
  assert.deepEqual(f.completions, []);
  f.animations.at(-1).onComplete();
  assert.deepEqual(arrivals, [0.25, 0.75, 0.5], "Arrival is delivered once");
});

test("clamped destinations render and complete endpoints before reporting arrival", (t) => {
  const events = [];
  const f = fixture({
    onUpdate: (value) => events.push(["render", value]),
    onComplete: () => events.push(["forward"]),
    onReverseComplete: () => events.push(["reverse"]),
  });
  t.after(() => f.clock.kill());
  const onArrive = () => events.push(["arrive", f.clock.progress()]);
  f.clock.progress(0.75, true).playTo(8, onArrive);
  assert.equal(f.animations.at(-1).duration, 250);
  f.tick(1);
  assert.deepEqual(events, [["render", 1], ["forward"], ["arrive", 1]]);

  events.length = 0;
  f.clock.playTo(-2, onArrive);
  assert.equal(f.animations.at(-1).duration, 1000);
  f.tick(1);
  assert.deepEqual(events, [["render", 0], ["reverse"], ["arrive", 0]]);

  events.length = 0;
  const count = f.animations.length;
  f.clock.playTo(0, onArrive);
  assert.equal(f.animations.length, count);
  assert.deepEqual(
    events,
    [["arrive", 0]],
    "An existing destination arrives without completing twice",
  );
});

test("pause, kill, seeks and replacement trips invalidate pending arrivals", () => {
  for (const interrupt of [
    (clock) => clock.pause(),
    (clock) => clock.kill(),
    (clock) => clock.progress(0.6, true),
    (clock) => clock.progress(0.4),
    (clock) => clock.playTo(0.75),
    (clock) => clock.play(),
    (clock) => clock.reverse(),
  ]) {
    const f = fixture();
    let arrivals = 0;
    try {
      f.clock.playTo(0.5, () => arrivals++);
      f.tick(0.5);
      const obsolete = f.animations.at(-1);
      interrupt(f.clock);
      const progress = f.clock.progress();
      obsolete.onUpdate(obsolete);
      obsolete.onComplete(obsolete);
      assert.equal(f.clock.progress(), progress);
      assert.equal(arrivals, 0);
      assert.deepEqual(f.completions, []);
    } finally {
      f.clock.kill();
    }
  }
});

test("render or endpoint callbacks can invalidate arrival, including synchronous trips", () => {
  for (const duration of [0, 1000]) {
    for (const cancelFrom of ["render", "endpoint"]) {
      let clock;
      let arrivals = 0;
      let completions = 0;
      const f = fixture({
        duration,
        onUpdate: (value) => {
          if (value === 1 && cancelFrom === "render") clock.pause();
        },
        onComplete: () => {
          completions++;
          if (cancelFrom === "endpoint") clock.progress(0.5, true);
        },
      });
      clock = f.clock;
      try {
        clock.playTo(1, () => arrivals++);
        if (duration > 0) f.tick(1);
        assert.equal(arrivals, 0);
        assert.equal(completions, cancelFrom === "endpoint" ? 1 : 0);
      } finally {
        clock.kill();
      }
    }
  }
  const f = fixture({ duration: 0 });
  let arrivals = 0;
  f.clock.playTo(0.25, () => arrivals++);
  assert.equal(f.clock.progress(), 0.25);
  assert.deepEqual(f.updates, [0.25]);
  assert.deepEqual(f.completions, []);
  assert.equal(arrivals, 1);
  assert.equal(f.animations.length, 0);
  f.clock.kill();
});
