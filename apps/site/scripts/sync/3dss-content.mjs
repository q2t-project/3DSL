// apps/site/scripts/sync/3dss-content.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repoRoot: derived from this script location (apps/site/scripts/sync/*)
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

const dstPublic = path.join(repoRoot, "apps", "site", "public");

function rmIfExists(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// --- SSOT build -> site/public (single mirror destination) ---
const buildScript = path.join(
  repoRoot,
  "packages",
  "3dss-content",
  "scripts",
  "build-library-dist.mjs"
);

ensureDir(dstPublic);

// build script must NEVER delete dstPublic itself; only its own subtrees (3dss/, library/)
execFileSync(process.execPath, [buildScript, "--out", "apps/site/public"], {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log("[sync] 3dss-content(SSOT) -> site/public OK");

// --- fixtures suite -> site/public (for regression/fixtures validation) ---
const srcFixturesSuite = path.join(
  repoRoot,
  "packages",
  "3dss-content",
  "fixtures",
  "regression"
);
const dstFixturesSuite = path.join(dstPublic, "3dss", "fixtures", "regression");

if (!fs.existsSync(srcFixturesSuite)) {
  console.error(`[sync] fixtures suite not found: ${srcFixturesSuite}`);
  process.exit(1);
}

rmIfExists(dstFixturesSuite);
ensureDir(path.dirname(dstFixturesSuite));
fs.cpSync(srcFixturesSuite, dstFixturesSuite, { recursive: true });

console.log("[sync] fixtures suite -> site/public OK");
