const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const compiled = ts.transpileModule(
  fs.readFileSync(
    path.join(__dirname, "../src/lib/radar-technologies.ts"),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const loadedModule = { exports: {} };
new Function("exports", compiled)(loadedModule.exports);
const {
  RADAR_FOCAL,
  getRadarTechnologyPoint,
  projectRadarTechnology,
  getRadarTechnologyPresence,
  getRadarTechnologyIntensity,
  getRadarTechnologySize,
} = loadedModule.exports;

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("technology positions are stable, distinct and contained in the real radar disc", () => {
  const points = Array.from({ length: 37 }, (_, i) =>
    getRadarTechnologyPoint(i, 37),
  );
  assert.equal(new Set(points.map(({ x, y }) => `${x},${y}`)).size, 37);
  points.forEach((point, index) => {
    assert.deepEqual(point, getRadarTechnologyPoint(index, 37));
    assert.ok(Math.hypot(point.x, point.y) < 0.9);
    assert.ok(Math.hypot(point.x, point.y) > 0.22);
  });
});

test("projected icon centers intersect the same radar world points as the shader camera", () => {
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [844, 390],
  ]) {
    for (const view of [
      { tilt: 0, centerX: 0.5, centerY: 0.5, scale: 0.92 },
      { tilt: 37, centerX: 0.4, centerY: 0.7, scale: 0.95 },
      { tilt: 64, centerX: 0.5, centerY: 0.94, scale: 1.3 },
    ]) {
      for (let i = 0; i < 37; i++) {
        const point = getRadarTechnologyPoint(i, 37);
        const pixel = projectRadarTechnology(point, view, width, height);
        // Independent ray-plane intersection from SCENE, with CSS's inverted Y.
        const sx = (pixel.x - view.centerX * width) / height;
        const sy = (view.centerY * height - pixel.y) / height;
        const ct = Math.cos((view.tilt * Math.PI) / 180);
        const st = Math.sin((view.tilt * Math.PI) / 180);
        const distance =
          (2 * RADAR_FOCAL) / ((view.scale * Math.min(width, height)) / height);
        const ray = {
          x: sx,
          y: st * RADAR_FOCAL + ct * sy,
          z: -ct * RADAR_FOCAL + st * sy,
        };
        const hit = (-distance * ct) / ray.z;
        close(ray.x * hit, point.x);
        close(-distance * st + ray.y * hit, point.y);
        const retina = projectRadarTechnology(
          point,
          view,
          width * 2,
          height * 2,
        );
        close(retina.x, pixel.x * 2);
        close(retina.y, pixel.y * 2);
      }
    }
  }
});

test("sweep highlights match bearing, direction and wrapping without a second clock", () => {
  const tau = Math.PI * 2;
  for (const bearing of [-Math.PI + 0.01, -0.04, 0, 1.6, Math.PI - 0.01]) {
    const point = { x: Math.sin(bearing) * 0.7, y: Math.cos(bearing) * 0.7 };
    for (const speed of [-0.35, 0.35]) {
      const direction = speed < 0 ? -1 : 1;
      close(getRadarTechnologyIntensity(point, bearing, speed), 0.6);
      const recentlyPassed = getRadarTechnologyIntensity(
        point,
        bearing + direction * 0.2,
        speed,
      );
      const oldEcho = getRadarTechnologyIntensity(
        point,
        bearing + direction * 2,
        speed,
      );
      assert.ok(recentlyPassed > oldEcho);
      assert.ok(oldEcho >= 0.06);
      close(
        getRadarTechnologyIntensity(
          point,
          bearing + direction * 0.2 + tau * 3,
          speed,
        ),
        recentlyPassed,
      );
      close(
        getRadarTechnologyIntensity(
          point,
          bearing + direction * 0.2 - tau * 2,
          speed,
        ),
        recentlyPassed,
      );
      const ahead = getRadarTechnologyIntensity(
        point,
        bearing - direction * 0.2,
        speed,
      );
      assert.ok(ahead < 0.061);
    }
  }
});

test("stack handoff is reversible and keeps icons legible in both camera views", () => {
  close(getRadarTechnologyPresence(0.45), 0);
  close(getRadarTechnologyPresence(0.6), 0.5);
  close(getRadarTechnologyPresence(0.75), 1);
  close(getRadarTechnologyPresence(1), 1);
  for (const progress of [0.2, 0.48, 0.54, 0.72, 0.9]) {
    const arrival = getRadarTechnologyPresence(progress);
    getRadarTechnologyPresence(1);
    close(getRadarTechnologyPresence(progress), arrival);
  }
  assert.equal(getRadarTechnologySize(390), 20);
  assert.equal(getRadarTechnologySize(768), 24);
  assert.equal(getRadarTechnologySize(1440), 28);
});
