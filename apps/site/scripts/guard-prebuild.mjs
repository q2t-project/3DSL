// Guardrails for 3DSL site build (Astro)
// Enforces canonical /viewer route: src/pages/viewer/index.astro ONLY.
// Forbids legacy src/pages/viewer.astro and src/pages_disabled.
// Also detects accidental nested folder apps/site/apps/site.
//
// This script is designed to work regardless of current working directory.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// siteRoot = .../apps/site
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

const legacyViewer = path.join(siteRoot, "src", "pages", "viewer.astro");
const canonicalViewer = path.join(siteRoot, "src", "pages", "viewer", "index.astro");
const pagesDisabled = path.join(siteRoot, "src", "pages_disabled");

// nested copy: apps/site/apps/site -> within siteRoot, "apps/site" exists
const nestedSite = path.join(siteRoot, "apps", "site");

let failed = false;

function fail(msg) {
  console.error(msg);
  failed = true;
}

// 1) accidental nested folder
if (exists(nestedSite)) {
  fail(`[guard] Detected accidental nested path: ${nestedSite}\n` +
       `        Fix: delete the nested folder "apps" under apps/site (i.e., remove ${path.join(siteRoot, "apps")})\n`);
}

// 2) forbid legacy viewer.astro
if (exists(legacyViewer)) {
  fail(`[guard] Forbidden legacy route exists: ${legacyViewer}\n` +
       `        Use src/pages/viewer/index.astro only.\n`);
}

// 3) forbid pages_disabled
if (exists(pagesDisabled)) {
  fail(`[guard] Forbidden folder exists: ${pagesDisabled}\n` +
       `        Do not keep disabled pages inside src/. Move outside repo or delete.\n`);
}

// 4) require canonical viewer/index.astro
if (!exists(canonicalViewer)) {
  fail(`[guard] Missing canonical /viewer route: ${canonicalViewer}\n` +
       `        Create src/pages/viewer/index.astro (redirect to /app/viewer is fine).\n`);
}

if (failed) process.exit(1);


// --- guard: forbid page-level import of styles/global.css (Layout SSOT only)
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const pagesRoot = path.join(repoRoot, "src", "pages");
if (fs.existsSync(pagesRoot)) {
  const astroFiles = walk(pagesRoot).filter((p) => p.endsWith(".astro"));
  const offenders = [];

  for (const f of astroFiles) {
    const s = fs.readFileSync(f, "utf8");
    if (s.includes("styles/global.css")) offenders.push(f);
  }

  if (offenders.length) {
    console.error("[guard] Forbidden: pages must not import styles/global.css (Layout SSOT only)");
    for (const f of offenders) console.error(" -", f);
    process.exit(1);
  }
}
