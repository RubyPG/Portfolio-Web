import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const output = path.resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const html = fs.readFileSync(path.join(output, "index.html"), "utf8");
const checked = new Set();

assert.ok(
  html.includes("FULLSTACK"),
  "the export must contain the new portfolio",
);
assert.ok(
  html.includes('id="stack"'),
  "the export must include the stack section",
);

function verifyUrl(raw) {
  const url = raw.replaceAll("&amp;", "&");
  if (!url.startsWith("/") || url.startsWith("//")) return;
  const pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  assert.ok(
    !basePath || pathname.startsWith(`${basePath}/`),
    `Asset outside the deployment path: ${pathname}`,
  );
  const relative = pathname.slice(basePath.length).replace(/^\/+/, "");
  const file = path.resolve(output, relative || "index.html");
  assert.ok(
    file.startsWith(`${output}${path.sep}`),
    "Asset escapes the export",
  );
  assert.ok(fs.existsSync(file), `Missing exported asset: ${pathname}`);
  checked.add(file);
}

const decodedHtml = html.replaceAll("&quot;", '"');
for (const match of decodedHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  verifyUrl(match[1]);
}

function verifyCss(text) {
  for (const match of text.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)) {
    verifyUrl(match[1]);
  }
}

verifyCss(decodedHtml);
for (const file of checked) {
  if (file.endsWith(".css")) verifyCss(fs.readFileSync(file, "utf8"));
}
assert.ok(
  checked.size > 10,
  "Expected the portfolio's fonts, icons and bundles",
);
console.log(
  `Static export verified: ${checked.size} local resources, base path ${basePath || "/"}.`,
);
