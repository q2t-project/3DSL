// Guardrail: pages should not embed full <html>/<body>/<head> unless explicitly allowed.
//
// Motivation: raw HTML pages bypass Layout and tend to break shared styling, metadata,
// and build-time conventions. Allow only for standalone app shells.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, '..', '..');
const pagesRoot = path.resolve(siteRoot, 'src', 'pages');

// Allow full-html pages only under app/ (standalone apps) and a small set of exceptions.
const allowDirPrefixes = [
  path.resolve(pagesRoot, 'app') + path.sep,
];
const allowFiles = new Set([
  path.resolve(pagesRoot, '404.astro'),
]);

const re = /<(html|head|body)\b/i;

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(abs, out);
    } else if (e.isFile() && abs.endsWith('.astro')) {
      out.push(abs);
    }
  }
  return out;
}

function isAllowed(absPath) {
  if (allowFiles.has(absPath)) return true;
  for (const prefix of allowDirPrefixes) {
    if (absPath.startsWith(prefix)) return true;
  }
  return false;
}

const files = await walk(pagesRoot);
const offenders = [];

for (const fp of files) {
  if (isAllowed(fp)) continue;
  const src = await fs.readFile(fp, 'utf-8');
  if (re.test(src)) {
    offenders.push(path.relative(siteRoot, fp));
  }
}

if (offenders.length) {
  console.error('[check:pages:no-raw-html] Raw <html>/<head>/<body> found in these pages (not allowed):');
  for (const o of offenders) console.error('  - ' + o);
  console.error('');
  console.error('Fix: use Layout.astro and move page content into <Layout>...</Layout>.');
  process.exit(1);
}

console.log('[check:pages:no-raw-html] OK');
