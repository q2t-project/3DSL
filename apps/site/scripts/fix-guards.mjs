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

// Cloudflare Pages wants a real top-level public/404.html (not an Astro route)
const forbidden404Routes = [
  path.join(siteRoot, "src", "pages", "404.astro"),
  path.join(siteRoot, "src", "pages", "404.html.astro"),
  path.join(siteRoot, "src", "pages", "404.html"),
];
const public404 = path.join(siteRoot, "public", "404.html");

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

for (const p of forbidden404Routes) {
  if (rmrf(p)) {
    console.log("[fix] removed forbidden Astro 404 route:", p);
    changed = true;
  }
}

// ensure public/404.html exists (minimal) so Pages doesn't go into SPA fallback
if (!fs.existsSync(public404)) {
  fs.mkdirSync(path.dirname(public404), { recursive: true });
  const html = `<!doctype html>\n<html lang=\"ja\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n  <title>404 | 3DSL</title>\n  <meta name=\"robots\" content=\"noindex\" />\n</head>\n<body>\n  <main style=\"max-width: 52rem; margin: 4rem auto; padding: 0 1rem; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;\">\n    <h1 style=\"font-size: 1.5rem;\">404</h1>\n    <p>ページが見つからへんかった。</p>\n    <p><a href=\"/\">トップへ戻る</a></p>\n  </main>\n</body>\n</html>\n`;
  fs.writeFileSync(public404, html, "utf-8");
  console.log("[fix] created:", public404);
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
