import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

// SSOT (source of truth)
const src = path.resolve(repoRoot, "packages/vendor");
// generated
const dst = path.resolve(repoRoot, "apps/site/public/vendor");

function mustExistDir(p) {
  if (!existsSync(p)) {
    console.error("[sync] vendor SSOT not found: " + p);
    console.error("[sync] create packages/vendor first (e.g. restore from your repo / vendor source).");
    process.exit(1);
  }
}

async function ensureAjvBundle() {
  const outFile = path.resolve(src, "ajv", "dist", "ajv.bundle.js");

  // Policy: Ajv bundle must be checked into SSOT to keep sync deterministic
  // and avoid requiring devDependencies (esbuild) in CI/environments.
  if (!existsSync(outFile)) {
    console.error("[sync] missing required Ajv bundle in vendor SSOT: " + outFile);
    console.error("[sync] policy: commit packages/vendor/ajv/dist/ajv.bundle.js to the repo.");
    console.error("[sync] how to generate (once):");
    console.error("  npm --prefix apps/site ci");
    console.error("  node apps/site/scripts/sync/vendor.mjs");
    process.exit(1);
  }

  return { built: false, outFile };
}


mustExistDir(src);

// Ensure Ajv bundle exists in SSOT before copying.
const ajvResult = await ensureAjvBundle();
if (ajvResult.built) {
  console.log("[sync] vendor: built ajv bundle -> " + path.relative(repoRoot, ajvResult.outFile));
}

// rm first to prevent stale vendor files
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });

console.log("[sync] vendor -> site/public OK");
