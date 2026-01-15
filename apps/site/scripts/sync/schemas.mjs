// scripts/sync/schemas.mjs
// Mirror schema SSOT (packages/schemas) into site public assets.
//
// Canonical public paths:
// - /schemas/3DSS.schema.json
// - /schemas/3DSS_spec.md
// - /schemas/release/vX.Y.Z/3DSS.schema.json
//
// NOTE: the schema $id points to /schemas/release/... so this path must exist.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_ROOT = path.resolve(__dirname, "..", "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "..", "..");

const SRC_ROOT = path.join(REPO_ROOT, "packages", "schemas");
const SRC_LATEST_SCHEMA = path.join(SRC_ROOT, "3DSS.schema.json");
const SRC_SPEC = path.join(SRC_ROOT, "3DSS_spec.md");
const SRC_RELEASE_DIR = path.join(SRC_ROOT, "release");

const OUT_ROOT = path.join(SITE_ROOT, "public", "schemas");
const OUT_LATEST_SCHEMA = path.join(OUT_ROOT, "3DSS.schema.json");
const OUT_SPEC = path.join(OUT_ROOT, "3DSS_spec.md");
const OUT_RELEASE_DIR = path.join(OUT_ROOT, "release");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(dstDir);
  fs.cpSync(srcDir, dstDir, { recursive: true });
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error(`[sync] schemas: NG: missing ${SRC_ROOT}`);
    process.exit(1);
  }

  copyFile(SRC_LATEST_SCHEMA, OUT_LATEST_SCHEMA);
  if (fs.existsSync(SRC_SPEC)) copyFile(SRC_SPEC, OUT_SPEC);
  copyDir(SRC_RELEASE_DIR, OUT_RELEASE_DIR);

  console.log(`[sync] schemas: mirrored (packages/schemas -> apps/site/public/schemas)`);
}

main();
