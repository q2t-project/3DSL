import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repoRoot: apps/site/scripts -> apps/site -> apps -> repoRoot
const repoRoot = path.resolve(__dirname, "..", "..", "..");

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

// dist 直下（3dss/, library/）を public 直下にコピー
fs.cpSync(srcDist, dstPublic, { recursive: true });

console.log("[sync] 3dss-content(dist) -> site/public OK");

// --- fixtures/phase7 -> site/public (for check:phase7) ---
const srcPhase7 = path.join(repoRoot, "packages", "3dss-content", "fixtures", "phase7");
const dstPhase7 = path.join(dstPublic, "3dss", "fixtures", "phase7");

if (!fs.existsSync(srcPhase7)) {
  console.error(`[sync] fixtures/phase7 not found: ${srcPhase7}`);
  process.exit(1);
}

rmIfExists(dstPhase7);
ensureDir(path.dirname(dstPhase7));
fs.cpSync(srcPhase7, dstPhase7, { recursive: true });

console.log("[sync] fixtures/phase7 -> site/public OK");
