const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");

const pipeline = import(
  pathToFileURL(path.join(__dirname, "../scripts/project-media.mjs")).href
);

function fixture(t) {
  const temporaryRoot = path.resolve(__dirname, "../../_temp");
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const folder = fs.mkdtempSync(path.join(temporaryRoot, "project-media-"));
  const root = path.join(folder, "media");
  const output = path.join(folder, "manifest.json");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  const put = (name) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "fixture");
    return file;
  };
  return { root, output, put };
}

test("videos precede images and each group uses natural case-insensitive ordering", async (t) => {
  const { scanProjectMedia } = await pipeline;
  const f = fixture(t);
  [
    "10-final.WEBP",
    "2-detail.JPG",
    "1-cover.png",
    "10-demo.MP4",
    "2-demo.webm",
    "A-intro.mp4",
  ].forEach((name) => f.put(`sophos/${name}`));
  const result = scanProjectMedia(f.root).sophos;
  assert.deepEqual(
    result.map(({ name }) => name),
    [
      "2-demo.webm",
      "10-demo.MP4",
      "A-intro.mp4",
      "1-cover.png",
      "2-detail.JPG",
      "10-final.WEBP",
    ],
  );
  assert.deepEqual(
    result.map(({ type }) => type),
    ["video", "video", "video", "image", "image", "image"],
  );
});

test("only supported direct files are indexed; empty and missing collections are safe", async (t) => {
  const { scanProjectMedia } = await pipeline;
  const f = fixture(t);
  f.put("sophos/.hidden.mp4");
  f.put("sophos/notes.txt");
  f.put("sophos/draft.psd");
  f.put("sophos/nested/image.png");
  f.put(".private/clip.mp4");
  f.put("loops-grooves/cover.avif");
  f.put("loops-grooves/animation.gif");
  f.put("loops-grooves/wave.svg");
  f.put("loops-grooves/clip.ogv");
  const result = scanProjectMedia(f.root);
  assert.deepEqual(Object.keys(result), ["loops-grooves", "sophos"]);
  assert.deepEqual(result.sophos, []);
  assert.equal(result["loops-grooves"].length, 4);
  assert.deepEqual(scanProjectMedia(path.join(f.root, "missing")), {});
});

test("URL segments preserve spaces, accents and URL punctuation through encoding", async (t) => {
  const { scanProjectMedia } = await pipeline;
  const f = fixture(t);
  const name = "02-vídeo #1 + 50%.MP4";
  f.put(`un proyecto/${name}`);
  const item = scanProjectMedia(f.root)["un proyecto"][0];
  assert.equal(item.name, name);
  assert.equal(
    item.src,
    `/media/projects/un%20proyecto/${encodeURIComponent(name)}`,
  );
  assert.equal(
    decodeURIComponent(item.src),
    `/media/projects/un proyecto/${name}`,
  );
});

test("manifest regeneration picks up renames and deletions without redundant writes", async (t) => {
  const { writeProjectMediaManifest } = await pipeline;
  const f = fixture(t);
  const image = f.put("sophos/2-cover.png");
  assert.equal(writeProjectMediaManifest(f), true);
  assert.equal(writeProjectMediaManifest(f), false);
  const renamed = path.join(f.root, "sophos/10-cover.png");
  fs.renameSync(image, renamed);
  assert.equal(writeProjectMediaManifest(f), true);
  assert.equal(
    JSON.parse(fs.readFileSync(f.output, "utf8")).sophos[0].name,
    "10-cover.png",
  );
  fs.unlinkSync(renamed);
  assert.equal(writeProjectMediaManifest(f), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.output, "utf8")).sophos, []);
});

test("development watcher notices new project folders, renamed files and removals", async (t) => {
  const { watchProjectMedia, writeProjectMediaManifest } = await pipeline;
  const f = fixture(t);
  writeProjectMediaManifest(f);
  const errors = [];
  const stop = watchProjectMedia({
    ...f,
    onError: (error) => errors.push(error),
  });
  // The watcher must close before fixture cleanup, particularly on Windows.
  const waitFor = async (matches) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (matches(JSON.parse(fs.readFileSync(f.output, "utf8")))) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail("Media watcher did not regenerate its manifest in time");
  };
  try {
    const original = f.put("new-project/demo.mp4");
    await waitFor((manifest) => manifest["new-project"]?.length === 1);
    const renamed = path.join(f.root, "new-project/new-demo.mp4");
    fs.renameSync(original, renamed);
    await waitFor(
      (manifest) => manifest["new-project"]?.[0]?.name === "new-demo.mp4",
    );
    fs.unlinkSync(renamed);
    await waitFor((manifest) => manifest["new-project"]?.length === 0);
    assert.deepEqual(errors, []);
  } finally {
    stop();
  }
});

test("browser lookup applies the deployment base path and tolerates absent projects", () => {
  const manifest = {
    sophos: [
      {
        type: "video",
        src: "/media/projects/sophos/01%20demo.mp4",
        name: "01 demo.mp4",
      },
    ],
  };
  const compiled = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/lib/project-media.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  new Function("exports", "require", "module", compiled)(
    loaded.exports,
    (id) =>
      id.endsWith(".json")
        ? manifest
        : { assetPath: (src) => `/Portfolio-Web${src}` },
    loaded,
  );
  const { getProjectMedia } = loaded.exports;
  assert.equal(
    getProjectMedia("sophos")[0].src,
    "/Portfolio-Web/media/projects/sophos/01%20demo.mp4",
  );
  assert.equal(manifest.sophos[0].src, "/media/projects/sophos/01%20demo.mp4");
  assert.deepEqual(getProjectMedia("unknown"), []);
  assert.deepEqual(getProjectMedia("toString"), []);
});
