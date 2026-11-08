// Rebuild the standalone reader/editor's browser validator from the site lockfile.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { bundleNotices } from '../lib/bundle-notices.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const destination = path.resolve(site, '../reconstruction/ssot/vendor/ajv');
const result = await build({
  absWorkingDir: site,
  stdin: {
    contents: 'import Ajv2020 from "ajv/dist/2020.js";\nimport addFormats from "ajv-formats";\nexport default function createAjv(options = {}) { return addFormats(new Ajv2020(options)); }\n',
    resolveDir: site,
    sourcefile: 'reconstruction-ajv.js',
  },
  bundle: true, minify: true, platform: 'browser', target: ['es2019'],
  format: 'esm', write: false, metafile: true,
});
const bundle = result.outputFiles[0].contents;
const { packages, notices } = await bundleNotices(result.metafile, site);
const manifest = JSON.stringify({
  generator: 'apps/site/scripts/tool/build-reconstruction-ajv.mjs',
  install: 'npm ci --prefix apps/site',
  packages,
  bundle_sha256: createHash('sha256').update(bundle).digest('hex'),
}, null, 2) + '\n';
const outputs = [['dist/ajv.js', bundle], ['versions.json', manifest], ...notices];
for (const [name, contents] of outputs) {
  const file = path.join(destination, name);
  if (process.argv.includes('--check')) {
    const actual = await fs.readFile(file);
    if (!actual.equals(Buffer.from(contents))) throw new Error(`Stale reconstruction validator: ${name}; run npm run build:reconstruction-ajv`);
  } else {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents);
  }
}
console.log(`[reconstruction-ajv] ${process.argv.includes('--check') ? 'checked' : 'built'} ${JSON.stringify(packages)}`);
