// HG2: verify generated HTML, real list logic, and optional local Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.resolve(site, '../..');
const dist = path.join(site, 'dist');
const read = (p) => fs.readFile(path.join(dist, p), 'utf8');
const html = await read('library/index.html');
const index = JSON.parse(await read('_data/library/library_index.json'));
const publicItems = index.items.filter((item) => !item.hidden);
const staticCardIds = [...html.matchAll(/<article\b[^>]*\bdata-library-id="([^"]+)"[^>]*>/g)].map((match) => match[1]);
console.log('[check:content-readability] STATIC_CARD_IDS ' + JSON.stringify(staticCardIds));
assert.deepEqual([...staticCardIds].sort(), publicItems.map((item) => item.id).sort(), 'initial HTML contains exactly one article per public work');
assert.equal(new Set(staticCardIds).size, staticCardIds.length, 'static article IDs are unique');
for (const item of index.items) assert.equal(html.includes(`data-library-id="${item.id}"`), !item.hidden, `${item.id}: public/hidden contract`);
for (const p of ['docs/works/knowledge-questions', 'docs/usage/first-work', 'docs/works/structure-classification']) {
  assert(html.includes(`href="/${p}/"`), `learning entry: ${p}`);
  assert(await fs.stat(path.join(dist, p, 'index.html')), `learning destination: ${p}`);
}
const faq = await read('faq/index.html');
assert(!faq.includes('SSOT: packages/docs/faq') && !faq.includes('短い回答を揃えていく'), 'FAQ uses reader-facing copy');
const source = await fs.readFile(path.join(site, 'src/pages/library/index.astro'), 'utf8');
const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
assert(script, 'inline enhancement script exists');
const generated = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]).filter((text) => text.includes('library-controls'));
console.log('[check:content-readability] GENERATED_SCRIPTS ' + JSON.stringify(generated));
assert.equal(generated.length, 1, 'one generated enhancement script');
new vm.Script(generated[0]);

