// Fix common guardrail violations in-place.
// - Removes legacy src/pages/viewer.astro
// - Removes src/pages_disabled
// - Removes accidental nested folder apps/site/apps/site (apps under siteRoot)
// - Ensures canonical src/pages/viewer/index.astro exists (creates minimal redirect if missing)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

const legacyViewer = path.join(siteRoot, "src", "pages", "viewer.astro");
const canonicalDir = path.join(siteRoot, "src", "pages", "viewer");
const canonicalViewer = path.join(canonicalDir, "index.astro");
const pagesDisabled = path.join(siteRoot, "src", "pages_disabled");
const nestedApps = path.join(siteRoot, "apps");

function rmrf(p) {
  if (!fs.existsSync(p)) return false;
  fs.rmSync(p, { recursive: true, force: true });
  return true;
}

let changed = false;

if (rmrf(legacyViewer)) {
  console.log("[fix] removed legacy route:", legacyViewer);
  changed = true;
}

if (rmrf(pagesDisabled)) {
  console.log("[fix] removed forbidden folder:", pagesDisabled);
  changed = true;
}

if (fs.existsSync(path.join(siteRoot, "apps", "site"))) {
  if (rmrf(nestedApps)) {
    console.log("[fix] removed accidental nested folder:", nestedApps);
    changed = true;
  }
}

// ensure canonical viewer/index.astro exists
if (!fs.existsSync(canonicalViewer)) {
  fs.mkdirSync(canonicalDir, { recursive: true });
  const content = `---\n---\n<html lang="ja">\n  <head>\n    <meta charset="utf-8" />\n    <meta http-equiv="refresh" content="0; url=/app/viewer" />\n    <link rel="canonical" href="/app/viewer" />\n    <title>Viewer</title>\n  </head>\n  <body>\n    <p>Redirecting to <a href="/app/viewer">/app/viewer</a>...</p>\n  </body>\n</html>\n`;
  fs.writeFileSync(canonicalViewer, content, "utf-8");
  console.log("[fix] created canonical viewer route:", canonicalViewer);
  changed = true;
}

if (!changed) {
  console.log("[fix] nothing to change.");
}
