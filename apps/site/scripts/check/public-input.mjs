// Exercise shipped source with frame/renderer boundary doubles and real streams.
// No external requests; VM checks do not claim Android or WebGL coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';
import { attachEntryInput, returnDestination, modelFromSearch } from '../../../reconstruction/ssot/contract_viewer/entryInput.js';
import { WORK_PACKAGE_MAX_BYTES as MAX } from '../../../reconstruction/ssot/modeler_app/runtime/workPackage.js';
const root = new URL('../../../../', import.meta.url);
const read = file => fs.readFile(new URL(file, root), 'utf8');
const page = await read('apps/site/src/pages/library/[slug].astro');
const link = page.slice(page.indexOf('function publicLink('), page.indexOf('function listFilesPublicDir('));
const markdown = page.slice(page.indexOf('    function escapeHtml('), page.indexOf('    const html0 ='));
const ctx = vm.createContext({ URL });
vm.runInContext((await transform(link + markdown + '\nglobalThis.render = mdToHtml; globalThis.link = publicLink;', { loader: 'ts' })).code, ctx);
for (const bad of ['javascript:alert%281%29', 'JaVaScRiPt:alert%281%29', 'java\tscript:alert%281%29', 'data:text/html,hello', 'vbscript:msgbox', 'file:///tmp/x', 'https://user:pass@example.test/x']) {
  assert.equal(ctx.link(bad), '', bad);
  assert(ctx.render(`[label](${bad})`).includes('href="#"'), bad);
}
const injected = ctx.render('[label](/safe" onmouseover="bad)');
assert(injected.includes('href="/safe&quot; onmouseover=&quot;bad"'), 'quotes stay inside href');
assert(!injected.includes('href="/safe" onmouseover='));
assert(ctx.render('<img src=x onerror=bad>').includes('&lt;img'), 'raw HTML stays text');
assert(ctx.render('[label](javascript&#58;bad)').includes('javascript&amp;#58;bad'));
for (const good of ['/library/26010501/', './attachments/example.pdf', '#scope', '?page=2', 'https://example.test/a?q=1&x=2']) assert.equal(ctx.link(good), good);
assert(ctx.render('[PDF](./attachments/example.pdf)').includes('href="./attachments/example.pdf"'));
assert(ctx.render('## 見出し\n- 項目\n---\n```\n<a>\n```').includes('<pre><code>&lt;a&gt;</code></pre>'));
for (const field of ['a', 'r', 't']) assert(page.includes(`href={publicLink(${field}.url) || "#"}`));

for (const file of ['apps/modeler/ssot/modelerHostBoot.js', 'apps/reconstruction/ssot/modeler_app/modelerHostBoot.js', 'apps/viewer/ssot/peekBoot.js']) {
  const source = await read(file);
  const listener = source.match(/window\.addEventListener\("message", \(ev\) => \{[\s\S]*?\n\s*\}\);/)?.[0];
  assert(listener, file);
  let received, reads = 0;
  const replies = [], parent = { postMessage: (...args) => replies.push(args) };
  const win = { parent, location: { origin: 'https://site.test' }, addEventListener: (_, fn) => { received = fn; } };
  vm.runInNewContext(listener, { window: win, getSnapshot: () => { reads++; return { local: 'model' }; } });
  const data = { type: '3DSL_GET_DEBUG_POSE', requestId: 'fixture' };
  received({ origin: 'https://other.test', source: parent, data });
  received({ origin: 'https://site.test', source: { postMessage() { throw new Error('unexpected reply'); } }, data });
  assert.equal(reads, 0); assert.equal(replies.length, 0);
  received({ origin: 'https://site.test', source: parent, data });
  assert.equal(reads, 1); assert.equal(replies.length, 1); assert.equal(replies[0][1], 'https://site.test');
  win.parent = win;
  received({ origin: 'https://site.test', source: win, data });
  assert.equal(reads, 1);
}
const compare = await read('apps/site/src/pages/app/compare.astro');
const comparePart = compare.slice(compare.indexOf('        const pending ='), compare.indexOf('        const snapshotBoth ='));
let receive;
const timers = [], sent = [];
const compareWin = { location: { origin: 'https://site.test' }, addEventListener: (_, fn) => { receive = fn; } };
const compareCtx = vm.createContext({ window: compareWin, setTimeout: fn => timers.push(fn) });
vm.runInContext((await transform(comparePart + '\nglobalThis.requestSnapshot = requestSnapshot;', { loader: 'ts' })).code, compareCtx);
const frame = { postMessage: (...args) => sent.push(args) };
let resolved = false;
const reply = compareCtx.requestSnapshot(frame, []).then(value => { resolved = true; return value; });
const message = { type: '3DSL_DEBUG_POSE', requestId: sent[0][0].requestId, snapshot: 'accepted' };
assert.equal(sent[0][1], 'https://site.test');
receive({ origin: 'https://foreign.test', source: frame, data: message });
receive({ origin: 'https://site.test', source: {}, data: message });
await Promise.resolve(); assert.equal(resolved, false);
receive({ origin: 'https://site.test', source: frame, data: message });
assert.equal((await reply).snapshot, 'accepted');

