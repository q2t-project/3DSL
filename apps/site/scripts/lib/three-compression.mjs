import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// three r181 bundled fflate 0.8.2. Keep its public API and pick the version from the site lockfile.
export async function syncThreeCompression(site, vendor) {
  const installed = path.join(site, 'node_modules/fflate');
  const { version } = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  const examples = path.join(vendor, 'three/examples/jsm');
  const libs = path.join(examples, 'libs');
  const bundle = `fflate-${version}.module.js`;
  const bytes = await readFile(path.join(installed, 'esm/browser.js'));
  await writeFile(path.join(libs, bundle), bytes);
  await writeFile(path.join(libs, 'fflate.module.js'), `export * from './${bundle}';\n`);
  await copyFile(path.join(installed, 'LICENSE'), path.join(libs, 'fflate-LICENSE.txt'));

  // New module graphs bypass the earlier immutable URL; old callers keep a working entry.
  const consumers = [];
  for (const relative of (await readdir(examples, { recursive: true })).sort()) {
    if (!relative.endsWith('.js') || relative.split(path.sep)[0] === 'libs') continue;
    const file = path.join(examples, relative);
    const original = await readFile(file, 'utf8');
    const updated = original.replace(/(["'])([^"'\n]*\/libs\/)fflate\.module\.js\1/g,
      (_, quote, prefix) => `${quote}${prefix}${bundle}${quote}`);
    if (updated === original) continue;
    await writeFile(file, updated);
    consumers.push(relative.split(path.sep).join('/'));
  }
  const record = { version, bundle, sha256: createHash('sha256').update(bytes).digest('hex'), consumers };
  await writeFile(path.join(libs, 'fflate-version.json'), JSON.stringify(record, null, 2) + '\n');
}
