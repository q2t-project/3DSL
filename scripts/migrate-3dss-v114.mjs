#!/usr/bin/env node
/**
 * migrate-3dss-v114.mjs
 *
 * Purpose
 * - Migrate packages/3dss-content/library/<itemId>/model.3dss.json so `document_meta` conforms to 3DSS schema v1.1.4.
 *
 * Hard rules (SSOT / contamination guard)
 * 1) Keep schema_uri policy: must be
 *    https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4
 * 2) Do not create or keep legacy keys like `updated_at` in model.3dss.json.
 * 3) Do not drop existing meaningful metadata (title/summary/uuid/tags/etc.).
 * 4) Never use filesystem mtime as a timestamp source (git checkout / restore changes it).
 *
 * Timestamp sourcing
 * - created_at:
 *   document_meta.created_at -> library/_meta.json.created_at
 *   (fallback: document_meta.revised_at if present)
 * - revised_at:
 *   document_meta.revised_at -> library/_meta.json.republished_at -> library/_meta.json.published_at
 *   -> library/_meta.json.created_at -> created_at
 *
 * Usage
 *   node scripts/migrate-3dss-v114.mjs --dry-run
 *   node scripts/migrate-3dss-v114.mjs --write
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const ROOT = process.cwd();
const LIB_ROOT = path.join(ROOT, "packages", "3dss-content", "library");

const SCHEMA_URI_V114 =
  "https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4";

function parseArgs(argv) {
  const a = new Set(argv.slice(2));
  return {
    dryRun: a.has("--dry-run") || (!a.has("--write") && !a.has("--apply")),
    write: a.has("--write") || a.has("--apply"),
    verbose: a.has("--verbose"),
  };
}

function readJson(fp) {
  const s = fs.readFileSync(fp, "utf8");
  return JSON.parse(s);
}

function writeJsonPretty(fp, obj) {
  const s = JSON.stringify(obj, null, 2) + "\n";
  fs.writeFileSync(fp, s, "utf8");
}

function isIsoDateTime(s) {
  if (typeof s !== "string") return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

function pickFirstIso(...vals) {
  for (const v of vals) {
    if (isIsoDateTime(v)) return String(v);
  }
  return null;
}

function safeString(v, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function safeStringArray(v) {
  if (!Array.isArray(v)) return null;
  const xs = v.filter((x) => typeof x === "string" && x.trim().length);
  return xs.length ? xs : null;
}

function readMeta(dir) {
  const fp = path.join(dir, "_meta.json");
  if (!fs.existsSync(fp)) return null;
  try {
    return readJson(fp);
  } catch {
    return null;
  }
}

function migrateDocumentMeta(docMetaIn, libMeta, itemId) {
  const docMeta = (docMetaIn && typeof docMetaIn === "object") ? { ...docMetaIn } : {};

  // Remove explicitly banned legacy keys in model files.
  delete docMeta.updated_at;
  delete docMeta.schema_version;

  // schema_uri is a strict const in schema v1.1.4.
  docMeta.schema_uri = SCHEMA_URI_V114;

  // Required fields - keep existing if valid, otherwise fill from _meta.json / defaults.
  docMeta.document_title = safeString(
    docMeta.document_title,
    safeString(libMeta?.title, `library:${itemId}`)
  );

  docMeta.document_summary = safeString(
    docMeta.document_summary,
    safeString(libMeta?.summary, "")
  );

  if (typeof docMeta.document_uuid !== "string" || !docMeta.document_uuid.trim()) {
    docMeta.document_uuid = crypto.randomUUID();
  }

  docMeta.version = safeString(docMeta.version, "1.0.0");

  const libTags = safeStringArray(libMeta?.tags);
  docMeta.tags =
    safeStringArray(docMeta.tags) ??
    (libTags && libTags.length ? libTags : null) ??
    (libMeta?.published === false
      ? ["m:draft", "s:__", "x:__"]
      : ["s:__", "m:__", "x:__"]); // schema requires >=1 tag

  docMeta.generator = safeString(docMeta.generator, "https://3dsl.jp/");
  docMeta.reference = safeString(docMeta.reference, safeString(libMeta?.id, ""));
  docMeta.coordinate_system = safeString(docMeta.coordinate_system, "Z+up/freeXY");
  docMeta.units = safeString(docMeta.units, "non_si:px");
  docMeta.i18n = safeString(docMeta.i18n, "ja");
  docMeta.author = safeString(docMeta.author, safeString(libMeta?.author, "q2t-project"));
  docMeta.creator_memo = safeString(docMeta.creator_memo, safeString(libMeta?.description, ""));

  // created_at / revised_at (required)
  const created = pickFirstIso(
    docMeta.created_at,
    libMeta?.created_at,
    docMeta.revised_at
  );
  if (!created) {
    // Never invent timestamps from filesystem state. If we can't infer from existing meta,
    // leave unchanged and let the user fill it explicitly.
    return { ...docMetaIn };
  }
  docMeta.created_at = created;

  const revised = pickFirstIso(
    docMeta.revised_at,
    libMeta?.updated_at,
    libMeta?.republished_at,
    libMeta?.published_at,
    libMeta?.created_at,
    docMeta.created_at
  );
  docMeta.revised_at = revised ?? docMeta.created_at;

  // Final cleanup: drop keys with `undefined` (JSON stringify skips, but keep explicit).
  for (const k of Object.keys(docMeta)) {
    if (docMeta[k] === undefined) delete docMeta[k];
  }

  return docMeta;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function listLibraryItemDirs() {
  if (!fs.existsSync(LIB_ROOT)) return [];
  return fs
    .readdirSync(LIB_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(LIB_ROOT, d.name));
}

function main() {
  const { dryRun, write } = parseArgs(process.argv);
  const dirs = listLibraryItemDirs();
  const touched = [];

  for (const dir of dirs) {
    const itemId = path.basename(dir);
    const modelFp = path.join(dir, "model.3dss.json");
    if (!fs.existsSync(modelFp)) continue;

    const model = readJson(modelFp);
    const libMeta = readMeta(dir);

    const before = model.document_meta;
    const after = migrateDocumentMeta(before, libMeta, itemId);
    if (!after) {
      // Could not infer required timestamps; leave file untouched.
      continue;
    }

    if (!deepEqual(before, after)) {
      model.document_meta = after;
      const createdAt = after?.created_at;
      console.log(`[migrate] ${itemId}\\model.3dss.json created_at=${createdAt}`);
      touched.push(modelFp);
      if (write && !dryRun) {
        writeJsonPretty(modelFp, model);
      }
    }
  }

  if (dryRun && !write) {
    console.log("[dry-run] completed");
  } else {
    console.log("[write] completed");
  }

  // Exit non-zero if nothing was changed? No. Keep it simple.
}

main();
