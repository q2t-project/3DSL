// scripts/migrate-3dss-v114.mjs
// Migrate legacy 3DSS models to schema release v1.1.4.
//
// Design goals (SSOT-aligned):
// - Never delete unrelated metadata fields (avoid repo-wide contamination).
// - Only *add* missing required fields and *pin* schema_uri to v1.1.4.
// - If an irrecoverable required field is missing (e.g. document_uuid), print NG and skip write.
//
// SSOT references:
// - packages/schemas/release/v1.1.4/3DSS_spec.md
// - packages/schemas/release/v1.1.4/3DSS.schema.json

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve("packages/3dss-content/library");
const DRY_RUN = process.argv.includes("--dry-run");

// v1.1.4 schema_uri is pinned to the release path and fragment.
const SCHEMA_URI_V114 =
  "https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4";

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

function writeJson(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function isIsoDate(s) {
  const t = Date.parse(String(s));
  return Number.isFinite(t);
}

function gitIsoDate(args) {
  // Returns ISO string or null.
  try {
    const out = execFileSync("git", args, { encoding: "utf-8" }).trim();
    if (!out) return null;
    const t = Date.parse(out);
    if (!Number.isFinite(t)) return null;
    return new Date(t).toISOString();
  } catch {
    return null;
  }
}

function deriveCreatedAt(modelPath) {
  // Prefer git first-add date, then file mtime.
  const first = gitIsoDate([
    "log",
    "--diff-filter=A",
    "--follow",
    "--format=%aI",
    "--",
    modelPath,
  ]);
  if (first) return first;

  try {
    const st = fs.statSync(modelPath);
    return new Date(st.mtimeMs).toISOString();
  } catch {
    return null;
  }
}

function deriveRevisedAt(modelPath) {
  // Prefer git last-commit date, then file mtime.
  const last = gitIsoDate(["log", "-1", "--format=%aI", "--", modelPath]);
  if (last) return last;

  try {
    const st = fs.statSync(modelPath);
    return new Date(st.mtimeMs).toISOString();
  } catch {
    return null;
  }
}

function normalizeDocumentMeta(docMeta, modelPath) {
  const dm = (docMeta && typeof docMeta === "object") ? { ...docMeta } : {};

  // Pin schema_uri (do not invent alternate URIs).
  dm.schema_uri = SCHEMA_URI_V114;

  // created_at
  if (!isIsoDate(dm.created_at)) {
    const ca = deriveCreatedAt(modelPath);
    if (ca) dm.created_at = ca;
  }

  // revised_at
  if (!isIsoDate(dm.revised_at)) {
    const ra = deriveRevisedAt(modelPath) ?? dm.created_at;
    if (ra) dm.revised_at = ra;
  }

  // Optional but required-by-schema fields: if missing, keep missing and let validator flag.
  return dm;
}

function validateRequired(dm) {
  // Required in schema (meta/document):
  // document_title, document_uuid, created_at, revised_at, schema_uri, author, version
  const missing = [];
  if (!dm.document_title) missing.push("document_title");
  if (!dm.document_uuid) missing.push("document_uuid");
  if (!isIsoDate(dm.created_at)) missing.push("created_at");
  if (!isIsoDate(dm.revised_at)) missing.push("revised_at");
  if (!dm.schema_uri) missing.push("schema_uri");
  if (!dm.author) missing.push("author");
  if (!dm.version) missing.push("version");
  return missing;
}

function walkLibraryDirs(rootDir) {
  const out = [];
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(rootDir, ent.name);
    const fp = path.join(dir, "model.3dss.json");
    if (fs.existsSync(fp)) out.push(fp);
  }
  return out;
}

const files = walkLibraryDirs(ROOT);

let changed = 0;
let skipped = 0;
let ng = 0;

for (const fp of files) {
  const rel = path.relative(process.cwd(), fp);
  const obj = readJson(fp);
  const before = JSON.stringify(obj);

  // Preserve everything, only normalize document_meta.
  const next = { ...obj };
  next.document_meta = normalizeDocumentMeta(obj.document_meta, rel);

  // Remove legacy key if present at root.
  if (Object.prototype.hasOwnProperty.call(next, "schema_version")) {
    delete next.schema_version;
  }

  const missing = validateRequired(next.document_meta);
  if (missing.length) {
    ng++;
    console.log(`[NG] ${rel} missing required: ${missing.join(", ")}`);
    continue;
  }

  const after = JSON.stringify(next);
  if (after === before) {
    skipped++;
    continue;
  }

  changed++;
  console.log(
    `[migrate] ${path.basename(path.dirname(fp))} created_at=${next.document_meta.created_at}`
  );

  if (!DRY_RUN) writeJson(fp, next);
}

if (DRY_RUN) {
  console.log(`[dry-run] completed (changed=${changed}, skipped=${skipped}, ng=${ng})`);
} else {
  console.log(`[write] completed (changed=${changed}, skipped=${skipped}, ng=${ng})`);
}
