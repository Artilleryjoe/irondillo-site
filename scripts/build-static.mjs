import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const rootExtensions = new Set([".html", ".xml", ".txt"]);
const rootFiles = ["_headers", "_worker.js", "CNAME", "styles.css"];

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && rootExtensions.has(extname(entry.name))) {
    await cp(resolve(root, entry.name), resolve(output, entry.name));
  }
}

for (const file of rootFiles) {
  await cp(resolve(root, file), resolve(output, file));
}

await cp(resolve(root, "assets"), resolve(output, "assets"), { recursive: true });
