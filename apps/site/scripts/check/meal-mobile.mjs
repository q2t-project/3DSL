// Actual generated Viewer smoke test with software WebGL. This is desktop
// Chromium at phone widths, not Android touch or independent reader testing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.resolve(site, '../..');
const dist = path.join(site, 'dist');
// Use the shipped validator and bundled Ajv even on hosts without Chromium.
// Only the schema fetch boundary is local; compatibility and structural checks
// run unchanged. Browser cases below additionally exercise the served validator.
const modelText = await fs.readFile(path.join(repo, 'apps/reconstruction/ssot/models/meal_prototype.3dss.json'), 'utf8');
const model = JSON.parse(modelText);
assert.equal(model.points.length, 17);
assert.equal(model.lines.length, 18);
const schema = JSON.parse(await fs.readFile(path.join(repo, 'apps/reconstruction/ssot/schemas/3DSS.schema.json'), 'utf8'));
const { default: createAjv } = await import('../../../reconstruction/ssot/vendor/ajv/dist/ajv.js');
const previousAjv = globalThis.Ajv, previousFetch = globalThis.fetch;
try {
  globalThis.Ajv = createAjv;
  globalThis.fetch = async url => {
    assert.equal(String(url), '/schemas/3DSS.schema.json', 'validator uses known schema route');
    return { ok: true, status: 200, json: async () => structuredClone(schema) };
  };
  const { createCoreControllers } = await import('../../../reconstruction/ssot/modeler_app/runtime/core/coreControllers.js');
  const validator = createCoreControllers({ emit() {} }).validator;
  await validator.ensureInitialized();
  assert.equal(validator.isReady(), true, 'actual bundled Ajv initialized');
  assert.equal(validator.validate(structuredClone(model)), true, `actual strict validator: ${JSON.stringify(validator.getErrors())}`);
} finally {
  if (previousAjv === undefined) delete globalThis.Ajv; else globalThis.Ajv = previousAjv;
  globalThis.fetch = previousFetch;
}
const pointIds = new Set(model.points.map(point => point.meta.uuid));
assert.equal(pointIds.size, model.points.length, 'unique point IDs');
const counts = [];
for (const frame of [0, 1, 2, 3]) {
  const visible = element => element.appearance.visible !== false && (!element.appearance.frames || [].concat(element.appearance.frames).includes(frame));
  const points = model.points.filter(visible), lines = model.lines.filter(visible), visibleIds = new Set(points.map(point => point.meta.uuid));
  for (const line of lines) for (const side of ['end_a', 'end_b']) {
    const ref = line.appearance[side]?.ref;
    assert(pointIds.has(ref), `known endpoint ${side}`);
    assert(visibleIds.has(ref), `frame ${frame}: both endpoints visible for ${line.meta.uuid}`);
  }
  counts.push([points.length, lines.length]);
}
assert.deepEqual(counts, [[7, 6], [6, 5], [5, 4], [17, 18]], 'cooking / procurement-storage / serving / overview');
console.log('[check:meal-mobile] STATIC PASS actual bundled Ajv + compatibility/structural checks, 17p18l, four frames with visible endpoint closure.');
const chrome = ['google-chrome', 'chromium', 'chromium-browser'].find(name => spawnSync(name, ['--version'], { encoding: 'utf8' }).status === 0);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
if (!chrome) {
  console.log('[check:meal-mobile] SKIP: Chromium unavailable; no Viewer/WebGL/mobile display PASS claimed.');
} else {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), '3dsl-meal-mobile-'));
  const logs = path.join(site, 'ci-logs');
  await fs.mkdir(logs, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
      if (file !== dist && !file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '', processError, ws;
  proc.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16000); });
  proc.on('error', error => { processError = error; });
  try {
    let port;
    const startupDeadline = Date.now() + 30000;
    while (Date.now() < startupDeadline) {
      const active = await fs.readFile(path.join(dir, 'DevToolsActivePort'), 'utf8').catch(() => '');
      if (active) { port = active.split('\n')[0]; break; }
      if (processError) throw processError;
      if (proc.exitCode !== null) throw new Error(`Chromium exited ${proc.exitCode}: ${stderr}`);
      await sleep(100);
    }
    assert(port, `Chromium debugger started within 30s. stderr: ${stderr}`);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('CDP websocket connection timeout')), 15000);
      ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
      ws.addEventListener('error', error => { clearTimeout(timeout); reject(error); }, { once: true });
    });
    let seq = 0;
    const pending = new Map(), errors = [];
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') {
        const detail = message.params.exceptionDetails;
        errors.push({ text: detail.text, description: detail.exception?.description, url: detail.url, line: detail.lineNumber });
      }
      const entry = pending.get(message.id);
      if (entry) { pending.delete(message.id); clearTimeout(entry.timeout); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); }
    });
    function cmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++seq, timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 45000);
        pending.set(id, { resolve, reject, timeout });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert(!result.exceptionDetails, `browser evaluation: ${JSON.stringify(result.exceptionDetails)}`);
      return result.result.value;
    }
    async function ready(query) {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        if (await evaluate(`location.search === ${JSON.stringify(query)} && typeof window.viewerBootReady !== 'undefined' && typeof window.viewerDiagnostics?.openText === 'function'`)) return;
        await sleep(100);
      }
      assert.fail(`Viewer boot hook unavailable: ${JSON.stringify(errors)}`);
    }
    const measure = `(() => { const root=document.getElementById('viewer-root'),canvas=document.getElementById('viewer-canvas'),tools=document.getElementById('reading-tools'),dock=document.getElementById('viewer-rightdock'); const canvasRect=canvas.getBoundingClientRect(),dockRect=dock.getBoundingClientRect(); return {width:innerWidth,scroll:document.documentElement.scrollWidth,rootHeight:root.getBoundingClientRect().height,canvasHeight:canvas.clientHeight,canvasWidth:canvas.clientWidth,canvasBottom:canvasRect.bottom,dockTop:dockRect.top,canvasPixels:[canvas.width,canvas.height],toolsOpen:tools.open,state:window.viewerDiagnostics.snapshot()}; })()`;
    await cmd('Page.enable');
    await cmd('Runtime.enable');
    const cases = [];
    for (const width of [360, 390, 1280]) {
      errors.length = 0;
      await cmd('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      const query = `?meal-smoke=${width}`;
      await cmd('Page.navigate', { url: origin + '/preview-reconstruction/contract_viewer/index.html' + query });
      await ready(query);
      await evaluate('window.viewerBootReady');
      const opened = await evaluate(`window.viewerDiagnostics.openText(${JSON.stringify(modelText)}, 'meal.3dss.json')`);
      assert.equal(opened?.ok, true, `Viewer opened: ${JSON.stringify(opened)}`);
      await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const actual = await evaluate(measure);
      // Preserve the failing initial view too: camera assertions must not hide
      // the geometry and UI evidence needed to diagnose an auto-fit rejection.
      await fs.writeFile(path.join(logs, `meal-mobile-initial-${width}.json`), JSON.stringify(actual, null, 2));
      const initialScreenshot = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(logs, `meal-mobile-initial-${width}.png`), Buffer.from(initialScreenshot.data, 'base64'));
      assert.equal(actual.width, width);
      assert(actual.scroll <= width + 1, `no horizontal overflow: ${JSON.stringify(actual)}`);
      assert.equal(actual.state.entryCount, 35, '17 points + 18 lines');
      assert.equal(actual.state.renderAvailable, true, 'renderer mounted');
      assert(Math.abs(actual.state.camera?.phi - Math.PI / 2) < 1e-6, `XZ presentation camera: ${JSON.stringify(actual.state.camera)}`);
      assert(actual.canvasPixels.every(n => n > 0), 'render canvas has pixels');
      if (width < 650) {
        assert.equal(actual.toolsOpen, false, 'mobile starts with controls collapsed');
        assert(actual.canvasHeight >= 360, 'actual mobile canvas height >=360px');
        assert(actual.canvasBottom <= actual.dockTop + 1, 'mobile gizmo strip does not overlap drawing');
        await evaluate(`document.getElementById('reading-tools-toggle').click()`);
        const expanded = await evaluate(`({open:document.getElementById('reading-tools').open,searchVisible:document.getElementById('reading-search').getClientRects().length>0,presetVisible:document.getElementById('reading-preset').getClientRects().length>0,scroll:document.documentElement.scrollWidth})`);
        assert(expanded.open && expanded.searchVisible && expanded.presetVisible, 'expanded search and preset accessible');
        assert(expanded.scroll <= width + 1, 'expanded controls do not overflow');
        const expandedLayout = await evaluate(measure);
        assert(expandedLayout.canvasHeight >= 360, 'expanded controls preserve canvas height');
        assert(expandedLayout.canvasBottom <= expandedLayout.dockTop + 1, 'expanded controls preserve gizmo strip');
        await evaluate(`document.getElementById('reading-tools-toggle').click()`);
        assert.equal(await evaluate(`document.getElementById('reading-tools').open`), false, 'controls collapse again');
      } else assert.equal(actual.toolsOpen, true, 'desktop controls remain expanded');
      await evaluate('window.viewerDiagnostics.setFrame(2)');
      await evaluate('window.viewerDiagnostics.fitAll()');
      const focused = await evaluate('window.viewerDiagnostics.snapshot()');
      assert.equal(focused.frame, 2, 'frame 2 selected');
      assert(Math.abs(focused.camera?.phi - Math.PI / 2) < 1e-6, 'frame 2 remains front-facing');
      await evaluate('window.viewerDiagnostics.setFrame(0)');
      await evaluate('window.viewerDiagnostics.fitAll()');
      const retained = await evaluate('window.viewerDiagnostics.rawSnapshot()');
      assert.deepEqual(retained, model, 'frame switching and fitting leave the input model unchanged');
      await evaluate('window.scrollTo(0,0);new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const screenshot = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(logs, `meal-mobile-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      assert.deepEqual(errors, [], 'no browser runtime/renderer exceptions');
      cases.push({ width, scroll: actual.scroll, canvasHeight: actual.canvasHeight, canvasBottom: actual.canvasBottom, dockTop: actual.dockTop, toolsOpen: actual.toolsOpen, entryCount: actual.state.entryCount, camera: actual.state.camera, frame2: focused.frame });
      console.log('[check:meal-mobile] CASE PASS ' + JSON.stringify(cases.at(-1)));
    }
    await fs.writeFile(path.join(logs, 'meal-mobile-results.json'), JSON.stringify({ cases, scope: 'Generated actual Viewer, software WebGL, desktop Chromium at phone widths; not Android touch or reader comprehension.' }, null, 2));
    console.log('[check:meal-mobile] PASS 360/390/1280 actual Viewer load, front-facing camera, controls, frame 2 and no exceptions. Not an Android or comprehension test.');
  } catch (error) {
    await fs.writeFile(path.join(logs, 'meal-mobile-chrome-stderr.log'), stderr);
    throw error;
  } finally {
    ws?.close(); proc.kill('SIGTERM');
    server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
