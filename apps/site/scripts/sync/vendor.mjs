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

function mustExistFile(p, hint) {
  if (!existsSync(p)) {
    console.error("[sync] required file not found: " + p);
    if (hint) console.error(hint);
    process.exit(1);
  }
}


mustExistDir(src);

// Ajv is sourced from apps/site/node_modules to avoid committing large build artifacts
// under packages/vendor. It is still mirrored into /public/vendor for runtime use.
const ajvSrcDist = path.resolve(siteRoot, "node_modules", "ajv", "dist");
mustExistDir(ajvSrcDist);
mustExistFile(
  path.resolve(ajvSrcDist, "ajv.js"),
  "[sync] run: npm --prefix apps/site ci",
);

// rm first to prevent stale vendor files
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });

// Overwrite Ajv dist with the node_modules build.
await rm(path.resolve(dst, "ajv"), { recursive: true, force: true });
await mkdir(path.resolve(dst, "ajv", "dist"), { recursive: true });
await cp(ajvSrcDist, path.resolve(dst, "ajv", "dist"), { recursive: true, force: true });

console.log("[sync] vendor -> site/public OK");
