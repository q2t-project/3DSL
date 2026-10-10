import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

// Keep the accepted reconstruction snapshot isolated from the production
// Viewer/Modeler SSOT while it is reviewed in a Pages preview deployment.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, '../..');
const source = path.resolve(siteRoot, '../../apps/reconstruction/ssot');
const target = path.join(siteRoot, 'public/preview-reconstruction');
const routes = /(?<![\p{L}\p{N}_.-])\/(viewer|modeler_app|contract_viewer|shared|models|schemas|vendor|RECONSTRUCTION\.html|OPEN_MODELS\.html)(?=\/|["'`?&#]|$)/gu;

await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });

async function rewrite(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) {
      await rewrite(file);
    } else if (item.isFile() && /\.(?:html|js|css)$/.test(item.name)) {
      const original = await readFile(file, 'utf8');
      const updated = original.replace(routes, '/preview-reconstruction/$1');
      if (updated !== original) await writeFile(file, updated);
    }
  }
}

await rewrite(target);
console.log('[sync] reconstruction preview -> site/public/preview-reconstruction');
