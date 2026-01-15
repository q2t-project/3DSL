// apps/site/scripts/sync/docs.mjs
// SSOT: packages/docs/** -> apps/site/src/content/**
// Mirrors:
// - packages/docs/docs   -> apps/site/src/content/docs
// - packages/docs/faq    -> apps/site/src/content/faq
// - packages/docs/policy -> apps/site/src/content/policy
//
// Robustness:
// - If "docs" gets nested (src/content/docs/docs/**), ALWAYS flatten it to src/content/docs/**.
//   This prevents routes like /docs/docs/... from being generated.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/site/scripts/sync -> apps/site
const SITE_ROOT = path.resolve(__dirname, "..", "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "..", "..");

const SRC_ROOT = path.join(REPO_ROOT, "packages", "docs");
const SRC_DOCS = path.join(SRC_ROOT, "docs");
const SRC_FAQ = path.join(SRC_ROOT, "faq");
const SRC_POLICY = path.join(SRC_ROOT, "policy");

const OUT_ROOT = path.join(SITE_ROOT, "src", "content");
const OUT_DOCS = path.join(OUT_ROOT, "docs");
const OUT_FAQ = path.join(OUT_ROOT, "faq");
const OUT_POLICY = path.join(OUT_ROOT, "policy");

function log(msg) {
  console.log(`[sync] docs: ${msg}`);
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

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

// Copy directory recursively (overwrites existing)
function copyDir(src, dst) {
  ensureDir(dst);
  fs.cpSync(src, dst, { recursive: true, force: true });
}

function flattenDocsIfNested(outDocsDir) {
  const nested = path.join(outDocsDir, "docs");
  if (!existsDir(nested)) return;

  const names = fs.readdirSync(nested);
  for (const name of names) {
    const srcPath = path.join(nested, name);
    const dstPath = path.join(outDocsDir, name);

    // Preserve existing top-level README if present (avoid nuking it).
    if (name.toLowerCase() === "readme.md" && existsFile(dstPath)) {
      continue;
    }

    rmrf(dstPath);
    fs.renameSync(srcPath, dstPath);
  }

  rmrf(nested);
  log('flattened nested docs/ (removed extra "docs" segment)');
}

function removeEmbeddedDocsFaq(outDocsDir) {
  const embedded = path.join(outDocsDir, "faq");
  if (existsDir(embedded)) {
    rmrf(embedded);
    log("removed embedded docs/faq (use src/content/faq)");
  }
}

function main() {
  log("start");

  // Clean output dirs so deleted files don't linger.
  rmrf(OUT_DOCS);
  rmrf(OUT_FAQ);
  rmrf(OUT_POLICY);
  ensureDir(OUT_ROOT);

  // docs
  if (!existsDir(SRC_DOCS)) {
    log(`docs source missing (${SRC_DOCS}) -> created empty ${OUT_DOCS}`);
    ensureDir(OUT_DOCS);
  } else {
    copyDir(SRC_DOCS, OUT_DOCS);
    log(`docs mirrored (${SRC_DOCS} -> ${OUT_DOCS})`);
  }

  // Remove embedded docs/faq if any (from old layouts)
  removeEmbeddedDocsFaq(OUT_DOCS);

  // Flatten /docs/docs/* -> /docs/* (ALWAYS if present)
  flattenDocsIfNested(OUT_DOCS);

  // faq
  if (!existsDir(SRC_FAQ)) {
    log(`faq source missing (${SRC_FAQ}) -> created empty ${OUT_FAQ}`);
    ensureDir(OUT_FAQ);
  } else {
    copyDir(SRC_FAQ, OUT_FAQ);
    log(`faq mirrored (${SRC_FAQ} -> ${OUT_FAQ})`);
  }

  // policy
  if (!existsDir(SRC_POLICY)) {
    log(`policy source missing (${SRC_POLICY}) -> created empty ${OUT_POLICY}`);
    ensureDir(OUT_POLICY);
  } else {
    copyDir(SRC_POLICY, OUT_POLICY);
    log(`policy mirrored (${SRC_POLICY} -> ${OUT_POLICY})`);
  }

  log("done");
}

main();
