/**
 * Copies MapLibre's web worker into public/maplibre/ so the map can load it
 * by URL. The bundler cannot place the worker for us ("Worker failed to
 * load"), and copying from node_modules keeps it in step with the installed
 * version. Runs before `dev` and `build`; the output is git-ignored.
 */
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const source = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist");
const target = path.join(process.cwd(), "public", "maplibre");

// The worker is self-contained (the package's "shared" file is empty).
const files = ["maplibre-gl-worker.mjs"];

await mkdir(target, { recursive: true });
for (const file of files) {
  await copyFile(path.join(source, file), path.join(target, file));
}
console.log(`MapLibre worker copied to public/maplibre/ (${files.join(", ")})`);
