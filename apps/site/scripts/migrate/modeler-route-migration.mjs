#!/usr/bin/env node
/**
 * One-shot migration helper:
 * - Reserve `/modeler/` for the static modeler bundle (public assets).
 * - Move the former Astro page `/modeler` -> `/app/modeler-info`.
 * - Remove `src/pages/modeler/` to avoid route-namespace collision with `public/modeler/`.
 *
 * Safe to run multiple times.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script lives at: apps/site/scripts/migrate/*.mjs
// => site root is three levels up.
const SITE_ROOT = path.resolve(__dirname, "..", "..", "..");

const PAGES_MODELER_DIR = path.join(SITE_ROOT, "src", "pages", "modeler");
const OLD_PAGE = path.join(PAGES_MODELER_DIR, "index.astro");
const NEW_PAGE = path.join(SITE_ROOT, "src", "pages", "app", "modeler-info.astro");

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

let moved = false;
if (exists(OLD_PAGE)) {
  ensureDir(path.dirname(NEW_PAGE));
  if (!exists(NEW_PAGE)) {
    fs.copyFileSync(OLD_PAGE, NEW_PAGE);
    moved = true;
  }
}

if (exists(PAGES_MODELER_DIR)) {
  // Remove the whole dir to avoid collisions (even empty dir is treated as a namespace).
  fs.rmSync(PAGES_MODELER_DIR, { recursive: true, force: true });
}

const rel = (p) => path.relative(SITE_ROOT, p).replaceAll("\\", "/");

const lines = [
  "[migrate:modeler-route] done",
  moved ? `- moved: ${rel(OLD_PAGE)} -> ${rel(NEW_PAGE)}` : "- moved: (skipped)",
  `- removed: ${rel(PAGES_MODELER_DIR)} (if existed)`,
];
console.log(lines.join("\n"));

