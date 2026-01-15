// apps/site/scripts/sync/schemas.mjs
// SSOT: packages/schemas/**
// Output: apps/site/public/3dss/release/**

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/site/scripts/sync -> apps/site
const siteRoot = path.resolve(__dirname, "..", "..");
// apps/site -> repo root
const repoRoot = path.resolve(siteRoot, "..", "..");

const SRC_RELEASE_DIR = path.join(repoRoot, "packages", "schemas", "release");
const DST_RELEASE_DIR = path.join(siteRoot, "public", "3dss", "release");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmIfExists(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function newestVersionDir(root) {
  if (!existsDir(root)) return null;
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^v\d+\.\d+\.\d+$/.test(d.name))
    .map((d) => d.name)
    .sort(); // v1.1.3 形式なら lex でOK
  return dirs.length ? dirs[dirs.length - 1] : null;
}

function main() {
  // 0) 旧パス残骸を掃除（生成で復活させない）
  rmIfExists(path.join(siteRoot, "public", "3dss", "3dss"));

  // 1) release 一式コピー
  rmIfExists(DST_RELEASE_DIR);
  ensureDir(DST_RELEASE_DIR);

  let releaseCount = 0;

  if (existsDir(SRC_RELEASE_DIR)) {
    fs.cpSync(SRC_RELEASE_DIR, DST_RELEASE_DIR, { recursive: true });

    // releaseCount を数える（vX.Y.Z ディレクトリ数）
    releaseCount = fs
      .readdirSync(DST_RELEASE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^v\d+\.\d+\.\d+$/.test(d.name)).length;
  }

  // 2) latest alias: release/3DSS.schema.json -> release/vX.Y.Z/3DSS.schema.json
  const latest = newestVersionDir(DST_RELEASE_DIR);
  if (latest) {
    const latestSchema = path.join(DST_RELEASE_DIR, latest, "3DSS.schema.json");
    const aliasSchema = path.join(DST_RELEASE_DIR, "3DSS.schema.json");
    if (existsFile(latestSchema)) {
      fs.copyFileSync(latestSchema, aliasSchema);
    }
  }

  console.log(`[sync] schemas -> site/public OK (latest + ${releaseCount} release(s))`);
}

main();
