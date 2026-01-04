import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, rename, readdir, readFile, writeFile } from 'node:fs/promises';

// Rename a Library item id (folder name) and keep related SSOTs consistent.
// - packages/3dss-content/library/<id>/
// - apps/site/public/library/editorial.json
// - apps/site/public/library/snapshots/<id>.*
//
// Usage:
//   npm --prefix apps/site run rename:library-id -- --from <old> --to <new>

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const LIB_ROOT = path.join(repoRoot, 'packages/3dss-content', 'library');
const EDITORIAL_JSON = path.join(repoRoot, 'apps/site/public/library/editorial.json');
const SNAPSHOT_DIR = path.join(repoRoot, 'apps/site/public/library/snapshots');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const out = { from: '', to: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from' && argv[i + 1]) out.from = argv[++i];
    else if (a === '--to' && argv[i + 1]) out.to = argv[++i];
  }
  return out;
}

async function patchEditorial(from, to) {
  if (!(await exists(EDITORIAL_JSON))) return;
  const raw = await readFile(EDITORIAL_JSON, 'utf8');
  const j = JSON.parse(raw);

  const rep = (arr) => (Array.isArray(arr) ? arr.map((x) => (x === from ? to : x)) : arr);
  j.recommended = rep(j.recommended);
  j.hidden = rep(j.hidden);

  if (j.overrides && typeof j.overrides === 'object') {
    if (j.overrides[from] !== undefined) {
      j.overrides[to] = j.overrides[from];
      delete j.overrides[from];
    }
  }

  await writeFile(EDITORIAL_JSON, JSON.stringify(j, null, 2) + '\n', 'utf8');
}

async function renameSnapshots(from, to) {
  if (!(await exists(SNAPSHOT_DIR))) return;
  const entries = await readdir(SNAPSHOT_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.startsWith(from + '.')) continue;
    const ext = e.name.slice(from.length);
    await rename(path.join(SNAPSHOT_DIR, e.name), path.join(SNAPSHOT_DIR, to + ext));
  }
}

async function main() {
  const { from, to } = parseArgs(process.argv);
  if (!from || !to) throw new Error('Usage: --from <old> --to <new>');

  const src = path.join(LIB_ROOT, from);
  const dst = path.join(LIB_ROOT, to);
  if (!(await exists(src))) throw new Error(`missing: ${path.relative(repoRoot, src)}`);
  if (await exists(dst)) throw new Error(`already exists: ${path.relative(repoRoot, dst)}`);

  await rename(src, dst);
  await patchEditorial(from, to);
  await renameSnapshots(from, to);

  console.log(`[rename] ${from} -> ${to}`);
}

main().catch((e) => {
  console.error('[rename] library-id: FAILED');
  console.error(e);
  process.exit(1);
});
