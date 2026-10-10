// Run without requesting Google: exercise the actual browser initializer with
// recording DOM stubs, including the forbidden paths that static SSR misses.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

const source = await readFile(new URL('../../src/lib/adsense.ts', import.meta.url), 'utf8');
const compiled = await transform(source, {
  loader: 'ts', format: 'cjs', target: 'es2022',
  define: { 'import.meta.env': '{}' },
});
const sandbox = { module: { exports: {} }, URL };
vm.runInNewContext(compiled.code, sandbox);
const { initAdsense } = sandbox.module.exports;

function page(href, { framed = false, eligible = true, visible = true } = {}) {
  const requests = [];
  const listeners = {};
  let activeSlots = 0;
  let width = visible ? 300 : 0;
  let templatePresent = true;
  const template = {
    parentElement: { getBoundingClientRect: () => ({ width }) },
    content: { cloneNode: () => ({}) },
    replaceWith() { activeSlots++; templatePresent = false; },
  };
  const doc = {
    readyState: 'complete',
    querySelector(selector) {
      if (selector.startsWith('meta')) return {
        getAttribute: () => eligible ? '1' : '0',
      };
      return requests.length ? {} : null;
    },
    querySelectorAll: () => templatePresent ? [template] : [],
    createElement: () => ({ setAttribute() {} }),
    head: { appendChild(script) { requests.push(script.src); } },
  };
  const win = {
    location: { href },
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  win.self = win;
  win.top = framed ? {} : win;
  return {
    doc, win, requests,
    get activeSlots() { return activeSlots; },
    reveal() { width = 300; listeners.resize?.(); },
  };
}

const cases = [
  ['concept allowed', '/concept', {}, true],
  ['public work allowed', '/library/26012201/', {}, true],
  ['home excluded', '/', {}, false],
  ['library index excluded', '/library/', {}, false],
  ['docs excluded', '/docs/ops/reconstruction_preview_release', {}, false],
  ['policy excluded', '/policy', {}, false],
  ['contact excluded', '/contact', {}, false],
  ['viewer excluded', '/app/viewer?from=library', {}, false],
  ['modeler excluded', '/modeler_app/index.html', {}, false],
  ['reconstruction excluded', '/preview-reconstruction/', {}, false],
  ['noads=1', '/concept?noads=1', {}, false],
  ['noads=true', '/concept?noads=true', {}, false],
  ['noads=yes', '/concept?noads=YES', {}, false],
  ['embed=true', '/concept?embed=true', {}, false],
  ['swipe=1', '/concept?swipe=1', {}, false],
  ['false flag preserved', '/concept?noads=0', {}, true],
  ['iframe without query', '/concept', { framed: true }, false],
  ['hidden work excluded', '/library/26020401/', { eligible: false }, false],
  ['Cloudflare preview', 'https://abc123.3dsl.pages.dev/concept', {}, false],
  ['Pages alias', 'https://3dsl.pages.dev/concept', {}, false],
  ['localhost', 'http://localhost:4321/concept', {}, false],
];

for (const [label, path, options, allowed] of cases) {
  const state = page(new URL(path, 'https://3dsl.jp').href, options);
  initAdsense(state.doc, state.win);
  assert.equal(state.requests.length, allowed ? 1 : 0, `${label}: script request`);
  assert.equal(state.activeSlots, allowed ? 1 : 0, `${label}: live slot`);
  assert.equal(state.win.adsbygoogle?.length ?? 0, allowed ? 1 : 0, `${label}: ad queue`);
  if (allowed) assert.match(state.requests[0], /^https:\/\/pagead2\.googlesyndication\.com\//);
}

const responsive = page('https://3dsl.jp/concept', { visible: false });
initAdsense(responsive.doc, responsive.win);
assert.equal(responsive.activeSlots, 0, 'CSS-hidden slot is not requested');
responsive.reveal();
responsive.reveal();
initAdsense(responsive.doc, responsive.win);
assert.equal(responsive.requests.length, 1, 'script requested once');
assert.equal(responsive.activeSlots, 1, 'responsive slot activated once');
assert.equal(responsive.win.adsbygoogle.length, 1, 'slot queued once');
console.log(`[check:adsense-policy] PASS: ${cases.length} routing/query/frame cases + responsive/idempotence; no network used`);
