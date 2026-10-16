// Copies the pdf.js worker into public/ so it is served as a static asset.
// Wired to `predev`/`prebuild` in package.json. This keeps the worker file in
// sync with the installed pdfjs-dist version.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = path.join(root, "public");
const dest = path.join(destDir, "pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.error(`copy-pdf-worker: source not found: ${src}`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
cpSync(src, dest);
console.log("copy-pdf-worker: copied pdf.worker.min.mjs -> public/");
