import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

const site = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(site, 'dist');
const read = file => readFile(path.join(dist, file));
const digest = data => createHash('sha256').update(data).digest('hex');
for (const pkg of ['ajv', 'ajv-formats']) {
  const folder = `vendor/${pkg}`;
  const record = JSON.parse(await read(`${folder}/versions.json`));
  assert.equal(digest(await read(`${folder}/${record.bundle}`)), record.bundle_sha256);
  for (const [name, version] of Object.entries(record.packages)) {
    const source = path.join(site, 'node_modules', name);
    assert.equal(JSON.parse(await readFile(path.join(source, 'package.json'))).version, version);
    const originals = (await readdir(source)).filter(file => /^(?:licen[cs]e|notice|copying)(?:\.|$)/i.test(file));
    assert(originals.length > 0);
    for (const original of originals) {
      const notice = `${name.replaceAll('/', '-')}-${original}`;
      assert(record.notices.includes(notice));
      assert((await read(`${folder}/${notice}`)).equals(await readFile(path.join(source, original))));
    }
  }
}
// Run the shipped ESM plugin itself with a real validator.
const source = await read('vendor/ajv-formats/dist/ajv-formats.bundle.js');
const { default: formats } = await import(`data:text/javascript;base64,${source.toString('base64')}`);
const { default: Ajv } = await import('ajv');
const date = formats(new Ajv()).compile({ type: 'string', format: 'date-time' });
assert(date('2026-11-08T12:00:00Z') && !date('invalid'));

const folder = 'vendor/three/examples/jsm/libs';
const compression = JSON.parse(await read(`${folder}/fflate-version.json`));
assert.equal(digest(await read(`${folder}/${compression.bundle}`)), compression.sha256);
assert(compression.consumers.includes('loaders/KMZLoader.js'));
for (const consumer of compression.consumers) {
  assert((await read(`vendor/three/examples/jsm/${consumer}`)).includes(`/libs/${compression.bundle}`));
}
const legacy = pathToFileURL(path.join(dist, folder, 'fflate.module.js')).href;
const patched = await import(legacy);
const original = await import(pathToFileURL(path.resolve(site, '../../packages/vendor/three/examples/jsm/libs/fflate.module.js')));
for (const name of Object.keys(original)) assert(name in patched, `fflate export retained: ${name}`);
const { zipSync, unzipSync, strToU8 } = patched;
const bytes = strToU8('3DSL / 日本語');
const filename = '作品/日本語.txt';
const archive = zipSync({ [filename]: bytes });
assert.deepEqual(unzipSync(archive)[filename], bytes);

// A ZIP64 central directory entry that omits its required extra field used to hang.
// Run the malformed input off-thread so a regression cannot stall the whole build.
const eocd = archive.length - 22;
const malformed = new Uint8Array(archive.length + 76);
malformed.set(archive.subarray(0, eocd)); malformed.set(archive.subarray(eocd), eocd + 76);
const view = new DataView(malformed.buffer);
const directory = new DataView(archive.buffer, archive.byteOffset).getUint32(eocd + 16, true);
view.setUint32(directory + 20, 0xffffffff, true);
view.setUint32(eocd, 0x06064b50, true); view.setUint32(eocd + 4, 44, true);
view.setUint32(eocd + 32, 1, true); view.setUint32(eocd + 48, directory, true);
view.setUint32(eocd + 56, 0x07064b50, true); view.setUint32(eocd + 64, eocd, true);
const worker = new Worker(`const { parentPort, workerData } = require('node:worker_threads');
  import(workerData.module).then(({unzipSync}) => {
    try { unzipSync(workerData.input); parentPort.postMessage('accepted'); }
    catch (error) { parentPort.postMessage(error.code); }
  });`, { eval: true, workerData: { module: legacy, input: malformed } });
try {
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('ZIP64 parsing stalled')), 5000);
    worker.once('error', error => { clearTimeout(timeout); reject(error); });
    worker.once('message', value => { clearTimeout(timeout); resolve(value); });
  });
  assert.equal(result, 13, 'malformed ZIP64 is rejected');
} finally { await worker.terminate(); }
console.log(`[check:public-vendor] PASS shipped notices, Ajv format validation, fflate ${compression.version} normal ZIP and malformed ZIP64, ${compression.consumers.length} consumers.`);
