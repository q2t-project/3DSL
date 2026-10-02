#!/usr/bin/env node
// STEP 11 Release 1 mobile + built-artifact end-to-end acceptance.
// No browser dependency: this checks the generated distribution over HTTP plus
// the mobile interaction contract in source. Visual/device effectiveness remains
// a separate human acceptance question.

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(SITE_ROOT, "../..");
const DIST = path.join(SITE_ROOT, "dist");

function readSource(rel) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) throw new Error(`missing source: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function requireSource(rel, re, label) {
  const text = readSource(rel);
  if (!re.test(text)) throw new Error(`${label}: source contract missing in ${rel}`);
  return text;
}

if (!fs.existsSync(DIST)) {
  throw new Error(`dist missing: ${DIST}; run npm run build first`);
}

// --- mobile source contract ---
const appViewer = requireSource(
  "apps/site/src/pages/app/viewer.astro",
  /viewport-fit=cover/,
  "mobile viewport safe-area contract"
);
for (const [re, label] of [
  [/@media\s*\(max-width:\s*520px\)/, "mobile breakpoint"],
  [/safe-area-inset-top/, "safe-area top"],
  [/safe-area-inset-bottom/, "safe-area bottom"],
  [/\.app-viewer-action\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/, "44px mobile action target"],
  [/\.app-viewer-reader-actions button\s*\{[\s\S]*min-height:\s*44px;/, "44px guide action target"],
  [/#app-viewer-copy,[\s\S]*#app-viewer-snap,[\s\S]*#app-viewer-qr[\s\S]*display:\s*none\s*!important;/, "mobile auxiliary action reduction"],
  [/max-height:\s*calc\(100dvh[\s\S]*overflow-y:\s*auto;/, "mobile guide viewport containment"],
]) {
  if (!re.test(appViewer)) throw new Error(`${label}: mobile contract missing`);
}

const innerBoot = requireSource(
  "apps/viewer/ssot/viewerHostBoot.js",
  /window\.parent\s*!==\s*window/,
  "framed Viewer chrome ownership"
);
if (!/btn\.hidden\s*=\s*true/.test(innerBoot) || !/btn\.style\.display\s*=\s*"none"/.test(innerBoot)) {
  throw new Error("framed inner Viewer must suppress its own back control");
}

// --- tiny static HTTP server over the generated distribution ---
function requestFile(pathname) {
  let p = decodeURIComponent(pathname.split("?")[0] || "/");
  if (!p.startsWith("/")) p = "/" + p;
  if (p.endsWith("/")) p += "index.html";
  const abs = path.resolve(DIST, "." + p);
  if (!(abs === DIST || abs.startsWith(DIST + path.sep))) return null;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  return null;
}

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url || "/", "http://127.0.0.1");
    const file = requestFile(u.pathname);
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const type =
      ext === ".html" ? "text/html; charset=utf-8" :
      ext === ".json" ? "application/json; charset=utf-8" :
      ext === ".xml" ? "application/xml; charset=utf-8" :
      ext === ".css" ? "text/css; charset=utf-8" :
      ext === ".js" || ext === ".mjs" ? "text/javascript; charset=utf-8" :
      "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(e));
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server address unavailable");
  const base = `http://127.0.0.1:${addr.port}`;

  async function get(pathname) {
    const r = await fetch(base + pathname, { redirect: "manual" });
    const text = await r.text();
    assert.equal(r.status, 200, `${pathname} must return 200 (got ${r.status})`);
    return { r, text };
  }

  const home = await get("/");
  assert.match(home.text, /href="\/library\/?"/, "Home must expose Library");
  assert.match(home.text, /href="\/app\/viewer\/?"/, "Home must expose canonical Viewer");

  const library = await get("/library/");
  assert.match(library.text, /26010501/, "Release 1 core entry must be present");
  assert.match(library.text, /26012201/, "Release 1 representative must be present");
  for (const excluded of ["26012101", "26012301", "26012801", "26020401"]) {
    assert.ok(!library.text.includes(excluded), `Release 1 Library must exclude ${excluded}`);
  }

  const detail = await get("/library/26010501/");
  assert.match(detail.text, /\/app\/viewer\?/, "detail must link to canonical Viewer host");
  assert.match(detail.text, /first-read/, "detail must expose first-read explanation route");
  assert.match(detail.text, /_meta\.json/, "guided route must reference Library metadata");
  assert.match(detail.text, /return=(?:%2F|\/)library/i, "Viewer handoff must carry a Library return target");

  const metaResp = await get("/_data/library/26010501/_meta.json");
  const meta = JSON.parse(metaResp.text);
  const route = (Array.isArray(meta.entry_points) ? meta.entry_points : []).find((x) => x?.id === "first-read");
  assert.ok(route, "generated core-entry metadata must contain first-read route");
  assert.ok(Array.isArray(route.steps) && route.steps.length >= 3, "first-read route must remain multi-step");

  const modelResp = await get("/_data/library/26010501/model.3dss.json");
  const model = JSON.parse(modelResp.text);
  const uuidSet = new Set();
  for (const key of ["points", "lines", "aux"]) {
    for (const item of Array.isArray(model[key]) ? model[key] : []) {
      const uuid = typeof item?.meta?.uuid === "string" ? item.meta.uuid : "";
      if (uuid) uuidSet.add(uuid);
    }
  }
  for (const step of route.steps) {
    if (step?.action === "focus") {
      assert.ok(uuidSet.has(step.uuid), `built route target missing from built model: ${step.uuid}`);
    }
  }

  const viewer = await get("/app/viewer/");
  for (const token of [
    'id="app-viewer-iframe"',
    'id="app-viewer-back"',
    'id="app-viewer-orientation"',
    'id="app-viewer-reader"',
    'id="app-viewer-reader-prev"',
    'id="app-viewer-reader-overview"',
    'id="app-viewer-reader-next"',
  ]) {
    assert.ok(viewer.text.includes(token), `built Viewer host missing ${token}`);
  }
  assert.match(viewer.text, /viewport-fit=cover/, "built Viewer host must preserve mobile viewport contract");

  const inner = await get("/viewer/index.html");
  assert.match(inner.text, /id="viewer-canvas"/, "inner Viewer runtime must be present");

  const excluded = await get("/library/26012301/");
  assert.match(excluded.text, /name="robots"[^>]*content="noindex,follow"|content="noindex,follow"[^>]*name="robots"/, "excluded legacy detail must be noindex");

  const sitemapPath = path.join(DIST, "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    const sitemap = await get("/sitemap.xml");
    assert.match(sitemap.text, /\/library\/26010501\//, "sitemap must include core Release 1 detail");
    assert.match(sitemap.text, /\/library\/26012201\//, "sitemap must include representative Release 1 detail");
    assert.ok(!sitemap.text.includes("/library/26012301/"), "sitemap must exclude legacy fixed-axis detail");
    assert.match(sitemap.text, /\/app\/viewer\//, "sitemap must include canonical Viewer");
    assert.ok(!sitemap.text.includes("/viewer/"), "sitemap must not expose inner Viewer as a public product route");
  } else {
    console.log("release1 mobile/e2e: sitemap check skipped (non-production build)");
  }

  console.log("release1 mobile/e2e acceptance: PASS");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