const messages = [], errors = [], opens = [], requests = [];
let messageListener;
const parent = { postMessage: (...args) => messages.push(args) };
const win = { parent, location: new URL('https://site.test/reader/?title=fixture'), addEventListener: (_, fn) => { messageListener = fn; }, removeEventListener() {} };
let responseFactory = () => new Response('{"title":"valid"}');
const input = attachEntryInput({ win,
  fetchModel: async (url, options) => { requests.push({ url, options }); return responseFactory(); },
  openText: async (...args) => { opens.push(args); return { ok: true }; },
  reportError: error => errors.push(error), readDebugPose: () => null,
});
for (const bad of ['javascript:bad', 'data:text/plain,hello', 'file:///tmp/x', 'https://u:p@site.test/private']) assert.equal((await input.openUrl(bad)).ok, false);
assert.equal(requests.length, 0);
await messageListener({ source: parent, origin: 'https://other.test', data: { type: '3dsl.viewer.loadUrl', modelUrl: '/model.json' } });
await messageListener({ source: {}, origin: win.location.origin, data: { type: '3dsl.viewer.loadUrl', modelUrl: '/model.json' } });
assert.equal(requests.length, 0);
assert.equal((await input.openUrl('/model.json?token=secret#fragment')).ok, true);
assert.equal(opens.at(-1)[2], 'https://site.test/model.json');
assert.equal(requests.at(-1).options.credentials, 'same-origin');
assert.equal(requests.at(-1).options.referrerPolicy, 'no-referrer');
assert.equal((await input.openUrl('https://public.test/cors.json')).ok, true);
function stream(chunks, headers = {}) {
  let reads = 0, cancelled = false;
  const body = new ReadableStream({ pull(controller) {
    reads++;
    if (chunks.length) controller.enqueue(chunks.shift()); else controller.close();
  }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
  return { response: new Response(body, { headers }), stats: () => ({ reads, cancelled }) };
}
let fixture = stream([new Uint8Array([1])], { 'Content-Length': String(MAX + 1) });
responseFactory = () => fixture.response;
const before = opens.length;
assert.equal((await input.openUrl('/too-large.json')).ok, false);
assert.deepEqual(fixture.stats(), { reads: 0, cancelled: true });
for (const headers of [{}, { 'Content-Length': '1' }]) {
  fixture = stream([new Uint8Array(MAX), new Uint8Array(1), new Uint8Array(3)], headers);
  assert.equal((await input.openUrl('/chunked.json')).ok, false);
  assert.deepEqual(fixture.stats(), { reads: 2, cancelled: true });
}
assert.equal(opens.length, before, 'oversize cannot replace the current document');
fixture = stream([new Uint8Array(MAX).fill(32)]);
assert.equal((await input.openUrl('/boundary.json')).ok, true);
assert.equal(opens.at(-1)[0].length, MAX);
const utf8 = new TextEncoder().encode('\uFEFFあいう');
fixture = stream([utf8.slice(0, 4), utf8.slice(4, 5), utf8.slice(5)]);
assert.equal((await input.openUrl('/utf8.json')).ok, true); assert.equal(opens.at(-1)[0], 'あいう');
let earlyResolve;
responseFactory = () => new Promise(resolve => { earlyResolve = resolve; });
const early = input.openUrl('/early-cancel.json');
input.cancel();
fixture = stream([new Uint8Array([1])]);
earlyResolve(fixture.response);
assert.equal((await early).cancelled, true);
assert.deepEqual(fixture.stats(), { reads: 0, cancelled: true });
let started, didStart = new Promise(resolve => { started = resolve; }), cancelled = false;
responseFactory = () => new Response(new ReadableStream({ pull() { started(); }, cancel() { cancelled = true; } }, { highWaterMark: 0 }));
const old = input.openUrl('/pending.json');
await didStart;
responseFactory = () => new Response('new document');
assert.equal((await input.openUrl('/replacement.json')).ok, true);
assert.equal((await old).cancelled, true); assert(cancelled); assert.equal(opens.at(-1)[0], 'new document');
responseFactory = () => { throw new Error('network failure'); };
const current = opens.length;
assert.equal((await input.openUrl('/failed.json')).ok, false); assert.equal(opens.length, current);
responseFactory = () => new Response('recovered');
assert.equal((await input.openUrl('/recovered.json')).ok, true);
input.dispose();
for (const raw of ['https://foreign.test/x', '//foreign.test/x', 'javascript:bad', 'data:text/plain,x']) assert.equal(returnDestination(new URLSearchParams({ return: raw }), win.location), null);
assert.equal(returnDestination(new URLSearchParams({ return: '/library/', scroll: '12.8' }), win.location), 'https://site.test/library/?scroll=12');
for (const key of ['model', 'open', 'work', 'scene', 'src']) assert.equal(modelFromSearch(new URLSearchParams({ [key]: '/model.json' })), '/model.json');
assert.equal(modelFromSearch(new URLSearchParams({ src: 'library' })), null);
assert(messages.every(([, target]) => target === win.location.origin));
console.log('[check:public-input] PASS Markdown URL/attribute encoding; shipped debug/compare source+origin; HTTP/S, 32 MiB header/chunks, UTF-8, abort/retry/document retention; return URLs. VM/stream fixtures, no external requests.');
