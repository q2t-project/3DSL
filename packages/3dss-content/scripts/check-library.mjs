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


function validateDocumentMeta(dm, policy, id) {
  const warns = [];
  const errs = [];

  const issue = (kind, msg) => {
    if (kind === 'error') errs.push(msg);
    else warns.push(msg);
  };

  const min = (condition, msg) => {
    if (condition) return;
    issue(policy === 'error' ? 'error' : 'warn', msg);
  };

  if (!isPlainObject(dm)) {
    errs.push(`model.document_meta must be an object`);
    return { warns, errs };
  }

  const title = (typeof dm.document_title === 'string' && dm.document_title.trim().length > 0)
    ? dm.document_title
    : ((typeof dm.title === 'string' && dm.title.trim().length > 0) ? dm.title : null);

    const summary = (typeof dm.document_summary === 'string')
    ? dm.document_summary
    : ((typeof dm.summary === 'string') ? dm.summary : null);


  min(Boolean(title), `missing document_meta title: document_title or title (non-empty string)`);
  min(summary !== null, `missing document_meta summary: document_summary or summary (string)`);
  min(Array.isArray(dm.tags), `missing or invalid document_meta.tags (array)`);

  // created/revised are required for stable ordering and display (SSOT)
  min(typeof dm.created_at === 'string', `missing or invalid document_meta.created_at (string, ISO8601)`);
  min(typeof dm.revised_at === 'string', `missing or invalid document_meta.revised_at (string, ISO8601)`);

  // If tags exists, ensure elements are strings.
  if (Array.isArray(dm.tags)) {
    for (let i = 0; i < dm.tags.length; i++) {
      if (typeof dm.tags[i] !== 'string') {
        min(false, `invalid document_meta.tags[${i}] (string)`);
        break;
      }
    }
  }

  return { warns, errs };
}

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
  // policy: "warn" | "error"
  const warns = [];
  const errs = [];

  const issue = (kind, msg) => {
    if (kind === 'error') errs.push(msg);
    else warns.push(msg);
  };

  const min = (condition, msg) => {
    if (condition) return;
    issue(policy === 'error' ? 'error' : 'warn', msg);
  };

  if (!isPlainObject(meta)) {
    errs.push(`_meta.json must be an object`);
    return { warns, errs };
  }

  // Mechanically reject SSOT-contaminating keys.
  const forbiddenKeys = new Set(['title', 'summary', 'tags', 'created_at', 'updated_at']);
  for (const k of Object.keys(meta)) {
    if (forbiddenKeys.has(k)) {
      errs.push(`forbidden key in _meta.json: ${k} (SSOT is model.document_meta)`);
    }
  }

  // Allow-list (ledger-only). Unknown keys are rejected to prevent drift.
  const allowedKeys = new Set([
    'published', 'published_at', 'republished_at',
    'description', 'hidden', 'recommended',
    'seo', 'authors', 'rights', 'references',
    'provenance', 'links', 'page',
    'entry_points', 'pairs', 'related'
  ]);
  for (const k of Object.keys(meta)) {
    if (!allowedKeys.has(k)) {
      errs.push(`unknown key in _meta.json: ${k}`);
    }
  }

  // published flag
  min(typeof meta.published === 'boolean', `missing or invalid key: published (boolean)`);

  // published_at / republished_at rules
  const isPublished = meta.published === true;
  if (isPublished) {
    min(typeof meta.published_at === 'string', `missing or invalid key: published_at (string, ISO8601)`);
    min(typeof meta.republished_at === 'string', `missing or invalid key: republished_at (string, ISO8601)`);
  } else {
    // When unpublished, these should generally be absent (not null).
    if ('published_at' in meta) issue('warn', `unpublished item should omit key: published_at`);
    if ('republished_at' in meta) issue('warn', `unpublished item should omit key: republished_at`);
    if (meta.published_at === null) issue('error', `published_at must not be null (omit the key)`);
    if (meta.republished_at === null) issue('error', `republished_at must not be null (omit the key)`);
  }

  // Optional type checks (ledger fields)
  if ('description' in meta) min(typeof meta.description === 'string', `invalid key: description (string)`);
  if ('hidden' in meta) min(typeof meta.hidden === 'boolean', `invalid key: hidden (boolean)`);
  if ('recommended' in meta) min(typeof meta.recommended === 'boolean', `invalid key: recommended (boolean)`);
  if ('seo' in meta) min(isPlainObject(meta.seo), `invalid key: seo (object)`);
  if ('authors' in meta) min(Array.isArray(meta.authors), `invalid key: authors (array)`);
  if ('rights' in meta) min(isPlainObject(meta.rights), `invalid key: rights (object)`);
  if ('references' in meta) min(Array.isArray(meta.references), `invalid key: references (array)`);
  if ('provenance' in meta) min(isPlainObject(meta.provenance), `invalid key: provenance (object)`);
  if ('links' in meta) min(isPlainObject(meta.links), `invalid key: links (object)`);
  if ('page' in meta) min(isPlainObject(meta.page), `invalid key: page (object)`);
  if ('entry_points' in meta) min(Array.isArray(meta.entry_points), `invalid key: entry_points (array)`);
  if ('pairs' in meta) min(Array.isArray(meta.pairs), `invalid key: pairs (array)`);
  if ('related' in meta) min(Array.isArray(meta.related), `invalid key: related (array)`);

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


    // document_meta contract (SSOT for title/summary/tags/created/revised)
    const dmCheck = validateDocumentMeta(dm, policy, id);
    for (const w of dmCheck.warns) console.warn(`[warn] ${id}: ${w}`);
    for (const e of dmCheck.errs) { console.error(`[error] ${id}: ${e}`); errCount++; }
    if (dmCheck.errs.length > 0) continue;

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
