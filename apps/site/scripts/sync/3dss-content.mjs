import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repoRoot: derived from this script location (apps/site/scripts/sync/*)
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");
const srcDist = path.join(repoRoot, "packages", "3dss-content", "dist");
const dstPublic = path.join(repoRoot, "apps", "site", "public");

function rmIfExists(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

if (!fs.existsSync(srcDist)) {
  console.error(`[sync] dist not found: ${srcDist}`);
  process.exit(1);
}

// public の中で、この同期が責任持つ範囲だけ掃除（残骸事故防止）
ensureDir(dstPublic);
rmIfExists(path.join(dstPublic, "3dss", "library"));
rmIfExists(path.join(dstPublic, "library"));
rmIfExists(path.join(dstPublic, "3dss", "scene"));

// dist 直下（3dss/, library/）を public 直下にコピー
fs.cpSync(srcDist, dstPublic, { recursive: true });

console.log("[sync] 3dss-content(dist) -> site/public OK");

// --- fixtures suite -> site/public (for regression/fixtures validation) ---
const srcFixturesSuite = path.join(repoRoot, "packages", "3dss-content", "fixtures", "regression");
const dstFixturesSuite = path.join(dstPublic, "3dss", "fixtures", "regression");

if (!fs.existsSync(srcFixturesSuite)) {
  console.error(`[sync] fixtures suite not found: ${srcFixturesSuite}`);
  process.exit(1);
}

rmIfExists(dstFixturesSuite);
ensureDir(path.dirname(dstFixturesSuite));
fs.cpSync(srcFixturesSuite, dstFixturesSuite, { recursive: true });

console.log("[sync] fixtures suite -> site/public OK");
