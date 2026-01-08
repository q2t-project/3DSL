// Guardrails for 3DSL site build (Astro)
// Enforces canonical /viewer route: src/pages/viewer/index.astro ONLY.
// Forbids legacy src/pages/viewer.astro and src/pages_disabled.
// Also detects accidental nested folder apps/site/apps/site.
//
// This script is designed to work regardless of current working directory.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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

// Cloudflare Pages expects a real top-level "404.html" file.
// Astro default build.format="directory" would output "404.html/index.html" which Pages will NOT detect.
// Therefore we require: public/404.html and forbid: src/pages/404.html.astro
const astro404 = path.join(siteRoot, "src", "pages", "404.html.astro");
const public404 = path.join(siteRoot, "public", "404.html");

// Deploy probe (helps verify Cloudflare Pages picked up the latest build)
const deployProbe = path.join(siteRoot, "public", "__deploy_probe.txt");

const publicDir = path.join(siteRoot, "public");

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

// 4) require canonical /viewer route (Astro OR public-owned)
const publicViewer = path.join(publicDir, "viewer", "index.html");

if (!exists(canonicalViewer) && !exists(publicViewer)) {
  fail(
    `[guard] Missing canonical /viewer route: ${canonicalViewer}\n` +
    `        Create src/pages/viewer/index.astro OR keep public/viewer/index.html (SSOT).\n`
  );
}

// 4.5) /viewer is public-owned (SSOT) のときの必須物チェック
const publicViewerDir = path.join(publicDir, "viewer");
const ownedMarkerA = path.join(publicViewerDir, ".OWNED_BY_PUBLIC");
const ownedMarkerB = path.join(publicViewerDir, ".public-owned");
const publicViewerIndex = path.join(publicViewerDir, "index.html");

if (exists(publicViewerDir)) {
  if (!exists(publicViewerIndex)) {
    fail(`[guard] Missing required viewer entry: ${publicViewerIndex}\n` +
         `        /viewer SSOT is public/viewer. index.html is required.\n`);
  }
  if (!exists(ownedMarkerA) || !exists(ownedMarkerB)) {
    fail(`[guard] Missing public ownership markers under ${publicViewerDir}\n` +
         `        Required: .OWNED_BY_PUBLIC and .public-owned\n`);
  }
}

// viewer runtime 依存（これが無いと「200出てるのに中身死ぬ」を起こす）
const req = [
  path.join(publicDir, "3dss", "3dss", "release", "3DSS.schema.json"),
  path.join(publicDir, "3dss", "sample", "core_viewer_baseline.3dss.json"),
  path.join(publicDir, "vendor", "three", "build", "three.module.js"),
  path.join(publicDir, "vendor", "ajv", "dist", "ajv.bundle.js"),
];

for (const p of req) {
  if (!exists(p)) {
    fail(`[guard] Missing required runtime asset: ${p}\n` +
         `        Fix: run sync:all (schemas/vendor/3dss-content) or restore the SSOT files.\n`);
  }
}

// ノイズ潰し（任意だが、常に取りに行くなら置いとけ）
const tuningCss = path.join(publicDir, "viewer_tuning.css");
if (!exists(tuningCss)) {
  fail(`[guard] Missing required file: ${tuningCss}\n` +
       `        viewer/index.html references /viewer_tuning.css. Create an empty file if unused.\n`);
}


// 5) require proper Cloudflare Pages 404.html
if (exists(astro404)) {
  fail(`[guard] Forbidden Astro 404 route exists: ${astro404}\n` +
       `        Cloudflare Pages needs a real top-level "404.html" file.\n` +
       `        Fix: delete src/pages/404.html.astro and create public/404.html instead.\n`);
}
if (!exists(public404)) {
  fail(`[guard] Missing required file: ${public404}\n` +
       `        Cloudflare Pages needs public/404.html to return proper 404 status.\n`);
}

function getGitSha() {
  const envSha = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || process.env.COMMIT_SHA;
  if (envSha && typeof envSha === "string" && envSha.length >= 7) return envSha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function writeDeployProbe() {
  try {
    const payload = {
      sha: getGitSha(),
      builtAt: new Date().toISOString(),
    };
    const json = JSON.stringify(payload, null, 2) + "\n";

    // 1) public: always write (Astro copies public -> dist)
    fs.mkdirSync(path.dirname(deployProbe), { recursive: true });
    fs.writeFileSync(deployProbe, json, "utf8");

    // 2) dist: if exists, keep it in sync (helps local verification without a rebuild)
    const distProbe = path.join(siteRoot, "dist", "__deploy_probe.txt");
    if (exists(path.join(siteRoot, "dist"))) {
      try { fs.writeFileSync(distProbe, json, "utf8"); } catch {}
    }

    console.log(`[guard] wrote __deploy_probe.txt sha=${payload.sha}`);
  } catch (e) {
    // probe is best-effort; do not fail build
  }
}


function isCiLike() {
  return !!(process.env.CI || process.env.CF_PAGES || process.env.GITHUB_ACTIONS || process.env.GITHUB_SHA);
}

function runLibraryMetaCheck() {
  // CI only (default): enforce minimum _meta.json keys to prevent "published-but-broken" items from shipping.
  // Override:
  //   - set LIBRARY_META_POLICY=warn|error to force a specific policy
  //   - set LIBRARY_META_POLICY=off to skip the check explicitly
  const raw = (process.env.LIBRARY_META_POLICY || "").trim().toLowerCase();
  if (raw === "off") return;

  const policy = raw || (isCiLike() ? "error" : "");
  if (!policy) return;

  const script = path.join(repoRoot, "packages", "3dss-content", "scripts", "check-library.mjs");
  if (!exists(script)) return;

  try {
    execSync(`node "${script}" --policy=${policy}`, {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, LIBRARY_META_POLICY: policy },
    });
  } catch {
    fail(`[guard] Library meta check failed (policy=${policy}). Fix packages/3dss-content/library/*/_meta.json (or mark as published:false).`);
  }
}

runLibraryMetaCheck();

if (failed) process.exit(1);

writeDeployProbe();
