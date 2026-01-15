// scripts/sync/docs.mjs
// Mirror docs SSOT (packages/docs) into Astro content.
//
// - packages/docs/docs   -> apps/site/src/content/docs
// - packages/docs/faq    -> apps/site/src/content/faq
// - packages/docs/policy -> apps/site/src/content/policy

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

function resetDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
  ensureDir(p);
}

function copyDir(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return false;
  resetDir(dstDir);
  fs.cpSync(srcDir, dstDir, { recursive: true });
  return true;
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error(`[sync] docs: NG: missing ${SRC_ROOT}`);
    process.exit(1);
  }

  const okDocs = copyDir(SRC_DOCS, OUT_DOCS);
  const okFaq = copyDir(SRC_FAQ, OUT_FAQ);
  const okPolicy = copyDir(SRC_POLICY, OUT_POLICY);

  if (!okDocs && !okFaq && !okPolicy) {
    console.error(`[sync] docs: NG: nothing to mirror under ${SRC_ROOT}`);
    process.exit(1);
  }

  console.log(`[sync] docs: docs mirrored (packages/docs/docs -> apps/site/src/content/docs)`);
  console.log(`[sync] docs: faq mirrored (packages/docs/faq -> apps/site/src/content/faq)`);
  console.log(`[sync] docs: policy mirrored (packages/docs/policy -> apps/site/src/content/policy)`);
  console.log(`[sync] docs: done`);
}

main();
