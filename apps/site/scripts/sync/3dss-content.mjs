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
// NOTE: /library は Astro のページ用ルートに予約し、
// 3dss-content の dist/library は public/_data/library に退避して衝突を避ける。
ensureDir(dstPublic);
rmIfExists(path.join(dstPublic, "3dss", "library"));
rmIfExists(path.join(dstPublic, "3dss", "scene"));
rmIfExists(path.join(dstPublic, "_data", "library"));
rmIfExists(path.join(dstPublic, "library")); // legacy cleanup

// dist 直下（3dss/, library/ など）を public に同期。
// - dist/library -> public/_data/library
// - その他は public 直下へ
for (const ent of fs.readdirSync(srcDist, { withFileTypes: true })) {
  const name = ent.name;
  const src = path.join(srcDist, name);
  const dst = name === "library" ? path.join(dstPublic, "_data", "library") : path.join(dstPublic, name);
  rmIfExists(dst);
  ensureDir(path.dirname(dst));
  fs.cpSync(src, dst, { recursive: true });
}

console.log("[sync] 3dss-content(dist) -> site/public OK (library -> /_data/library)");

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
