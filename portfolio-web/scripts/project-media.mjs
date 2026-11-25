import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const appRoot = fileURLToPath(new URL("../", import.meta.url));
export const mediaRoot = path.join(appRoot, "public/media/projects");
export const manifestPath = path.join(
  appRoot,
  "src/data/project-media.generated.json",
);

const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const videoExtensions = new Set([".m4v", ".mp4", ".ogg", ".ogv", ".webm"]);
const names = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

function compareNames(a, b) {
  return names.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Only direct, regular files are published; dotfiles and symlinks are ignored. */
export function scanProjectMedia(root = mediaRoot) {
  if (!fs.existsSync(root)) return {};
  const projects = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((a, b) => compareNames(a.name, b.name));

  return Object.fromEntries(
    projects.map((project) => {
      const media = fs
        .readdirSync(path.join(root, project.name), { withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
        .flatMap((entry) => {
          const extension = path.extname(entry.name).toLowerCase();
          const type = videoExtensions.has(extension)
            ? "video"
            : imageExtensions.has(extension)
              ? "image"
              : null;
          if (!type) return [];
          return [
            {
              type,
              src: `/media/projects/${encodeURIComponent(project.name)}/${encodeURIComponent(entry.name)}`,
              name: entry.name,
            },
          ];
        })
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "video" ? -1 : 1;
          return compareNames(a.name, b.name);
        });
      return [project.name, media];
    }),
  );
}

/** Avoid touching the manifest when only a file's contents changed. */
export function writeProjectMediaManifest({
  root = mediaRoot,
  output = manifestPath,
} = {}) {
  const contents = `${JSON.stringify(scanProjectMedia(root), null, 2)}\n`;
  if (fs.existsSync(output) && fs.readFileSync(output, "utf8") === contents)
    return false;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, contents);
  return true;
}

/** Native recursive watching includes newly created project directories. */
export function watchProjectMedia({
  root = mediaRoot,
  output = manifestPath,
  onUpdate = () => {},
  onError = (error) => console.error("Project media:", error),
} = {}) {
  fs.mkdirSync(root, { recursive: true });
  let timer;
  const watcher = fs.watch(root, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (writeProjectMediaManifest({ root, output })) onUpdate();
      } catch (error) {
        onError(error);
      }
    }, 100);
  });
  watcher.on("error", onError);
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  writeProjectMediaManifest();
}