// Run the actual inline script with 45 fixture cards, not a second implementation.
const cards = Array.from({ length: 45 }, (_, i) => ({
  dataset: { libraryId: String(i).padStart(3, '0'), title: `作品${String(i).padStart(3, '0')}`, date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`, search: `作品${String(i).padStart(3, '0')} ${i % 2 ? 'odd' : 'even'}` }, hidden: false,
}));
const elements = Object.fromEntries(['library-controls', 'library-pager', 'search', 'sort', 'prev', 'next', 'page-info', 'library-empty'].map((id) => [id, {
  value: id === 'sort' ? 'new' : '', hidden: true, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; },
}]));
const grid = { children: [...cards], querySelectorAll(selector) { return selector === '[data-library-id]' ? cards : []; }, appendChild(card) { this.children.splice(this.children.indexOf(card), 1); this.children.push(card); } };
elements.cards = grid;
vm.runInNewContext(script, { document: { getElementById: (id) => elements[id] }, window: { location: new URL('https://3dsl.jp/library/?test=1') }, URL });
const visible = () => grid.children.filter((card) => !card.hidden);
assert.equal(visible().length, 20); assert.equal(elements['library-controls'].hidden, false); assert.equal(elements.prev.disabled, true);
elements.next.listeners.click(); assert.equal(visible().length, 20);
elements.next.listeners.click(); assert.equal(visible().length, 5); assert.equal(elements.next.disabled, true);
elements.prev.listeners.click(); assert.equal(visible().length, 20);
elements.search.value = 'even'; elements.search.listeners.input(); assert.equal(visible().length, 20); assert(visible().every((c) => c.dataset.search.includes('even')));
elements.search.value = 'no-such-work'; elements.search.listeners.input(); assert.equal(visible().length, 0); assert.equal(elements['library-empty'].hidden, false);
elements.search.value = ''; elements.search.listeners.input(); assert.equal(visible().length, 20);
elements.sort.value = 'title'; elements.sort.listeners.change(); assert.equal(visible()[0].dataset.title, '作品000');
elements.sort.value = 'old'; elements.sort.listeners.change(); assert.equal(visible()[0].dataset.date, '2026-01-01');
elements.sort.value = 'new'; elements.sort.listeners.change(); assert.equal(visible()[0].dataset.date, '2026-01-28');
assert.equal(new Set(grid.children).size, 45, 'no card loss or duplicate nodes');
console.log('[check:content-readability] PASS static cards/hidden/learning links/FAQ; list logic: 45-card fixture, search/sort/paging/no-results/reset');

const brainRaw = await fs.readFile(path.join(repo, 'packages/3dss-content/library/26012001/model.3dss.json'), 'utf8');
const blob = createHash('sha1').update(`blob ${Buffer.byteLength(brainRaw)}\0`).update(brainRaw).digest('hex');
assert.equal(blob, 'accc58dca3afebef482edab76fcbecc40726915a', 'brain model unchanged');
const brain = JSON.parse(brainRaw);
const ids = new Set(brain.points.map((p) => p.meta.uuid));
const missing = brain.lines.flatMap((line) => ['end_a', 'end_b'].filter((end) => line.appearance[end]?.ref && !ids.has(line.appearance[end].ref)).map((end) => ({ line: line.meta.uuid, end, ref: line.appearance[end].ref })));
console.log('[check:content-readability] BRAIN_REVIEW ' + JSON.stringify({ points: brain.points.length, lines: brain.lines.length, documentReference: brain.document_meta.reference, missing, labels: brain.points.map((p) => p.signification?.name) }));
if (missing.length) console.log('[check:content-readability] WARN: inherited dangling brain endpoints require author decision; NOT a whole-site pass.');

const chrome = ['google-chrome', 'chromium', 'chromium-browser'].find((name) => spawnSync(name, ['--version'], { encoding: 'utf8' }).status === 0);
if (!chrome) {
  console.log('[check:content-readability] BROWSER SKIP: Chromium not installed; static/VM checks are not browser checks.');
} else {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), '3dsl-hg2-'));
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403).end(); return; }
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }); res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      const text = await fs.readFile(path.join(dir, 'DevToolsActivePort'), 'utf8').catch(() => '');
      if (text) { port = text.split('\n')[0]; break; }
      if (proc.exitCode !== null) throw new Error(`Chromium exited: ${proc.exitCode}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(port, 'Chromium debugger started');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    let seq = 0;
    const pending = new Map();
    const errors = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        const detail = msg.params.exceptionDetails;
        errors.push({ text: detail.text, description: detail.exception?.description, url: detail.url, line: detail.lineNumber });
        console.log('[check:content-readability] BROWSER_EXCEPTION ' + JSON.stringify(errors.at(-1)));
      }
      const entry = pending.get(msg.id);
      if (entry) { pending.delete(msg.id); clearTimeout(entry.timer); msg.error ? entry.reject(new Error(JSON.stringify(msg.error))) : entry.resolve(msg.result); }
    });
    function cmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert(!result.exceptionDetails, 'browser evaluation succeeded'); return result.result.value;
    }
    await cmd('Page.enable'); await cmd('Runtime.enable');
    const results = [];
    for (const javascript of [false, true]) {
      await cmd('Emulation.setScriptExecutionDisabled', { value: !javascript });
      for (const width of [360, 390, 1280]) {
        await cmd('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        await cmd('Page.navigate', { url: origin + `/library/?hg2=${javascript}-${width}` });
        for (let i = 0; i < 100; i++) {
          if (await evaluate(`location.search === '?hg2=${javascript}-${width}' && document.readyState === 'complete'`)) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const actual = await evaluate(`({width:innerWidth, scroll:document.documentElement.scrollWidth, total:document.querySelectorAll('[data-library-id]').length, visible:[...document.querySelectorAll('[data-library-id]')].filter(e=>getComputedStyle(e).display!=='none').length, controls:!document.getElementById('library-controls').hidden, scripts:[...document.scripts].filter(s=>s.textContent.includes('library-controls')).map(s=>({type:s.type,chars:s.textContent.length})), state:document.readyState})`);
        console.log('[check:content-readability] BROWSER_CASE ' + JSON.stringify({ javascript, ...actual }));
        assert.equal(actual.width, width); assert(actual.scroll <= width + 1, `no horizontal overflow: ${JSON.stringify(actual)}`);
        assert.equal(actual.total, publicItems.length); assert.equal(actual.visible, javascript ? Math.min(20, publicItems.length) : publicItems.length); assert.equal(actual.controls, javascript, 'enhancement controls match JS availability');
        if (javascript) {
          await evaluate(`document.getElementById('search').value='__no_such_work__'; document.getElementById('search').dispatchEvent(new Event('input'));`);
          assert.equal(await evaluate(`document.querySelectorAll('[data-library-id]:not([hidden])').length`), 0);
          await evaluate(`document.getElementById('search').value=''; document.getElementById('search').dispatchEvent(new Event('input'));`);
        }
        results.push({ javascript, ...actual });
      }
    }
    console.log('[check:content-readability] BROWSER PASS ' + JSON.stringify(results));
    console.log('[check:content-readability] Browser scope: generated Library HTML only; not Android, WebGL, AdSense rendering, or production deployment.');
  } finally {
    ws?.close(); proc.kill('SIGTERM'); server.closeAllConnections?.(); await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
