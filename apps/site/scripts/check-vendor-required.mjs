// scripts/check-vendor-required.mjs
// Verify that required vendor artifacts exist in SSOT (packages/vendor)
// and in generated output (apps/site/public/vendor).
//
// Why:
// - Viewer/runtime imports absolute /vendor/... paths.
// - If SSOT is missing required bundles, Cloudflare (and clean installs) will break.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

function p(rel) {
  return path.join(repoRoot, rel);
}

const REQUIRED = [
  // three.js ESM build (browser import)
  "packages/vendor/three/build/three.module.js",
  // Ajv bundle used by viewer validator (browser import)
  "packages/vendor/ajv/dist/ajv.bundle.js",
];

const REQUIRED_GENERATED = [
  "apps/site/public/vendor/three/build/three.module.js",
  "apps/site/public/vendor/ajv/dist/ajv.bundle.js",
];

async function exists(absPath) {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const rel of REQUIRED) {
  if (!(await exists(p(rel)))) missing.push(rel);
}

// Generated vendor is expected after sync:vendor.
// (precheck:ssot / prebuild / predev run sync:all)
const missingGen = [];
for (const rel of REQUIRED_GENERATED) {
  if (!(await exists(p(rel)))) missingGen.push(rel);
}

if (missing.length || missingGen.length) {
  console.error("[vendor-required] NG: missing required vendor artifacts");
  if (missing.length) {
    console.error("\nMissing in SSOT (packages/vendor):");
    for (const m of missing) console.error("  - " + m);
  }
  if (missingGen.length) {
    console.error("\nMissing in generated output (apps/site/public/vendor):");
    for (const m of missingGen) console.error("  - " + m);
  }
  console.error("\nFix:");
  console.error("  1) Ensure packages/vendor contains required files (three/build, ajv/dist).");
  console.error("  2) Run: npm run sync:vendor (or npm run sync:all) in apps/site.");
  process.exit(1);
}

console.log("[vendor-required] OK");
