import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  appRoot,
  watchProjectMedia,
  writeProjectMediaManifest,
} from "./project-media.mjs";

// Keep the generated import current before Next starts and during Fast Refresh.
const stopWatching = watchProjectMedia();
writeProjectMediaManifest();
const require = createRequire(import.meta.url);
const next = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)],
  { cwd: appRoot, stdio: "inherit", env: process.env },
);

next.once("error", (error) => {
  stopWatching();
  console.error(error);
  process.exitCode = 1;
});
next.once("exit", (code) => {
  stopWatching();
  process.exitCode = code ?? 0;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopWatching();
    next.kill(signal);
  });
}
