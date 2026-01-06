#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LIBRARY_DIR = path.join(ROOT, 'library');

function readJson(file) {
  const txt = fs.readFileSync(file, 'utf8');
  return JSON.parse(txt);
}

function fail(msg) {
  console.error(`[NG] ${msg}`);
  process.exitCode = 1;
}

function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`missing library dir: ${LIBRARY_DIR}`);
  }

  const dirs = fs.readdirSync(LIBRARY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort();

  if (dirs.length === 0) {
    console.log('[ok] no library items');
    return;
  }

  for (const id of dirs) {
    if (!/^[0-9]{8}$/.test(id)) {
      fail(`invalid id folder name: ${id} (expected 8 digits)`);
      continue;
    }

    const dir = path.join(LIBRARY_DIR, id);
    const metaFile = path.join(dir, '_meta.json');
    const modelFile = path.join(dir, 'model.3dss.json');

    if (!fs.existsSync(metaFile)) fail(`${id}: missing _meta.json`);
    if (!fs.existsSync(modelFile)) fail(`${id}: missing model.3dss.json`);

    // Parse JSON (syntax errors are common)
    try {
      const meta = readJson(metaFile);
      if (meta && typeof meta !== 'object') fail(`${id}: _meta.json must be an object`);
    } catch (e) {
      fail(`${id}: _meta.json JSON parse failed: ${e?.message ?? e}`);
    }

    try {
      const model = readJson(modelFile);
      const doc = model?.document_meta;
      if (!doc || typeof doc !== 'object') {
        fail(`${id}: model.3dss.json missing document_meta`);
      }
    } catch (e) {
      fail(`${id}: model.3dss.json JSON parse failed: ${e?.message ?? e}`);
    }
  }

  if (process.exitCode !== 1) {
    console.log(`[ok] checked ${dirs.length} item(s)`);
  }
}

main();
