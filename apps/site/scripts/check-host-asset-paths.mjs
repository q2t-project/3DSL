// SSOT check: Host (Astro) viewer page must reference viewer assets via /viewer/* only.
// - Disallow /assets/* and ../assets/* within the viewer host page(s).
//
// NOTE:
// Viewer host route was moved to /app/viewer (src/pages/app/viewer.astro).
// Keep legacy targets too, so refactors don't silently disable this check.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const TARGETS = [
  // current
  'src/pages/app/viewer.astro',
  'src/pages/app/viewer/index.astro',

  // legacy (keep for safety)
  'src/pages/viewer.astro',
  'src/pages/viewer/index.astro',
].map((p) => path.join(ROOT, p));

const forbidden = [
  { re: /\b(?:src|href)\s*=\s*"\/assets\//g, msg: 'Use /viewer/assets/... instead of /assets/...' },
  { re: /\b(?:src|href)\s*=\s*"\.\.\/assets\//g, msg: 'Use /viewer/assets/... instead of ../assets/...' },
  { re: /\b(?:src|href)\s*=\s*"\.\/assets\//g, msg: 'Use /viewer/assets/... instead of ./assets/...' },
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
  console.warn('[host-asset-paths] skipped (no viewer host page found)');
  process.exit(0);
}

if (!ok) {
  console.error('[host-asset-paths] FAIL');
  process.exit(1);
}

console.log('[host-asset-paths] OK');
