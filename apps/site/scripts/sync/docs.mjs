// apps/site/scripts/sync/docs.mjs
// Mirror docs SSOT (packages/docs) into site content collections.
//
// - packages/docs/docs   -> apps/site/src/content/docs
// - packages/docs/faq    -> apps/site/src/content/faq
// - packages/docs/policy -> apps/site/src/content/policy
//
// NOTE:
// - Site builds should never read packages/docs directly.
// - This mirror is the only distribution path.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function cleanDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

// Copy *contents* of a directory into another directory.
//
// Node's fs.cpSync(srcDir, existingDestDir) nests "srcDir" under the destination
// (i.e. dest/basename(srcDir)), which would create .../docs/docs/... .
// We instead copy children one by one so the destination layout is stable.
function copyDirContents(src, dst) {
  if (!fs.existsSync(src)) return false;
  ensureDir(dst);

  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    // fs.cpSync handles both files and directories when recursive is true.
    fs.cpSync(s, d, { recursive: true });
  }
  return true;
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error(`[sync] docs: NG: missing ${SRC_ROOT}`);
    process.exit(1);
  }

  // Clean + mirror to avoid stale content.
  cleanDir(OUT_DOCS);
  cleanDir(OUT_FAQ);
  cleanDir(OUT_POLICY);

  const okDocs = copyDirContents(SRC_DOCS, OUT_DOCS);
  const okFaq = copyDirContents(SRC_FAQ, OUT_FAQ);
  const okPolicy = copyDirContents(SRC_POLICY, OUT_POLICY);

  if (!okDocs && !okFaq && !okPolicy) {
    console.error(`[sync] docs: NG: nothing to mirror (missing: docs/faq/policy)`);
    process.exit(1);
  }

  console.log(`[sync] docs: start`);
  if (okDocs) console.log(`[sync] docs: docs mirrored (packages/docs/docs -> apps/site/src/content/docs)`);
  if (okFaq) console.log(`[sync] docs: faq mirrored (packages/docs/faq -> apps/site/src/content/faq)`);
  if (okPolicy) console.log(`[sync] docs: policy mirrored (packages/docs/policy -> apps/site/src/content/policy)`);
  console.log(`[sync] docs: done`);
}

main();
