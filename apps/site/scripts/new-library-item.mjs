import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

// Create a new Library item folder under packages/3dss-content/library/
// ID rule (private 운영, conflict 無):
// - YYMMDD + xx(base36 2 chars, 0-9a-z)
// - folder name is the public id (used by /app/viewer?id=...)
// - model file is: <id>/model.3dss.json
//
// Usage:
//   npm --prefix apps/site run new:library-item
//   npm --prefix apps/site run new:library-item -- --title "..." --summary "..."

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const LIB_ROOT = path.join(repoRoot, 'packages/3dss-content', 'library');
const SCHEMA_JSON = path.join(repoRoot, 'apps/site/public/3dss/3dss/release/3DSS.schema.json');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function yymmddTokyo() {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `${get('year')}${get('month')}${get('day')}`;
}

function parseArgs(argv) {
  const out = { title: '(untitled)', summary: '', dry: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') out.dry = true;
    else if (a === '--title' && argv[i + 1]) out.title = argv[++i];
    else if (a === '--summary' && argv[i + 1]) out.summary = argv[++i];
  }
  return out;
}

async function loadSchemaUri() {
  try {
    if (!(await exists(SCHEMA_JSON))) return 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.1';
    const j = JSON.parse(await readFile(SCHEMA_JSON, 'utf8'));
    const id = (j?.$id ?? '').toString();
    const anchor = (j?.$anchor ?? '').toString();
    if (!id) return 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.1';
    if (anchor) {
      // $id in this repo ends with '#'
      if (id.endsWith('#')) return id + anchor;
      return id + '#' + anchor;
    }
    return id;
  } catch {
    return 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.1';
  }
}

async function nextId(prefix) {
  const entries = (await exists(LIB_ROOT)) ? await readdir(LIB_ROOT, { withFileTypes: true }) : [];
  const re = new RegExp(`^${prefix}[0-9a-z]{2}$`);
  let max = -1;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!re.test(e.name)) continue;
    const suf = e.name.slice(-2);
    const n = parseInt(suf, 36);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  if (next >= 36 * 36) throw new Error(`suffix overflow for ${prefix} (>= 1296 items/day)`);
  const suf = next.toString(36).padStart(2, '0');
  return prefix + suf;
}

async function main() {
  const { title, summary, dry } = parseArgs(process.argv);

  const prefix = yymmddTokyo();
  const id = await nextId(prefix);

  const dir = path.join(LIB_ROOT, id);
  const modelPath = path.join(dir, 'model.3dss.json');

  if (dry) {
    console.log(id);
    return;
  }

  await mkdir(dir, { recursive: true });

  const schema_uri = await loadSchemaUri();
  const doc = {
    document_meta: {
      document_title: title,
      document_summary: summary,
      document_uuid: crypto.randomUUID(),
      schema_uri,
      author: 'vrrrm',
      version: '1.0.0',
    },
    points: [],
    lines: [],
    aux: [],
    frames: [],
  };

  await writeFile(modelPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');

  console.log(id);
  console.log(path.relative(repoRoot, modelPath));
}

main().catch((e) => {
  console.error('[new] library-item: FAILED');
  console.error(e);
  process.exit(1);
});
