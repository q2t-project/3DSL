#!/usr/bin/env node
// packages/3dss-content/scripts/check-library.mjs
//
// Check 3DSS Library item folders for:
// - ID format
// - required files exist
// - JSON is parseable
// - _meta.json minimal keys (staged: warn -> error)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LIBRARY_DIR = path.join(ROOT, 'library');

const ID_RE = /^\d{6}[0-9a-z]{2}$/;

function readJson(p) {
  const s = fs.readFileSync(p, 'utf8');
  return JSON.parse(s);
}

function getFlagValue(args, name) {
  const key = `--${name}`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === key) return args[i + 1] ?? null;
    if (a.startsWith(`${key}=`)) return a.slice(key.length + 1) || null;
  }
  return null;
}

function hasFlag(args, name) {
  const key = `--${name}`;
  return args.some((a) => a === key || a.startsWith(`${key}=`));
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isDateish(v) {
  if (typeof v !== 'string') return false;
  const t = Date.parse(v);
  return Number.isFinite(t);
}

function validateMeta(meta, policy) {
  // policy: "warn" | "error"  (controls severity for minimal-key violations)
  const warns = [];
  const errs = [];

  const issue = (kind, msg) => {
    if (kind === 'error') errs.push(msg);
    else warns.push(msg);
  };

  // In strict (policy=error), we still want drafts to be iteratable.
  // If an item explicitly marks itself unpublished, downgrade minimal-key
  // violations to warnings.
  const pub = isPlainObject(meta) ? meta.published : null;
  const isUnpublished = (pub === false || pub === 0 || pub === 'false' || pub === '0');
  const minPolicy = isUnpublished ? 'warn' : policy;

  const min = (condition, msg) => {
    if (condition) return;
    issue(minPolicy === 'error' ? 'error' : 'warn', msg);
  };

  if (!isPlainObject(meta)) {
    errs.push(`_meta.json must be an object`);
    return { warns, errs };
  }

  // Minimal keys (staged: warn -> error; unpublished => warn)
  // NOTE: title/created_at are NOT library-meta concerns in v1.1.4+.
  // - title: comes from model.3dss.json document_meta.title
  // - created/revised: belong to document_meta
  min(typeof meta.summary === 'string', `missing or invalid key: summary (string)`);
  min(Array.isArray(meta.tags), `missing or invalid key: tags (array)`);
  min(typeof meta.published === 'boolean', `missing or invalid key: published (boolean)`);

  // Extra type checks (non-fatal in warn mode unless policy=error and they are minimal keys)
  if (Array.isArray(meta.tags)) {
    for (let i = 0; i < meta.tags.length; i++) {
      if (typeof meta.tags[i] !== 'string') {
        issue('warn', `tags[${i}] should be string`);
      }
    }
  }

  // Recommended keys (warn only)
  if (typeof meta.description !== 'string') {
    warns.push(`recommended: description (string) for SEO / long summary`);
  }

  // Optional structured keys (warn only when shape is wrong)
  if (meta.seo != null && !isPlainObject(meta.seo)) {
    warns.push(`seo should be an object when present`);
  }
  if (meta.entry_points != null && !Array.isArray(meta.entry_points)) {
    warns.push(`entry_points should be an array when present`);
  }
  if (meta.pairs != null && !Array.isArray(meta.pairs)) {
    warns.push(`pairs should be an array when present`);
  }
  if (meta.related != null && !Array.isArray(meta.related)) {
    warns.push(`related should be an array when present`);
  }

  // Legacy hints (warn only)
  if (meta.summary == null && typeof meta.description === 'string') {
    warns.push(`legacy: description is present but summary is missing (add summary for list UI)`);
  }
  if (typeof meta.og_image === 'string' && meta.og_image && typeof meta.seo === 'object' && meta.seo && meta.seo.og_image == null) {
    // ok. no warning.
  }

  const published = meta.published !== false;

  // updated_at is deprecated in v1.1.4 migration; treat as an error to prevent contamination.
  if (typeof meta.updated_at !== "undefined") {
    issue("error", `deprecated key present: updated_at (use published_at / republished_at)`);
  }

  if (published) {
    min(typeof meta.published_at === "string" && !!meta.published_at.trim(), "missing key: published_at (string)");
    min(typeof meta.republished_at === "string" && !!meta.republished_at.trim(), "missing key: republished_at (string)");

    if (typeof meta.published_at === "string" && meta.published_at && !isDateish(meta.published_at)) {
      issue("warn", `published_at is not a parseable date: ${meta.published_at}`);
    }
    if (typeof meta.republished_at === "string" && meta.republished_at && !isDateish(meta.republished_at)) {
      issue("warn", `republished_at is not a parseable date: ${meta.republished_at}`);
    }
  }


  return { warns, errs };
}

function main() {
  const args = process.argv.slice(2);

  const policyFromFlag = getFlagValue(args, 'policy');
  const policy = (
    (hasFlag(args, 'strict') ? 'error' : null) ||
    (hasFlag(args, 'warn') ? 'warn' : null) ||
    (policyFromFlag ? String(policyFromFlag).toLowerCase() : null) ||
    (process.env.LIBRARY_META_POLICY ? String(process.env.LIBRARY_META_POLICY).toLowerCase() : 'warn')
  );

  if (policy !== 'warn' && policy !== 'error') {
    throw new Error(`invalid policy: ${policy} (expected 'warn' or 'error')`);
  }

  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`missing library dir: ${LIBRARY_DIR}`);
  }

  const dirs = fs.readdirSync(LIBRARY_DIR, { withFileTypes: true });
  const items = dirs
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .filter((name) => ID_RE.test(name))
    .sort();

  let warnCount = 0;
  let errCount = 0;

  for (const id of items) {
    const base = path.join(LIBRARY_DIR, id);
    const metaPath = path.join(base, '_meta.json');
    const modelPath = path.join(base, 'model.3dss.json');

    if (!fs.existsSync(metaPath)) {
      console.error(`[error] ${id}: missing _meta.json`);
      errCount++;
      continue;
    }
    if (!fs.existsSync(modelPath)) {
      console.error(`[error] ${id}: missing model.3dss.json`);
      errCount++;
      continue;
    }

    let meta = null;
    let model = null;
    try {
      meta = readJson(metaPath);
    } catch (e) {
      console.error(`[error] ${id}: _meta.json parse failed: ${String(e?.message ?? e)}`);
      errCount++;
      continue;
    }
    try {
      model = readJson(modelPath);
    } catch (e) {
      console.error(`[error] ${id}: model.3dss.json parse failed: ${String(e?.message ?? e)}`);
      errCount++;
      continue;
    }

    
    // Model basic sanity (non-optional for runtime)
    const dm = model?.document_meta ?? null;
    if (!isPlainObject(dm)) {
      console.error(`[error] ${id}: model.3dss.json missing document_meta`);
      errCount++;
      continue;
    }

    // Meta staged validation
    const { warns, errs } = validateMeta(meta, policy);
    for (const w of warns) {
      console.warn(`[warn] ${id}: ${w}`);
      warnCount++;
    }
    for (const er of errs) {
      console.error(`[error] ${id}: ${er}`);
      errCount++;
    }
  }

  const n = items.length;
  const summary = `checked ${n} item(s) (warn=${warnCount}, error=${errCount}, policy=${policy})`;
  if (errCount > 0) {
    console.error(`[ng] ${summary}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[ok] ${summary}`);
}

main();
