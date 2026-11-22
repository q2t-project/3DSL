// Run without requesting Google: exercise the actual browser initializer with
// recording DOM stubs, including the forbidden paths that static SSR misses.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

const source = await readFile(new URL('../../src/lib/adsense.ts', import.meta.url), 'utf8');
async function compilePolicy(env) {
  const compiled = await transform(source, {
    loader: 'ts', format: 'cjs', target: 'es2022',
    define: { 'import.meta.env': JSON.stringify(env) },
  });
  const sandbox = { module: { exports: {} }, URL };
  vm.runInNewContext(compiled.code, sandbox);
  return sandbox.module.exports;
}

function page(href, { framed = false, eligible = true, visible = true, deferred = false, hasSlot = true } = {}) {
  const requests = [];
  const listeners = {};
  const scriptEvents = {};
  const reservation = new Set();
  let activeSlots = 0;
  let width = visible ? 300 : 0;
  let templatePresent = hasSlot;
  const template = {
    parentElement: {
      getBoundingClientRect: () => ({ width }),
      setAttribute: key => reservation.add(key),
      removeAttribute: key => reservation.delete(key),
    },
    hasAttribute: key => deferred && key === 'data-3dsl-ad-wait-for-library',
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
    createElement: () => ({
      setAttribute() {},
      addEventListener(name, callback) { scriptEvents[name] = callback; },
    }),
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
    get reserved() { return reservation.has('data-3dsl-ad-reserved'); },
    libraryLoaded() { scriptEvents.load?.(); },
    libraryFailed() { scriptEvents.error?.(); },
    reveal() { width = 300; listeners.resize?.(); },
  };
}

const cases = [
  ['concept allowed', '/concept', {}, true],
  ['public work allowed', '/library/26012301/', {}, true],
  ['academic work allowed', '/library/26112201/', {}, true],
  ['academic explore allowed', '/library/26112201/explore/', {}, true],
  ['non-academic explore excluded', '/library/26012301/explore/', {}, false],
  ['raw reader excluded', '/library/26112201/read/', {}, false],
  ['academic explore framed', '/library/26112201/explore/', { framed: true }, false],
  ['academic explore preview flag', '/library/26112201/explore/?swipe=1', {}, false],
  ['academic explore opt-out', '/library/26112201/explore/', { eligible: false }, false],
  ['academic explore preview origin', 'https://abc123.3dsl.pages.dev/library/26112201/explore/', {}, false],
  ['no configured slot', '/library/26112201/explore/', { hasSlot: false }, false],
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

const disabledPolicy = await compilePolicy({});
const enabledPolicy = await compilePolicy({ PUBLIC_ADSENSE_SERVING_ENABLED: 'true' });
const fallbackSlot = await compilePolicy({ PUBLIC_ADSENSE_SLOT_300x250: '12345' });
const dedicatedSlot = await compilePolicy({ PUBLIC_ADSENSE_SLOT_300x250: '12345', PUBLIC_ADSENSE_SLOT_GUIDED_READER: ' 67890 ' });
assert.equal(disabledPolicy.ADSENSE_SERVING_ENABLED, false, 'unset opt-in defaults OFF');
assert.equal(enabledPolicy.ADSENSE_SERVING_ENABLED, true, 'explicit opt-in enables the gate');
assert.equal(fallbackSlot.ADSENSE_SLOTS.slot_guided_reader, '12345', 'reader uses existing fixed unit by default');
assert.equal(dedicatedSlot.ADSENSE_SLOTS.slot_guided_reader, '67890', 'dedicated fixed reader unit takes precedence');

for (const [mode, policy, enabled] of [
  ['default OFF', disabledPolicy, false],
  ['explicit ON', enabledPolicy, true],
]) {
  for (const [label, path, options, eligible] of cases) {
    const allowed = enabled && eligible;
    const state = page(new URL(path, 'https://3dsl.jp').href, options);
    policy.initAdsense(state.doc, state.win);
    assert.equal(state.requests.length, allowed ? 1 : 0, `${mode} ${label}: script request`);
    assert.equal(state.activeSlots, allowed ? 1 : 0, `${mode} ${label}: live slot`);
    assert.equal(state.win.adsbygoogle?.length ?? 0, allowed ? 1 : 0, `${mode} ${label}: ad queue`);
    if (allowed) assert.match(state.requests[0], /^https:\/\/pagead2\.googlesyndication\.com\//);
  }
}

const responsive = page('https://3dsl.jp/concept', { visible: false });
enabledPolicy.initAdsense(responsive.doc, responsive.win);
assert.equal(responsive.activeSlots, 0, 'CSS-hidden slot is not requested');
assert.equal(responsive.requests.length, 0, 'no loader required while the only slot is hidden');
responsive.reveal();
responsive.reveal();
enabledPolicy.initAdsense(responsive.doc, responsive.win);
assert.equal(responsive.requests.length, 1, 'script requested once');
assert.equal(responsive.activeSlots, 1, 'responsive slot activated once');
assert.equal(responsive.win.adsbygoogle.length, 1, 'slot queued once');

const deferred = page('https://3dsl.jp/library/26112201/explore/', { deferred: true, visible: false });
enabledPolicy.initAdsense(deferred.doc, deferred.win);
assert.equal(deferred.reserved, false, 'a hidden manual slot cannot reserve space');
assert.equal(deferred.requests.length, 0, 'a hidden manual slot cannot fetch the library');
deferred.reveal();
assert.equal(deferred.reserved, true, 'reserve the final rail before queuing the ad');
assert.equal(deferred.activeSlots, 0, 'the creative is gated on the library loading');
assert.equal(deferred.requests.length, 1);
deferred.libraryLoaded();
deferred.reveal();
enabledPolicy.initAdsense(deferred.doc, deferred.win);
assert.equal(deferred.reserved, true, 'fill retains the same rail');
assert.equal(deferred.activeSlots, 1, 'activate one manual slot');
assert.equal(deferred.requests.length, 1, 'library requested once');
assert.equal(deferred.win.adsbygoogle.length, 1, 'manual slot queued once');

const blocked = page('https://3dsl.jp/library/26112201/', { deferred: true });
enabledPolicy.initAdsense(blocked.doc, blocked.win);
assert.equal(blocked.reserved, true);
blocked.libraryFailed();
blocked.reveal();
assert.equal(blocked.reserved, false, 'library failure collapses the rail');
assert.equal(blocked.activeSlots, 0);
assert.equal(blocked.win.adsbygoogle?.length ?? 0, 0);
console.log(`[check:adsense-policy] PASS: default OFF and explicit ON × ${cases.length} routing/query/frame cases + responsive/idempotence; no network used`);
