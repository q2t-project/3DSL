import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const TARGET_ROOT = path.join(ROOT, 'packages', '3dss-content');

const FROM = 'https://q2t-project.github.io/3dsl/schemas/release/v1.1.3/3DSS.schema.json';
const TO = 'https://q2t-project.github.io/3dsl/schemas/release/v1.1.3/3DSS.schema.json#v1.1.3';

const EXCLUDE_DIR_NAMES = new Set([
  'dist',
  '_backup_3dss-content',
  '_fixtures_backup_20260112',
]);

function shouldSkipDir(dirPath) {
  const base = path.basename(dirPath);
  if (EXCLUDE_DIR_NAMES.has(base)) return true;
  if (base.startsWith('_backup_')) return true;
  return false;
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldSkipDir(p)) continue;
      walk(p, out);
    } else if (e.isFile()) {
      if (e.name.endsWith('.3dss.json')) out.push(p);
    }
  }
}

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return { raw, json: JSON.parse(raw) };
}

function writeJsonPretty(p, json) {
  const s = JSON.stringify(json, null, 2) + '\n';
  fs.writeFileSync(p, s, 'utf8');
}

const files = [];
walk(TARGET_ROOT, files);

let scanned = 0;
let changed = 0;
const changedFiles = [];
const parseErrors = [];

for (const f of files) {
  scanned++;
  let data;
  try {
    data = readJson(f);
  } catch (err) {
    parseErrors.push({ file: f, error: String(err) });
    continue;
  }

  const j = data.json;
  const meta = j?.document_meta;
  if (!meta || typeof meta !== 'object') continue;

  if (meta.schema_uri === FROM) {
    meta.schema_uri = TO;
    writeJsonPretty(f, j);
    changed++;
    changedFiles.push(path.relative(ROOT, f).replaceAll('\\', '/'));
  }
}

const report = {
  scanned,
  changed,
  parseErrors: parseErrors.length,
  changedFiles,
  parseErrorFiles: parseErrors.map((e) => path.relative(ROOT, e.file).replaceAll('\\', '/')),
};

fs.writeFileSync(path.join(ROOT, 'scripts', 'migrate', 'fix-3dss-schema-uri-1_1_3.report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('[fix-schema-uri] scanned=' + scanned);
console.log('[fix-schema-uri] changed=' + changed);
console.log('[fix-schema-uri] parseErrors=' + parseErrors.length);
