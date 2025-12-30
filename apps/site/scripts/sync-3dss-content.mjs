import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, cp, mkdir, rm } from 'node:fs/promises';

// Sync SSOT 3dss-content -> apps/site/public/3dss
// - copies: fixtures/, sample/, canonical/, 3dss-prep/ (if present)
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

const entries = ['fixtures', 'sample', 'canonical', '3dss-prep'];
for (const name of entries) {
  const src = path.join(srcRoot, name);
  if (!(await exists(src))) continue;

  const dst = path.join(dstRoot, name);
  await rm(dst, { recursive: true, force: true });
  await cp(src, dst, { recursive: true });
}

console.log('[sync] 3dss-content -> site/public OK');
