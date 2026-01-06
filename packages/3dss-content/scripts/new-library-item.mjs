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

function pickNextId(prefix) {
  const dirs = fs.readdirSync(LIBRARY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);

  const re = new RegExp(`^${prefix}(\\d{2})$`);
  let max = 0;
  for (const name of dirs) {
    const m = name.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  if (next > 99) {
    throw new Error(`too many items for prefix ${prefix} (00-99 exhausted)`);
  }
  return `${prefix}${pad2(next)}`;
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`missing library dir: ${LIBRARY_DIR}`);
  }

  const args = process.argv.slice(2);
  const givenId = args[0] && !args[0].startsWith('--') ? args[0] : null;
  const title = args[1] ?? (givenId ? givenId : 'untitled');

  const id = givenId ?? pickNextId(todayPrefixYYMMDD());
  if (!/^[0-9]{8}$/.test(id)) {
    throw new Error(`invalid id: ${id} (expected 8 digits, e.g. 26010503)`);
  }

  const dir = path.join(LIBRARY_DIR, id);
  if (fs.existsSync(dir)) {
    throw new Error(`already exists: ${dir}`);
  }
  fs.mkdirSync(dir, { recursive: true });

  const now = new Date().toISOString();

  // required file: _meta.json (build script assumes it exists)
  const meta = {
    title,
    summary: '',
    tags: [],
    pairs: [],
    // optional SEO overrides (fallbacks exist)
    seo_title: '',
    seo_description: '',
    og_image: '',
    // editorial flags (optional)
    recommended: false,
    hidden: false,
    created_at: now,
    updated_at: now,
  };
  writeJson(path.join(dir, '_meta.json'), meta);

  const model = {
    document_meta: {
      document_title: title,
      document_summary: '',
      document_uuid: crypto.randomUUID(),
      schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.1',
      author: process.env.USERNAME || process.env.USER || 'unknown',
      version: '1.0.0',
    },
    points: [],
    lines: [],
    aux: [],
    frames: [],
  };
  writeJson(path.join(dir, 'model.3dss.json'), model);

  console.log(`[ok] created ${id}`);
  console.log(` - ${path.relative(process.cwd(), dir)}`);
}

main();
