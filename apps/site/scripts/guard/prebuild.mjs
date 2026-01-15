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
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

const legacyViewer = path.join(siteRoot, "src", "pages", "viewer.astro");
const canonicalViewer = path.join(siteRoot, "src", "pages", "viewer", "index.astro");
const pagesDisabled = path.join(siteRoot, "src", "pages_disabled");

// 404 policy:
// - Canonical: src/pages/404.astro (Astro emits dist/404.html; confirmed by build logs)
// - Forbidden: public/404.html (would create a second "truth" and risk conflicts)
// - Forbidden: src/pages/404.html.astro (misnamed legacy)
const astro404 = path.join(siteRoot, "src", "pages", "404.astro");
const astro404Legacy = path.join(siteRoot, "src", "pages", "404.html.astro");
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

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], ...opts }).toString();
}

function requireNoTrackedDist() {
  // Delegate to scripts/check/dist-not-tracked.mjs
  const checker = path.join(siteRoot, "scripts", "check", "dist-not-tracked.mjs");
  if (!exists(checker)) return;
  try {
    execSync(`node "${checker}"`, {
      cwd: siteRoot,
      stdio: "inherit",
    });
  } catch {
    fail("[guard] dist-not-tracked check failed. See logs above.");
  }
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

// 2.x) forbid tracked dist outputs (hard rule)
requireNoTrackedDist();

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
// NOTE:
// - vendor placement can vary by sync/bundle strategy.
// - Use candidates: "any one exists" -> OK.

function requireAny(label, candidates, hint) {
  const ok = candidates.find((p) => exists(p));
  if (ok) return;
  const lines = [];
  lines.push(`[guard] Missing required runtime asset group: ${label}`);
  lines.push(`        Looked for:`);
  for (const p of candidates) lines.push(`          - ${p}`);
  if (hint) lines.push(`        Fix: ${hint}`);
  fail(lines.join("\n") + "\n");
}

function readTextIfExists(p) {
  try {
    if (!exists(p)) return "";
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function viewerMentionsAjv(publicDir) {
  // "軽い"文字列検索だけ。JS/HTMLの実行解析はしない。
  const candidates = [
    path.join(publicDir, "viewer", "index.html"),
    path.join(publicDir, "viewer", "viewerHost.js"),
    path.join(publicDir, "viewer", "viewerHostBoot.js"),
    path.join(publicDir, "viewer", "peekBoot.js"),
    path.join(publicDir, "viewer", "runtime", "bootstrapViewer.js"),
  ];

  const needles = [
    "ajv.bundle.js",
    "/vendor/ajv/",
    "vendor/ajv/",
  ];

  for (const f of candidates) {
    const txt = readTextIfExists(f);
    if (!txt) continue;
    for (const n of needles) {
      if (txt.includes(n)) return { hit: true, file: f, needle: n };
    }
  }
  return { hit: false };
}

// Schema (stable)
requireAny(
  "3DSS schema",
  [
    path.join(publicDir, "3dss", "release", "3DSS.schema.json"),
    path.join(publicDir, "3dss", "release", "v1.1.3", "3DSS.schema.json"),
  ],
  "run sync:schemas (or sync:all) to restore /public/3dss/release/**"
);

// three.js (placement may vary)
requireAny(
  "three.js module",
  [
    path.join(publicDir, "vendor", "three", "build", "three.module.js"),
    path.join(publicDir, "vendor", "three", "build", "three.module.min.js"),
    path.join(publicDir, "viewer", "vendor", "three", "build", "three.module.js"),
    path.join(publicDir, "viewer", "vendor", "three", "build", "three.module.min.js"),
  ],
  "run sync:vendor (or sync:viewer) to inject vendor/three"
);

// AJV: required only if the shipped viewer references it
const ajvRef = viewerMentionsAjv(publicDir);
if (ajvRef.hit) {
  requireAny(
    "ajv bundle (referenced by viewer)",
    [
      path.join(publicDir, "vendor", "ajv", "dist", "ajv.bundle.js"),
      path.join(publicDir, "viewer", "vendor", "ajv", "dist", "ajv.bundle.js"),
    ],
    `viewer references AJV (${ajvRef.needle}) in ${ajvRef.file}. Run sync:vendor to inject vendor/ajv.`
  );
} else {
  // No reference => do not require AJV to avoid false failures
}

// ajv-formats (seen in your tree)
requireAny(
  "ajv-formats bundle",
  [
    path.join(publicDir, "vendor", "ajv-formats", "dist", "ajv-formats.bundle.js"),
    path.join(publicDir, "viewer", "vendor", "ajv-formats", "dist", "ajv-formats.bundle.js"),
  ],
  "run sync:vendor to inject vendor/ajv-formats"
);

// ノイズ潰し（任意だが、常に取りに行くなら置いとけ）
const tuningCss = path.join(publicDir, "viewer_tuning.css");
if (!exists(tuningCss)) {
  fail(`[guard] Missing required file: ${tuningCss}\n` +
       `        viewer/index.html references /viewer_tuning.css. Create an empty file if unused.\n`);
}


// 5) 404 must be provided by Astro route
if (exists(astro404Legacy)) {
  fail(`[guard] Forbidden legacy 404 route exists: ${astro404Legacy}\n` +
       `        Use src/pages/404.astro instead.\n`);
}
if (!exists(astro404)) {
  fail(`[guard] Missing required Astro 404 route: ${astro404}\n` +
       `        Fix: create src/pages/404.astro (Astro will emit dist/404.html).\n`);
}
if (exists(public404)) {
  fail(`[guard] Forbidden public 404 file exists: ${public404}\n` +
       `        Fix: delete public/404.html. 404 is owned by src/pages/404.astro.\n`);
}

// (rest unchanged)

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

// dist は生成物。存在は許すが、tracked は禁止。
// (already checked above)

if (failed) process.exit(1);

writeDeployProbe();
