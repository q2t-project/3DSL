import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, cp, mkdir, rm } from 'node:fs/promises';

// Sync SSOT 3dss-content -> apps/site/public/3dss
// - copies: fixtures/, sample/, canonical/, 3dss-prep/, library/ (if present)
// - does NOT touch: public/3dss/3dss/release (schemas sync owns it)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const srcRoot = path.join(repoRoot, 'packages/3dss-content');
const dstRoot = path.join(repoRoot, 'apps/site/public/3dss');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(srcRoot))) {
  console.log('[sync] 3dss-content: skipped (no SSOT)');
  process.exit(0);
}

await mkdir(dstRoot, { recursive: true });

const entries = ['fixtures', 'sample', 'canonical', '3dss-prep', 'library'];
for (const name of entries) {
  const src = path.join(srcRoot, name);
  if (!(await exists(src))) continue;

  const dst = path.join(dstRoot, name);
  await rm(dst, { recursive: true, force: true });

  // library は公開したくない内部ドキュメント/管理ファイルを除外する
  // - _docs/ や _meta.json 等（"_" 始まり）
  // - *.md
  if (name === 'library') {
    const libRoot = src;
    const filter = (p) => {
      const base = path.basename(p);

      // dotfile は除外（任意）
      if (base.startsWith('.')) return false;

      // md は除外（_docs/_README.md など）
      if (base.toLowerCase().endsWith('.md')) return false;

      // どこかの階層が "_" 始まりなら丸ごと除外
      const rel = path.relative(libRoot, p);
      if (rel && rel !== '') {
        const parts = rel.split(path.sep);
        if (parts.some((s) => s.startsWith('_'))) return false;
      }
      return true;
    };
    await cp(src, dst, { recursive: true, filter });
  } else {
    await cp(src, dst, { recursive: true });
  }
}

console.log('[sync] 3dss-content -> site/public OK');
