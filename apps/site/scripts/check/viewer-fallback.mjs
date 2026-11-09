// Real Chromium: failed WebGL initialization, URL retry, retained work and
// navigation without JavaScript. Viewport emulation is not Android hardware.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';
import { viewerFallbackLinks } from '../../config/viewer-fallback.mjs';

const site = fileURLToPath(new URL('../../', import.meta.url));
const original = JSON.parse(await readFile(new URL('../../../reconstruction/ssot/models/first_work.3dsl-work.json', import.meta.url), 'utf8'));
const server = await serveBuild();
const standalone = await serveBuild(new Map(), path.resolve(site, '../reconstruction/ssot'));
const model = '/preview-reconstruction/models/first_work.3dsl-work.json';
const article = '/docs/usage/first-work/';
const shots = process.env.VIEWER_FALLBACK_SHOTS;
const results = [];
try {
  for (const width of [360, 1280]) {
    await withBrowser(async ({ cmd, evaluate, events }) => {
      const height = width === 360 ? 704 : 800;
      const exceptions = [];
      events.addEventListener('Runtime.exceptionThrown', ({ detail }) => exceptions.push(detail.exceptionDetails.text));
      await cmd('Runtime.enable');
      await cmd('Network.enable');
      await cmd('Network.setBlockedURLs', { urlPatterns: [
        { urlPattern: server.origin + '/*', block: false },
        { urlPattern: standalone.origin + '/*', block: false },
        { urlPattern: 'http://*:*/*', block: true }, { urlPattern: 'https://*:*/*', block: true },
      ] });
      await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 360 });
      await cmd('Emulation.setTouchEmulationEnabled', { enabled: width === 360, maxTouchPoints: 2 });
      const inReader = expression => evaluate('(() => {const f=document.getElementById("app-viewer-iframe");const d=f?.contentDocument,w=f?.contentWindow;return d&&w?(' + expression + '):null;})()');
      const urlFor = parameters => server.origin + '/app/viewer/?' + new URLSearchParams(parameters);
      const open = url => cmd('Page.navigate', { url });
      const failure = async () => {
        await waitFor(() => inReader('d.body?.classList.contains("reading-error")'), 'visible read failure');
        const state = await inReader('(() => {const p=d.getElementById("reading-mobile-prompt"),b=p.getBoundingClientRect();return {visible:!p.hidden&&w.getComputedStyle(p).display!=="none",left:b.left,right:b.right,width:w.innerWidth,help:!d.getElementById("reading-prompt-help").hidden,links:[...d.querySelectorAll("#reading-prompt-help a")].map(a=>a.href),retry:!d.getElementById("reading-prompt-retry").hidden,back:d.getElementById("reading-prompt-return").hidden?null:d.getElementById("reading-prompt-return").href,attempts:w.__fallbackGLAttempts||0};})()');
        assert(state.visible && state.help && state.left >= -1 && state.right <= state.width + 1, JSON.stringify(state));
        assert.deepEqual(state.links, viewerFallbackLinks.map(link => server.origin + link.href));
        return state;
      };
      async function screenshot(name) {
        if (!shots) return;
        await mkdir(shots, { recursive: true });
        const shot = await cmd('Page.captureScreenshot', { format: 'png' });
        await writeFile(path.join(shots, name + '-' + width + '.png'), Buffer.from(shot.data, 'base64'));
      }
      async function clickReader(id) {
        const point = await evaluate('(() => {const f=document.getElementById("app-viewer-iframe"),a=f.contentDocument.getElementById(' + JSON.stringify(id) + ');a.scrollIntoView({block:"center"});const r=a.getBoundingClientRect(),b=f.getBoundingClientRect();return {x:b.left+r.left+r.width/2,y:b.top+r.top+r.height/2};})()');
        await cmd('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
      }
      async function enter() {
        await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      }

      const injected = await cmd('Page.addScriptToEvaluateOnNewDocument', { source:
        'window.__fallbackGLAttempts=0;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/^(webgl2?|experimental-webgl)$/.test(type)){window.__fallbackGLAttempts++;return null;}return get.call(this,type,...args);};' });
      await open(urlFor({ model, return: article, scroll: '12.8' }));
      const failed = await failure();
      assert(failed.attempts > 0, 'actual WebGL context creation failed');
      assert(failed.retry);
      assert.equal(failed.back, server.origin + article + '?scroll=12');
      await screenshot('no-webgl');

      // The real retry button reloads the same URL and succeeds once WebGL is available.
      await cmd('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier });
      await clickReader('reading-prompt-retry');
      await waitFor(() => inReader('!!w.viewerDiagnostics?.rawSnapshot() && !d.getElementById("reading-search-button").disabled && !d.body.classList.contains("reading-error")'), 'URL retry recovers the work', 45000);
      assert.deepEqual(await inReader('w.viewerDiagnostics.rawSnapshot()'), original);
      assert.equal(await inReader('d.getElementById("reading-prompt-help").hidden && d.getElementById("reading-prompt-retry").hidden && d.getElementById("reading-prompt-return").hidden'), true);
      assert.equal(await evaluate('document.querySelector("#viewer-noscript")===null && getComputedStyle(document.getElementById("app-viewer-iframe")).display!=="none"'), true, 'noscript CSS never hides the healthy host');

      const rejected = await inReader('w.viewerDiagnostics.openText("not-json","bad.json")');
      assert.equal(rejected.ok, false);
      assert.equal((await failure()).retry, false, 'never reload over a retained work');
      assert.deepEqual(await inReader('w.viewerDiagnostics.rawSnapshot()'), original);
      await clickReader('reading-prompt-dismiss');
      assert.equal(await inReader('!d.body.classList.contains("reading-error")'), true);
      await inReader('w.viewerDiagnostics.openText("not-json","bad.json")');
      await failure();
      await inReader('d.getElementById("reading-prompt-return").focus()');
      await enter();
      await waitFor(() => evaluate('location.pathname===' + JSON.stringify(article)), 'keyboard return leaves the iframe');

      for (const destination of ['https://foreign.invalid/', 'javascript:alert(1)', server.origin.replace('://', '://u:p@') + '/private']) {
        await open(urlFor({ model: '/__viewer_fallback_missing__.json', return: destination }));
        assert.equal((await failure()).back, null, 'untrusted return destination stays hidden');
      }

      await cmd('Emulation.setScriptExecutionDisabled', { value: true });
      await open(urlFor({ model, return: article }));
      await waitFor(() => evaluate('!!document.querySelector("#viewer-noscript") && document.readyState==="complete"'), 'host noscript guide');
      const noScript = await evaluate('(() => {const p=document.getElementById("viewer-noscript");return {text:p.innerText,links:[...p.querySelectorAll("a")].map(a=>a.href),scroll:document.documentElement.scrollWidth,width:innerWidth,iframe:getComputedStyle(document.getElementById("app-viewer-iframe")).display};})()');
      assert(noScript.text.includes('JavaScriptが無効'));
      assert.deepEqual(noScript.links, viewerFallbackLinks.map(link => server.origin + link.href));
      assert(noScript.scroll <= noScript.width + 1);
      assert.equal(noScript.iframe, 'none');
      await screenshot('no-script');
      await evaluate('document.querySelector(' + JSON.stringify('#viewer-noscript a[href="' + article + '"]') + ').focus()');
      await enter();
      await waitFor(() => evaluate('location.pathname===' + JSON.stringify(article) + ' && document.querySelectorAll("main table").length>=3'), 'text/table guide without JavaScript');
      assert.equal(await evaluate('document.querySelector("main").innerText.includes("Q → L75 → A75 → S75") && document.querySelector("main").innerText.includes("Q → L83 → A83 → S83") && !document.querySelector("canvas")'), true);
      await screenshot('text-reading');

      await open(server.origin + '/preview-reconstruction/contract_viewer/reader.html');
      await waitFor(() => evaluate('!!document.querySelector("#reading-noscript") && document.readyState==="complete"'), 'direct reader noscript guide');
      assert.deepEqual(await evaluate('[...document.querySelectorAll("#reading-noscript a")].map(a=>a.href)'), viewerFallbackLinks.map(link => server.origin + link.href));
      assert.equal(await evaluate('getComputedStyle(document.getElementById("reading-header")).display'), 'none');
      await open(standalone.origin + '/contract_viewer/index.html');
      await waitFor(() => evaluate('!!document.querySelector("#reading-noscript") && document.readyState==="complete"'), 'standalone noscript guide');
      assert.deepEqual(await evaluate('[...document.querySelectorAll("#reading-noscript a")].map(a=>a.href)'), [standalone.origin + '/RECONSTRUCTION.html']);
      assert.deepEqual(exceptions, []);
      results.push({ width, webglFailure: true, urlRetry: true, retainedWork: true, keyboardReturn: true, safeReturn: true, noScript: true, textTables: true, standalone: true });
    });
  }
} finally { await standalone.close(); await server.close(); }
console.log('[check:viewer-fallback] PASS ' + JSON.stringify(results));
console.log('[check:viewer-fallback] Chromium only; no Android hardware, ongoing GPU-context-loss, all-work static images or screen-reader claim.');
