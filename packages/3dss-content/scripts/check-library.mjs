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

function validateMeta(meta, dm, policy) {
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
  min(typeof meta.published === 'boolean', `missing or invalid key: published (boolean)`);

  // When published=true, require published_at/republished_at (dates for list sort + label)
  if (meta.published === true) {
    min(isDateish(meta.published_at), `missing or invalid key: published_at (ISO 8601 string) when published=true`);
    min(isDateish(meta.republished_at), `missing or invalid key: republished_at (ISO 8601 string) when published=true`);
  }

  // Forbid drift-prone display metadata in _meta.json (SSOT is model.document_meta)
  if (Object.prototype.hasOwnProperty.call(meta, 'title')) {
    issue(minPolicy === 'error' ? 'error' : 'warn', `forbidden key: title (SSOT is model.document_meta)`);
  }
  if (Object.prototype.hasOwnProperty.call(meta, 'summary')) {
    issue(minPolicy === 'error' ? 'error' : 'warn', `forbidden key: summary (SSOT is model.document_meta)`);
  }
  if (Object.prototype.hasOwnProperty.call(meta, 'tags')) {
    issue(minPolicy === 'error' ? 'error' : 'warn', `forbidden key: tags (SSOT is model.document_meta)`);
  }

  // Model display metadata must exist when published=true (SSOT)
  const title = (dm && (dm.document_title ?? dm.title));
  const summary = (dm && (dm.document_summary ?? dm.summary));
  const tags = (dm && dm.tags);

  if (meta.published === true) {
    min(typeof title === 'string' && title.trim().length > 0, `model.document_meta missing title (document_title/title) when published=true`);
    min(typeof summary === 'string', `model.document_meta missing summary (document_summary/summary) when published=true`);
    min(Array.isArray(tags), `model.document_meta missing tags (array) when published=true`);
  } else {
    // drafts: warn only
    if (!(typeof title === 'string' && title.trim().length > 0)) warns.push(`draft: model.document_meta title is missing (document_title/title)`);
    if (!(typeof summary === 'string')) warns.push(`draft: model.document_meta summary is missing (document_summary/summary)`);
    if (!(Array.isArray(tags))) warns.push(`draft: model.document_meta tags is missing (array)`);
  }

  // NOTE: updated_at was intentionally removed from the 3DSS schema.
  // Keep it optional here; build/index generation can derive a value when needed.

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
    const { warns, errs } = validateMeta(meta, dm, policy);
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
