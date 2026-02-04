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
  // _meta.json is a ledger only.
  // It must NOT contain display metadata or timeline fields that belong to model.document_meta.
  const warns = [];
  const errs = [];

  const issue = (kind, msg) => {
    if (kind === 'error') errs.push(msg);
    else warns.push(msg);
  };

  if (!isPlainObject(meta)) {
    errs.push(`_meta.json must be an object`);
    return { warns, errs };
  }

  // Allowlist (top-level). Unknown keys are rejected to prevent drift.
  const ALLOW = new Set([
    'published', 'published_at', 'republished_at',
    'description',
    'seo',
    'rights',
    'references',
    'attachments',
    'entry_points',
    'pairs',
    'related',
    'page',
    'recommended',
    'hidden',
    'provenance',
    'links',
    'authors',
  ]);

  const FORBIDDEN = new Set(['title', 'summary', 'tags', 'created_at', 'updated_at']);

  for (const k of Object.keys(meta)) {
    if (FORBIDDEN.has(k)) {
      issue('error', `forbidden key in _meta.json: ${k}`);
      continue;
    }
    if (!ALLOW.has(k)) {
      issue('error', `unknown key in _meta.json: ${k}`);
    }
  }

  // published
  if (typeof meta.published !== 'boolean') {
    issue(policy === 'error' ? 'error' : 'warn', `missing or invalid key: published (boolean)`);
  }

  const isPublished = (meta.published === true);

  // published_at / republished_at rules
  if (isPublished) {
    if (typeof meta.published_at !== 'string' || !meta.published_at) {
      issue('error', `published:true requires published_at (timestamp_utc)`);
    } else if (!isDateish(meta.published_at)) {
      issue('error', `published_at is not a parseable date: ${meta.published_at}`);
    }

    if (typeof meta.republished_at !== 'string' || !meta.republished_at) {
      issue('error', `published:true requires republished_at (timestamp_utc)`);
    } else if (!isDateish(meta.republished_at)) {
      issue('error', `republished_at is not a parseable date: ${meta.republished_at}`);
    }
  } else {
    // For unpublished items, forbid null-ish date keys (keep ledger clean)
    if (meta.published_at != null) {
      issue('warn', `unpublished item should omit published_at (do not set null)`);
    }
    if (meta.republished_at != null) {
      issue('warn', `unpublished item should omit republished_at (do not set null)`);
    }
  }

  // Optional shapes
  if (meta.seo != null && !isPlainObject(meta.seo)) {
    issue('warn', `seo should be an object when present`);
  }
  if (meta.entry_points != null && !Array.isArray(meta.entry_points)) {
    issue('warn', `entry_points should be an array when present`);
  }
  if (meta.pairs != null && !Array.isArray(meta.pairs)) {
    issue('warn', `pairs should be an array when present`);
  }
  if (meta.related != null && !Array.isArray(meta.related)) {
    issue('warn', `related should be an array when present`);
  }
  if (meta.references != null && !Array.isArray(meta.references)) {
    issue('warn', `references should be an array when present`);
  }

  return { warns, errs };
}

function validateDocumentMeta(dm, isPublished) {
  const warns = [];
  const errs = [];

  if (!isPlainObject(dm)) {
    errs.push(`model.3dss.json missing document_meta`);
    return { warns, errs };
  }

  const req = (cond, msg) => {
    if (cond) return;
    if (isPublished) errs.push(msg);
    else warns.push(msg);
  };

  // Fixed field names (no fallback):
  // - document_title
  // - document_summary
  // - tags
  // - created_at
  // - revised_at
  req(typeof dm.document_title === 'string' && dm.document_title.trim().length > 0, `missing or invalid document_meta.document_title (string, non-empty)`);
  req(typeof dm.document_summary === 'string', `missing or invalid document_meta.document_summary (string)`);
  req(Array.isArray(dm.tags) && dm.tags.every((t) => typeof t === 'string'), `missing or invalid document_meta.tags (string[])`);
  req(typeof dm.created_at === 'string' && dm.created_at && isDateish(dm.created_at), `missing or invalid document_meta.created_at (timestamp_utc)`);
  req(typeof dm.revised_at === 'string' && dm.revised_at && isDateish(dm.revised_at), `missing or invalid document_meta.revised_at (timestamp_utc)`);

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

    const isPublished = (meta && typeof meta === 'object' && meta.published === true);

    // Meta (ledger) validation
    const { warns, errs } = validateMeta(meta, policy);
    for (const w of warns) {
      console.warn(`[warn] ${id}: ${w}`);
      warnCount++;
    }
    for (const er of errs) {
      console.error(`[error] ${id}: ${er}`);
      errCount++;
    }

    // Model document_meta contract (SSOT for display + timeline)
    const dmCheck = validateDocumentMeta(dm, isPublished);
    for (const w of dmCheck.warns) {
      console.warn(`[warn] ${id}: ${w}`);
      warnCount++;
    }
    for (const er of dmCheck.errs) {
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
