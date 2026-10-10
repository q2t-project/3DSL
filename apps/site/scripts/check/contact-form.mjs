// Execute the page's actual handler with a recorded native-POST simulation.
// This test has no browser, fetch, or network client: no submission leaves the VM.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../src/pages/contact.astro', import.meta.url), 'utf8');
const script = source.match(/<script is:inline id="contact-form-handler">([\s\S]*?)<\/script>/)?.[1];
assert(script, 'contact handler exists');
assert(!source.includes('Astro.url.searchParams') && !source.includes('name="_next"'), 'query/redirect is not proof of acceptance');
const formMarkup = source.match(/<form\s[\s\S]*?>/)[0];
const fieldsetMarkup = source.match(/<fieldset\s[\s\S]*?>/)[0];
const submitMarkup = source.match(/<button\s+id="contact-submit"[\s\S]*?>/)[0];
const emailMarkup = source.match(/<input\s+id="email"[\s\S]*?\/>/)[0];
const subjectMarkup = source.match(/<input\s+id="subject"[\s\S]*?\/>/)[0];
const messageMarkup = source.match(/<textarea\s+id="message"[\s\S]*?>/)[0];
assert(/method="POST"/.test(formMarkup) && /target="_blank"/.test(formMarkup) && /rel="noopener"/.test(formMarkup), 'native POST opens a separate protected tab');
assert(!/\sdisabled(?:\s|=|>)/.test(fieldsetMarkup + submitMarkup), 'normal HTML POST remains available without JavaScript');
assert(/type="submit"/.test(submitMarkup) && !/\bname=/.test(submitMarkup), 'disabling unnamed submit button cannot remove user data');
assert(/type="email"/.test(emailMarkup) && /\brequired\b/.test(emailMarkup), 'email has native validation');
assert(/\brequired\b/.test(messageMarkup), 'message required');
assert(!/\brequired\b/.test(subjectMarkup), 'subject optional');
assert(!/fetch\s*\(|XMLHttpRequest|requestSubmit\s*\(|\.submit\s*\(/.test(script), 'no AJAX or programmatic resubmission');
assert(!/response\.ok|\.json\s*\(|showStatus\('accepted'/.test(script), 'HTTP or unknown JSON cannot produce local acceptance');

function element(value = '') {
  return {
    value, textContent: '', disabled: false, hidden: false, dataset: {}, listeners: {}, validityMessage: '',
    addEventListener(name, listener) { this.listeners[name] = listener; },
    setCustomValidity(message) { this.validityMessage = message; },
    focus() { this.focused = true; },
  };
}
function setup({ javascript = true } = {}) {
  const ids = Object.fromEntries(['contact-form', 'contact-fields', 'contact-submit', 'contact-status', 'contact-new', 'email', 'subject', 'message'].map(id => [id, element()]));
  const form = ids['contact-form'];
  const fields = ids['contact-fields'];
  const status = ids['contact-status'];
  ids.email.value = 'reader@example.test';
  ids.message.value = '疑似送信のみ。外部へ送信しない検査本文。';
  ids['contact-new'].hidden = true;
  form.action = source.match(/const FORMSPREE_ENDPOINT = '([^']+)'/)[1];
  form.reportValidity = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ids.email.value)
    && !!ids.message.value && !ids.message.validityMessage;
  const posts = [];
  const snapshot = () => ({ email: ids.email.value, subject: ids.subject.value, message: ids.message.value });
  if (javascript) vm.runInNewContext(script, {
    document: { getElementById: id => ids[id] },
    location: { search: '?sent=1' },
  });
  return {
    ids, form, fields, status, posts, snapshot,
    submit() {
      // Model native validation and the cancelable submit event, recording instead of sending.
      if (!form.reportValidity()) return false;
      let prevented = false;
      form.listeners.submit?.({ preventDefault() { prevented = true; } });
      if (!prevented) {
        assert.equal(fields.disabled, false, 'native POST includes enabled input fields');
        assert(['email', 'subject', 'message'].every(id => !ids[id].disabled), 'all data fields remain enabled');
        posts.push({ url: form.action, data: snapshot() });
      }
      return !prevented;
    },
  };
}

const initial = setup();
assert.equal(initial.status.textContent, '', '?sent=1 alone has no success message');
assert.equal(initial.posts.length, 0, 'initialization sends nothing');
for (const [field, value] of [['email', ''], ['email', 'not-an-email'], ['message', ''], ['message', '   ']]) {
  const state = setup();
  state.ids[field].value = value;
  assert.equal(state.submit(), false, `${field}=${JSON.stringify(value)} prevented`);
  assert.equal(state.posts.length, 0);
}

const state = setup();
const before = state.snapshot();
assert.equal(state.submit(), true, 'valid submit is not intercepted: native service flow remains');
assert.deepEqual(state.posts, [{ url: 'https://formspree.io/f/xnjnpgjp', data: before }], 'unchanged endpoint, email, empty optional subject, and body');
assert.equal(state.status.dataset.state, 'external');
assert.match(state.status.textContent, /受付完了を確認できません/);
assert.match(state.status.textContent, /送信済みの可能性/);
assert.equal(state.ids['contact-submit'].disabled, true, 'button locks after handoff');
assert.equal(state.submit(), false, 'second submit event is canceled');
assert.equal(state.posts.length, 1, 'double click does not duplicate native POST');
assert.deepEqual(state.snapshot(), before, 'original tab retains all input');
assert.equal(state.ids['contact-new'].hidden, false);

// Neither HTTP failures nor any JSON shape is observed by this page. The user
// verifies the result in the service tab; no response parser/auto-retry exists.
await Promise.resolve();
assert.equal(state.posts.length, 1, 'no automatic retry after external handoff');
state.ids['contact-new'].listeners.click();
assert.equal(state.ids['contact-submit'].disabled, false, 'only explicit return unlocks sending');
assert.deepEqual(state.snapshot(), before, 'explicit return does not erase input');
assert.match(state.status.textContent, /重ねて送らず/);
assert.equal(state.posts.length, 1, 'unlock does not resubmit');
assert.equal(state.submit(), true, 'manual submission remains possible after checking the result');
assert.equal(state.posts.length, 2);

const nojs = setup({ javascript: false });
assert.equal(nojs.submit(), true, 'without JavaScript the same native form can submit');
assert.equal(nojs.posts.length, 1);
assert.deepEqual(nojs.posts[0].data, nojs.snapshot(), 'no-JavaScript POST keeps all fields');
assert.equal(nojs.status.textContent, '', 'no local success inference without JavaScript');
console.log('[check:contact-form] PASS: native POST/no-JavaScript path, required/email, input retention, duplicate lock, explicit retry, no local receipt inference; simulation only, no external requests');
