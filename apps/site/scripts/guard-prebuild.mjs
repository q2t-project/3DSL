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

// 4) require canonical viewer/index.astro
if (!exists(canonicalViewer)) {
  fail(`[guard] Missing canonical /viewer route: ${canonicalViewer}\n` +
       `        Create src/pages/viewer/index.astro (redirect to /app/viewer is fine).\n`);
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

if (failed) process.exit(1);

writeDeployProbe();
