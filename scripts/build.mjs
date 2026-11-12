import { mkdir, readdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public");
const allowed = /\.(html|css|js|webmanifest|png|svg|jpe?g|webp|ico)$/i;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile() || !allowed.test(entry.name)) continue;
  await copyFile(path.join(root, entry.name), path.join(output, entry.name));
}

console.log("Static site assets copied to ./public");
