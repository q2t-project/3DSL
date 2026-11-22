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
        const y = await p.evaluate('Math.round(scrollY)');
        await p.cmd('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, text:'\r', unmodifiedText:'\r' });
        await p.cmd('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13 });
        return y;
      }
      async function ready(p, model) {
        await waitFor(() => inReader(p, '!!w.viewerDiagnostics?.snapshot().renderAvailable && !d.getElementById("reading-search-button").disabled'), 'render ' + model, 45000);
        const sharedType = await inReader(p, 'w.getComputedStyle(d.getElementById("reading-search-button")).fontFamily === w.getComputedStyle(d.documentElement).fontFamily');
        assert(sharedType, 'Viewer controls inherit the shared interface font');
        assert.equal((await inReader(p, 'w.viewerBootReady')).ok, true, 'initial opening completes before another action');
        assert.deepEqual(await inReader(p, 'w.viewerDiagnostics.rawSnapshot()'), JSON.parse(await readFile(new URL('../../dist' + model, import.meta.url), 'utf8')));
      }
      async function inspectAndReturn(p, model, route, fromList) {
        await ready(p, model);
        if (width === 360) {
          await click(p, '#reading-tab-find', true);
          await waitFor(() => inReader(p, 'd.body.dataset.readingPanel==="find" && d.getElementById("reading-results").open'), 'find panel opens');
        }
        else await click(p, '#reading-result-summary', true);
        await click(p, '#reading-result-list .result-button', true);
        await waitFor(() => inReader(p, 'w.viewerDiagnostics.snapshot().selectedId'), 'native selection');
        if (width === 360) {
          await waitFor(() => inReader(p, 'd.body.dataset.readingPanel==="diagram"'), 'selection returns to the diagram');
          await click(p, '#reading-tab-menu', true);
        }
        const back = await inReader(p, '(() => {const a=d.getElementById("reading-return");return {hidden:a.hidden,href:a.href,target:a.target,height:a.getBoundingClientRect().height};})()');
        assert(!back.hidden && back.height >= 44, 'visible native return link');
        const destination = new URL(back.href);
        assert.equal(destination.origin + destination.pathname, server.origin + route);
        if (fromList) {
          const list = route === '/library/' ? destination.searchParams : new URLSearchParams(destination.searchParams.get('list'));
          assert.equal(list.get('q'), '26'); assert.equal(list.get('sort'), 'title');
          assert.equal(Number(list.get('scroll')), fromList.scroll, 'list scroll at ' + width + 'px via ' + destination.href);
        } else assert.equal(back.href, server.origin + route);
        assert.equal(back.target, '_top');
        await click(p, '#reading-return', true);
        await waitFor(() => p.evaluate('location.pathname===' + JSON.stringify(route) + ' && document.readyState==="complete" && !!document.querySelector("main h1")'), 'return to ' + route);
        assert.equal(await p.evaluate('!!document.getElementById("app-viewer-iframe")'), false, 'return leaves the Viewer host');
      }
      await configure(page);
      // The tour shares the real home iframe with its controls. A stage counter
      // alone can advance even if fitting the camera throws before focus moves.
      if (width === 360) {
        // A portrait phone with browser chrome leaves about 455px for the iframe.
        await page.cmd('Emulation.setDeviceMetricsOverride', { width, height: 704, deviceScaleFactor: 1, mobile: true });
      }
      await go(page, '/');
      const tour = expression => page.evaluate(`(() => {
        const frame = document.querySelector('iframe.meta-atlas');
        const d = frame?.contentDocument, w = frame?.contentWindow;
        return d && w && (${expression});
      })()`);
      await waitFor(() => tour('d.querySelector("#tour-start")?.getClientRects().length && !!w.metaAtlas'), 'home atlas tour');
      await tour('d.querySelector("#tour-start").click()');
      const cameras = new Set();
      for (let step = 1; step <= 4; step++) {
        const state = await tour(`({
          error: d.querySelector('#status').textContent,
          count: d.querySelector('#tour-count').textContent,
          focus: d.activeElement.id,
          camera: w.metaAtlas.getCamera()
        })`);
        assert.equal(state.error, '', 'tour step ' + step + ' at ' + width + 'px: ' + state.error);
        assert.equal(state.count, step + ' / 4');
        assert.equal(state.focus, 'tour-title');
        cameras.add(JSON.stringify(state.camera));
        await tour('d.querySelector("#tour-next").click()');
      }
      assert.equal(cameras.size, 4, 'each tour stop has its own camera');
      assert(await tour('d.querySelector("#atlas-tour").hidden && d.activeElement.id === "tour-start" && !d.querySelector("#status").textContent'));
      if (width === 360) await configure(page);
      const opened = [];
      page.events.addEventListener('Page.windowOpen', ({detail}) => opened.push({url:detail.url,userGesture:detail.userGesture}));
      const targets = async () => (await (await fetch('http://127.0.0.1:' + page.port + '/json/list')).json()).filter(t => t.type === 'page');
      for (const [article, model] of [
        ['/docs/works/knowledge-questions/', '/preview-reconstruction/models/knowledge_questions.3dsl-work.json'],
        ['/docs/usage/first-work/', '/preview-reconstruction/models/first_work.3dsl-work.json'],
      ]) {
        await go(page, '/library/');
        await click(page, '.work-guides summary');
        await click(page, '.work-guides a[href="' + article + '"]');
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
      // A shorter viewport gives even the three-card public list room to scroll on desktop.
      await page.cmd('Emulation.setDeviceMetricsOverride', { width, height: 480, deviceScaleFactor: 1, mobile: width === 360 });
      for (const detail of [false, true]) {
        await go(page, '/library/');
        await page.evaluate(`(() => {const q=document.getElementById('search'), s=document.getElementById('sort');
          q.value='26'; q.dispatchEvent(new Event('input')); s.value='title'; s.dispatchEvent(new Event('change'));})()`);
        let listScroll;
        const route = detail ? '/library/26010501/' : '/library/';
        if (detail) {
          listScroll = await click(page, '[data-library-id="26010501"] .work-detail');
          await waitFor(() => page.evaluate('location.pathname===' + JSON.stringify(route) + ' && document.readyState==="complete"'), 'Library to work details');
        }
        const selector = detail ? 'main a[href^="/app/viewer/?"]' : '[data-library-id="26010501"] .reading-viewer';
        const y = await click(page, selector);
        if (!detail) listScroll = y;
        await inspectAndReturn(page, model, route, { scroll: listScroll });
        if (detail) await click(page, 'main a[href^="/library/?"]');

        const listRestored = () => page.evaluate(`location.pathname==='/library/' && document.readyState==='complete' &&
          document.getElementById('search')?.value==='26' && document.getElementById('sort')?.value==='title' &&
          Math.abs(scrollY-${listScroll}) <= 1`);
        await waitFor(listRestored, 'explicit return restores list filters and position');
        assert(listScroll > 0, 'fixture scrolls before leaving the list');
        listScroll = await click(page, '[data-library-id="26010501"] ' + (detail ? '.work-detail' : '.reading-viewer'));
        await waitFor(() => page.evaluate('location.pathname!=="/library/" && document.readyState==="complete"'), 'leave list again');
        await page.evaluate('history.back()');
        await waitFor(listRestored, 'browser Back restores list filters and position');
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
  console.log('[check:reading-journey] PASS ' + JSON.stringify({ journeys: results, unsafeReturnCases: 6, scope: 'Chromium viewport checks, including explicit return and browser Back to the filtered list' }));
} finally { await server.close(); }

// Follow the work page and full Viewer through a whole-to-detail round trip.
await import('./atlas-zoom.mjs');
await import('./atlas-handoff.mjs');
