#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LIBRARY_DIR = path.join(ROOT, 'library');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayPrefixYYMMDD() {
  const d = new Date();
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yy}${mm}${dd}`;
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

function pickNextId(prefix) {
  const dirs = fs.readdirSync(LIBRARY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);

  const re = new RegExp(`^${prefix}([0-9a-z]{2})$`);
  let max = 0; // keep 01-start semantics (max defaults to 0 -> next=1)
  for (const name of dirs) {
    const m = name.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 36);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  if (next > 36 * 36 - 1) {
    throw new Error(`too many items for prefix ${prefix} (00-zz exhausted)`);
  }
  return `${prefix}${String(next.toString(36)).padStart(2, '0')}`;
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`missing library dir: ${LIBRARY_DIR}`);
  }

  const args = process.argv.slice(2);

  const idFromFlag = getFlagValue(args, 'id');
  const titleFromFlag = getFlagValue(args, 'title');

  const givenId = idFromFlag ?? (args[0] && !args[0].startsWith('--') ? args[0] : null);
  const title = titleFromFlag ?? args[1] ?? (givenId ? givenId : 'untitled');

  const rawId = givenId ? String(givenId).trim() : null;
  const id = String(rawId ?? pickNextId(todayPrefixYYMMDD())).toLowerCase();
  if (rawId && rawId !== id) {
    console.warn(`[warn] normalized id to lowercase: ${rawId} -> ${id}`);
  }
  if (!/^\d{6}[0-9a-z]{2}$/.test(id)) {
    throw new Error(`invalid id: ${id} (expected YYMMDDxx, e.g. 26010501 or 2601050a)`);
  }

  const dir = path.join(LIBRARY_DIR, id);
  if (fs.existsSync(dir)) {
    throw new Error(`already exists: ${dir}`);
  }
  fs.mkdirSync(dir, { recursive: true });

  const now = new Date().toISOString();

  // required file: _meta.json
  // NOTE: keys here are aligned with build-3dss-content-dist.mjs expectations (meta.seo.* supported)
  const meta = {
    // Ledger-only: do NOT put title/summary/tags/created/updated here.
    // Core display fields are SSOT in model.3dss.json document_meta.
    description: '',
    published: false,
    // editorial flags (optional)
    recommended: false,
    hidden: false,
    seo: {
      title: '',
      description: '',
      og_image: '',
    },
    authors: [
      { name: 'q2t project', role: 'author', url: '' },
    ],
    rights: null,
    references: [],
    links: { canonical: '', repo: '', discussion: '' },
    provenance: {
      schema_uri: 'https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4',
      tools: [],
      generation_note: '',
    },
    entry_points: [],
    pairs: [],
    related: [],
  };
  writeJson(path.join(dir, '_meta.json'), meta);

  const model = {
    document_meta: {
      document_title: title,
      document_summary: '',
      tags: [],
      created_at: now,
      revised_at: now,
      document_uuid: crypto.randomUUID(),
      schema_uri: 'https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4',
      author: process.env.USERNAME || process.env.USER || 'unknown',
      version: '1.0.0',
    },
    points: [],
    lines: [],
    aux: [],
  };
  writeJson(path.join(dir, 'model.3dss.json'), model);

  console.log(`[ok] created ${id}`);
  console.log(` - ${path.relative(process.cwd(), dir)}`);
}

main();

