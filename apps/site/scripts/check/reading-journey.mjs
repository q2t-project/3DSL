// Follow the published links with native Enter, including real new tabs.
// This checks navigation and loaded data, not a first-time reader's understanding.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { connectDevTools } from '../lib/devtools.mjs';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const server = await serveBuild();
const results = [];
try {
  for (const width of [360, 1280]) {
    await withBrowser(async page => {
      async function configure(p) {
        await p.cmd('Page.enable');
        await p.cmd('Network.enable');
        await p.cmd('Network.setBlockedURLs', { urlPatterns: [
          { urlPattern: server.origin + '/*', block: false },
          { urlPattern: 'http://*:*/*', block: true }, { urlPattern: 'https://*:*/*', block: true },
        ] });
        await p.cmd('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width === 360 });
      }
      const inReader = (p, expression) => p.evaluate('(() => {const f=document.getElementById("app-viewer-iframe"),d=f?.contentDocument,w=f?.contentWindow;return d&&w?(' + expression + '):null;})()');
      async function go(p, route) {
        await p.cmd('Page.navigate', { url: server.origin + route });
        await waitFor(() => p.evaluate('location.pathname===' + JSON.stringify(route) + ' && document.readyState==="complete"'), route);
      }
      async function click(p, selector, reader = false) {
        // Native Enter activates the actual published anchor/button, without
        // replacing its target or racing load-time scroll restoration.
        const expression = '(() => {const doc=' + (reader ? 'd' : 'document') + ',el=doc.querySelector(' + JSON.stringify(selector) + ');if(!el?.getClientRects().length)throw new Error("Missing or hidden control: " + ' + JSON.stringify(selector) + ');el.scrollIntoView({block:"center"});el.focus();return doc.activeElement===el;})()';
        assert(await (reader ? inReader(p, expression) : p.evaluate(expression)), 'focus ' + selector);
        await p.cmd('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13 });
        await p.cmd('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13 });
      }
      async function ready(p, model) {
        await waitFor(() => inReader(p, '!!w.viewerDiagnostics?.snapshot().renderAvailable && !d.getElementById("reading-search-button").disabled'), 'render ' + model, 45000);
        assert.equal((await inReader(p, 'w.viewerBootReady')).ok, true, 'initial opening completes before another action');
        assert.deepEqual(await inReader(p, 'w.viewerDiagnostics.rawSnapshot()'), JSON.parse(await readFile(new URL('../../dist' + model, import.meta.url), 'utf8')));
      }
      async function inspectAndReturn(p, model, route) {
        await ready(p, model);
        if (width === 360) await click(p, '#reading-tab-find', true);
        else await click(p, '#reading-result-summary', true);
        await click(p, '#reading-result-list .result-button', true);
        await waitFor(() => inReader(p, 'w.viewerDiagnostics.snapshot().selectedId'), 'native selection');
        if (width === 360) {
          await waitFor(() => inReader(p, 'd.body.dataset.readingPanel==="diagram"'), 'selection returns to the diagram');
          await click(p, '#reading-tab-menu', true);
        }
        const back = await inReader(p, '(() => {const a=d.getElementById("reading-return");return {hidden:a.hidden,href:a.href,target:a.target,height:a.getBoundingClientRect().height};})()');
        assert(!back.hidden && back.height >= 44, 'visible native return link');
        assert.equal(back.href, server.origin + route);
        assert.equal(back.target, '_top');
        await click(p, '#reading-return', true);
        await waitFor(() => p.evaluate('location.pathname===' + JSON.stringify(route) + ' && document.readyState==="complete" && !!document.querySelector("main h1")'), 'return to ' + route);
        assert.equal(await p.evaluate('!!document.getElementById("app-viewer-iframe")'), false, 'return leaves the Viewer host');
      }
      await configure(page);
      const opened = [];
      page.events.addEventListener('Page.windowOpen', ({detail}) => opened.push({url:detail.url,userGesture:detail.userGesture}));
      const targets = async () => (await (await fetch('http://127.0.0.1:' + page.port + '/json/list')).json()).filter(t => t.type === 'page');
      for (const [article, model] of [
        ['/docs/works/knowledge-questions/', '/preview-reconstruction/models/knowledge_questions.3dsl-work.json'],
        ['/docs/usage/first-work/', '/preview-reconstruction/models/first_work.3dsl-work.json'],
      ]) {
        await go(page, '/library/');
        await click(page, '.learning-paths a[href="' + article + '"]');
        await waitFor(() => page.evaluate('location.pathname===' + JSON.stringify(article) + ' && document.readyState==="complete"'), 'Library to article');
        const selector = 'main a[href^="/app/viewer/?model=' + model + '"]';
        const link = await page.evaluate('(() => {const a=document.querySelector(' + JSON.stringify(selector) + ');return {href:a.href,target:a.target};})()');
        assert.equal(new URL(link.href).searchParams.get('return'), article, 'article declares its own return route');
        assert.equal(link.target, '_blank');
        const before = new Set((await targets()).map(t => t.id));
        opened.length = 0;
        await click(page, selector);
        const target = await waitFor(async () => (await targets()).find(t => !before.has(t.id) && new URL(t.url).pathname === '/app/viewer/'), 'new Viewer tab').catch(async error => {
          console.log('[reading-journey] popup failure ' + JSON.stringify({width, article,opened, targets: (await targets()).map(t => ({id:t.id,url:t.url})), source:await page.evaluate('({url:location.href,focus:document.activeElement?.outerHTML,scrollY})')}));
          throw error;
        });
        const child = await connectDevTools(target.webSocketDebuggerUrl);
        try {
          await configure(child);
          await child.cmd('Page.bringToFront');
          await inspectAndReturn(child, model, article);
          assert.equal(await page.evaluate('location.pathname'), article, 'original article tab remains open');
          results.push({ width, source: article, newTab: true, returnTo: article });
        } finally { child.close(); await page.cmd('Target.closeTarget', { targetId: target.id }); }
        await page.cmd('Page.bringToFront');
      }
      const model = '/_data/library/26010501/model.3dss.json';
      for (const detail of [false, true]) {
        await go(page, '/library/');
        const route = detail ? '/library/26010501/' : '/library/';
        if (detail) {
          await click(page, '[data-library-id="26010501"] h3 a');
          await waitFor(() => page.evaluate('location.pathname===' + JSON.stringify(route) + ' && document.readyState==="complete"'), 'Library to work details');
        }
        const selector = detail ? 'main a[href^="/app/viewer/?"]' : '[data-library-id="26010501"] .reading-viewer';
        await click(page, selector);
        await inspectAndReturn(page, model, route);
        results.push({ width, source: route, newTab: false, returnTo: route });
      }
      // A healthy Viewer must not offer the removed host button as a bypass
      // around the reader's same-origin/credential checks.
      for (const raw of ['https://foreign.invalid/', 'javascript:alert(1)', server.origin.replace('://', '://u:p@') + '/private']) {
        await page.cmd('Page.navigate', { url: server.origin + '/app/viewer/?' + new URLSearchParams({ model: '/preview-reconstruction/models/first_work.3dsl-work.json', return: raw }) });
        await ready(page, '/preview-reconstruction/models/first_work.3dsl-work.json');
        assert(await inReader(page, 'd.getElementById("reading-return").hidden'));
        assert.equal(await inReader(page, '[...d.querySelectorAll("#reading-host-actions button")].some(b=>b.textContent.includes("元のページ"))'), false);
      }
    });
  }
  console.log('[check:reading-journey] PASS ' + JSON.stringify({ journeys: results, unsafeReturnCases: 6, scope: 'Chromium viewport checks; not Android hardware, scroll-position restoration or reader comprehension' }));
} finally { await server.close(); }
