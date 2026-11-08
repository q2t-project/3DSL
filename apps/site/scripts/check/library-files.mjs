// Run the actual Library publisher with isolated author files. Fixtures stay
// outside the checkout and cannot enter a Pages deployment.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { createWorkPackage, parseWorkPackage, WORK_PACKAGE_MAX_BYTES } from '../../../reconstruction/ssot/modeler_app/runtime/workPackage.js';
import { buildReadModel } from '../../../reconstruction/ssot/contract_viewer/readModel.js';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const source = path.join(repo, 'packages/3dss-content');
const tmp = await mkdtemp(path.join(os.tmpdir(), '3dsl-library-files-'));
const content = path.join(tmp, 'content');
const item = path.join(content, 'library/26020401');
const out = path.join(content, 'dist/library/26020401');
const builder = path.join(content, 'scripts/build.mjs');
const archive = zipSync({ '../escape.txt': new TextEncoder().encode('fixture'), 'large.bin': new Uint8Array(WORK_PACKAGE_MAX_BYTES + 1) }, { level: 1 });
assert(archive.length < 100000);
const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>void 0</script></svg>';
const html = '<!doctype html><script>void 0</script>';
function build(error) {
  const result = spawnSync(process.execPath, [builder], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (!error) { assert.equal(result.status, 0, result.stderr); return; }
  assert.notEqual(result.status, 0, 'unsafe source should fail the build');
  assert.match(result.stderr, error);
}
try {
  await mkdir(path.dirname(builder), { recursive: true });
  await cp(path.join(source, 'scripts/build-3dss-content-dist.mjs'), builder);
  await mkdir(path.dirname(item), { recursive: true });
  await cp(path.join(source, 'library/26020401'), item, { recursive: true });
  await mkdir(path.join(content, 'scenes/default'), { recursive: true });
  await writeFile(path.join(content, 'scenes/default/default.3dss.json'), '{}');
  await mkdir(path.join(item, 'attachments/資料'), { recursive: true });
  await writeFile(path.join(item, 'attachments/資料/example.html'), html);
  await writeFile(path.join(item, 'attachments/資料/example.svg'), svg);
  await writeFile(path.join(item, 'attachments/資料/example.zip'), archive);
  await writeFile(path.join(item, 'assets/example.svg'), svg);
  build();
  assert.deepEqual((await readdir(path.join(out, 'attachments/資料'))).sort(), ['example.html','example.svg','example.zip']);
  assert.equal(await readFile(path.join(out,'attachments/資料/example.html'),'utf8'), html);
  assert.equal(await readFile(path.join(out,'attachments/資料/example.svg'),'utf8'), svg);
  assert((await readFile(path.join(out,'attachments/資料/example.zip'))).equals(archive));
  assert.equal(await readFile(path.join(out,'assets/example.svg'),'utf8'), svg);
  const all = await readdir(tmp, { recursive: true });
  assert(!all.some(p => ['escape.txt','large.bin'].includes(path.basename(p))), 'archive members never become files');

  const marker = path.join(tmp, 'outside.txt');
  await writeFile(marker, 'isolated private file');
  let checkedLinks = 0;
  const checkLink = async (entry, target, expected, type = 'file') => {
    try { await symlink(target, entry, type); } catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') {
        console.log('[check:library-files] SKIP link creation on this Windows host:', path.basename(entry));
        return;
      }
      throw error;
    }
    try { build(expected); } finally { await rm(entry); }
    checkedLinks++;
  };
  await checkLink(path.join(item,'attachments/資料/linked.txt'), marker, /link or special file/);
  await checkLink(path.join(item,'assets/missing.svg'), path.join(tmp,'missing'), /link or special file/);
  await rm(path.join(item, 'attachments'), { recursive: true });
  await checkLink(path.join(item,'attachments'), tmp, /Expected a regular directory/, 'dir');
  await rm(path.join(item, 'content.md'));
  await checkLink(path.join(item,'content.md'), marker, /Expected a regular file/);
  await checkLink(path.join(content,'library/26020402'), item, /Linked Library work directory/, 'dir');
  if (process.platform !== 'win32') {
    await writeFile(path.join(item,'assets','bad\\name.png'), 'fixture');
    build(/Invalid Library filename/);
    await rm(path.join(item,'assets','bad\\name.png'));
  }
  build();
  assert.equal(await readFile(marker,'utf8'), 'isolated private file');
  assert((await lstat(path.join(out,'model.3dss.json'))).isFile());

  const scene = { document_meta:{document_uuid:'fixture',title:'fixture'}, points:[], lines:[], aux:[] };
  const work = createWorkPackage({scene, attachments:{'資料/図.svg':svg,'docs/a.html':html}});
  assert.deepEqual(parseWorkPackage(JSON.stringify(work)).attachments, work.attachments);
  const read = buildReadModel(JSON.stringify(work));
  assert.deepEqual(Object.fromEntries(read.legacyInfo.attachments.map(a => [a.path,a.utf8])), work.attachments);
  for (const key of ['/x','../x','a/../x','a/./x','a//b','C:/x','a\\b','bad\0name']) {
    assert.throws(() => createWorkPackage({ scene, attachments:{[key]:html} }), /相対パス/);
  }
  assert.throws(() => buildReadModel(new TextDecoder().decode(archive)), Error);
  console.log(`[check:library-files] PASS real publisher, regular/nested files and identical opaque ZIP bytes; no expansion of oversized/traversal entries. Refused ${checkedLinks} link cases; safe retry, work JSON paths and text round-trip passed.`);
} finally {
  await rm(tmp, { recursive:true, force:true });
}
