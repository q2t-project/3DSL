// SSOT check: Host (Astro) viewer pages must reference viewer UI assets via /viewer/assets/*.
// - Forbid /assets/icons/* and /assets/logo/3DSD-viewer.svg in viewer routes.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'src/pages/viewer.astro',
  'src/pages/viewer/index.astro',
].map((p) => path.join(ROOT, p));

const forbidden = [
  { re: /\b(?:src|href)\s*=\s*"\/assets\/icons\//g, msg: 'Use /viewer/assets/icons/... instead of /assets/icons/...' },
  { re: /\b(?:src|href)\s*=\s*"\.{1,2}\/assets\/icons\//g, msg: 'Use /viewer/assets/icons/... (no relative path)'} ,
  { re: /\b(?:src|href)\s*=\s*"\/assets\/logo\/3DSD-viewer\.svg/g, msg: 'Use /viewer/assets/logo/3DSD-viewer.svg instead of /assets/logo/3DSD-viewer.svg' },
  { re: /\b(?:src|href)\s*=\s*"\.{1,2}\/assets\/logo\/3DSD-viewer\.svg/g, msg: 'Use /viewer/assets/logo/3DSD-viewer.svg (no relative path)' },
];

let ok = true;
let checked = 0;

for (const file of TARGETS) {
  if (!fs.existsSync(file)) continue;
  checked++;
  const text = fs.readFileSync(file, 'utf8');

  for (const f of forbidden) {
    f.re.lastIndex = 0;
    let m;
    while ((m = f.re.exec(text))) {
      ok = false;
      const idx = m.index;
      const before = text.slice(0, idx);
      const line = before.split(/\r?\n/).length;
      console.error(`[host-asset-paths] ${path.relative(ROOT, file)}:${line}: ${f.msg}`);
    }
  }
}

if (checked === 0) {
  console.warn('[host-asset-paths] skipped (no viewer.astro found)');
  process.exit(0);
}

if (!ok) {
  console.error('[host-asset-paths] FAIL');
  process.exit(1);
}

console.log('[host-asset-paths] OK');
