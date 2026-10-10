// Run Layout's actual touch handlers against a small DOM/event simulation.
// Iframes are recorded objects only; no browser or network requests are used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const layout = await readFile(new URL('../../src/layouts/Layout.astro', import.meta.url), 'utf8');
const contact = await readFile(new URL('../../src/pages/contact.astro', import.meta.url), 'utf8');
const script = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(text => text.includes('const ROUTES ='));
assert(script, 'Layout swipe handler exists');
assert.match(layout, /<header\b[^>]*\bdata-swipe-ignore(?:\s|>)/, 'header includes navbar in ignored region');
assert.match(layout, /<footer\b[^>]*\bdata-swipe-ignore(?:\s|>)/, 'footer horizontal scrolling is protected');
assert.match(contact, /<section\b[^>]*\bdata-swipe-ignore(?:\s|>)/, 'whole Contact section is protected');

function element(tag = 'DIV', parentElement = null, ignored = false) {
  return {
    tagName: tag, parentElement, ignored,
    isContentEditable: parentElement?.isContentEditable ?? false,
    closest(selector) {
      for (let current = this; current; current = current.parentElement) {
        if (selector.split(',').some(part => part.trim() === '[data-swipe-ignore]'
          ? current.ignored : part.trim().toUpperCase() === current.tagName)) return current;
      }
      return null;
    },
  };
}

function setup(pathname = '/library/', search = '') {
  let now = 0;
  const listeners = new Map();
  const transitions = new Set();
  const frames = [];
  const app = {
    style: { transform: '', transition: '' },
    addEventListener(type, listener) { assert.equal(type, 'transitionend'); transitions.add(listener); },
    removeEventListener(type, listener) { transitions.delete(listener); },
  };
  const stage = {
    style: { display: 'none' }, children: [],
    get innerHTML() { return this.children.length ? '<iframe></iframe>' : ''; },
    set innerHTML(html) { assert.equal(html, ''); this.children = []; },
    appendChild(frame) { this.children.push(frame); frames.push(frame); },
  };
  const location = { pathname, search, origin: 'https://3dsl.jp', href: pathname };
  vm.runInNewContext(script, {
    URL, URLSearchParams, Date: { now: () => now }, location,
    window: { innerWidth: 360, addEventListener: (type, listener) => listeners.set(type, listener) },
    document: {
      documentElement: { clientWidth: 360 },
      getElementById: id => ({ 'app-shell': app, 'swipe-stage': stage })[id],
      createElement(tag) { assert.equal(tag, 'iframe'); return { style: {}, setAttribute() {} }; },
    },
  });
  return {
    app, stage, location, frames, listeners, transitions,
    touch(type, x, time, target = element('P'), y = 300) {
      now = time;
      let prevented = false;
      const point = { clientX: x, clientY: y };
      listeners.get(type)?.({ target, touches: [point], changedTouches: [point], preventDefault() { prevented = true; } });
      return prevented;
    },
    finishTransition() { for (const listener of [...transitions]) listener(); },
  };
}

const header = element('HEADER', null, true);
const footer = element('FOOTER', null, true);
const contactSection = element('SECTION', null, true);
const editable = element('DIV');
editable.isContentEditable = true;
const excluded = [
  ...['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'IFRAME', 'CANVAS'].map(tag => [tag, element(tag)]),
  ['button SVG child', element('PATH', element('SVG', element('BUTTON')))],
  ['editable descendant', element('SPAN', editable)],
  ['header navbar link', element('A', element('NAV', header))],
  ['footer link', element('A', element('DIV', footer))],
  ['Contact label', element('LABEL', element('FORM', contactSection))],
  ['Contact text', element('P', contactSection)],
];
for (const [name, target] of excluded) {
  const state = setup(name.startsWith('Contact') ? '/contact/' : '/library/');
  state.touch('touchstart', 100, 0, target);
  assert.equal(state.touch('touchmove', 200, 100, target), false, `${name}: native gesture is not prevented`);
  state.touch('touchend', 200, 200, target);
  assert.equal(state.app.style.transform, '', `${name}: page is not dragged`);
  assert.equal(state.frames.length, 0, `${name}: no preview iframe`);
  assert.equal(state.location.href, state.location.pathname, `${name}: no page navigation`);
}

for (const [endX, expected] of [[150, '/app/viewer'], [350, '/']]) {
  const state = setup();
  state.touch('touchstart', 250, 0);
  assert.equal(state.touch('touchmove', endX, 100), true, 'normal horizontal swipe locks');
  state.touch('touchend', endX, 200);
  state.finishTransition();
  assert.equal(state.location.href, expected, 'normal swipe retains route order');
  assert.equal(state.frames.length, 1);
  assert.match(state.frames[0].src, /[?&]noads=1&swipe=1$/, 'preview keeps recursion/ad suppression');
}

const short = setup();
short.touch('touchstart', 250, 0);
short.touch('touchmove', 220, 100);
short.touch('touchend', 220, 200);
short.finishTransition();
assert.equal(short.location.href, '/library/', 'short drag does not navigate');
assert.equal(short.app.style.transform, '');
assert.equal(short.stage.style.display, 'none');

const vertical = setup();
vertical.touch('touchstart', 250, 0);
assert.equal(vertical.touch('touchmove', 252, 100, element('P'), 420), false, 'vertical scroll stays native');
vertical.touch('touchend', 252, 200, element('P'), 420);
assert.equal(vertical.frames.length, 0);

const timeout = setup();
timeout.touch('touchstart', 250, 0);
timeout.touch('touchmove', 200, 100);
assert.notEqual(timeout.app.style.transform, '', 'timeout case first enters a real drag');
timeout.touch('touchmove', 190, 900);
assert.equal(timeout.app.style.transform, '', 'timeout restores position synchronously');
assert.equal(timeout.app.style.transition, '', 'timeout clears drag transition');
assert.equal(timeout.stage.style.display, 'none', 'timeout hides preview');
assert.equal(timeout.stage.innerHTML, '', 'timeout removes preview');
assert.equal(timeout.transitions.size, 0, 'timeout does not depend on transitionend');
timeout.touch('touchend', 190, 1000);
assert.equal(timeout.location.href, '/library/', 'timed-out gesture cannot navigate');
timeout.touch('touchstart', 250, 1100);
assert.equal(timeout.touch('touchmove', 150, 1200), true, 'new gesture works after timeout');
timeout.touch('touchend', 150, 1300);
timeout.finishTransition();
assert.equal(timeout.location.href, '/app/viewer', 'new gesture commits after timeout');

for (const state of [setup('/docs/works/knowledge-questions/'), setup('/library/', '?swipe=1')]) {
  assert.equal(state.listeners.size, 0, 'Docs and swipe previews remain outside page-swipe handling');
}
console.log('[check:swipe-nav] PASS: protected scroll/form/control regions, forward/back and short swipe, vertical scroll, timeout reset and retry, excluded routes; VM only, no external requests');
