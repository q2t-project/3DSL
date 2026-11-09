import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { documentSecurityHeaders } from '../../config/document-security.mjs';
import { onRequest } from '../../functions/docs/works/structure-classification.js';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const text = await readFile(new URL('../../dist/_headers', import.meta.url), 'utf8');
const headers = {};
let global = false;
for (const line of text.split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue;
  if (!/^\s/.test(line)) { global = line === '/*'; continue; }
  if (!global) continue;
  const split = line.indexOf(':');
  const name = line.slice(0, split).trim().toLowerCase();
  const value = line.slice(split + 1).trim();
  headers[name] = headers[name] ? headers[name] + ', ' + value : value;
}
for (const [name,value] of Object.entries(documentSecurityHeaders)) assert.equal(headers[name.toLowerCase()],value);
for (const method of ['GET','HEAD']) {
  const response = onRequest({request:new Request('https://3dsl.jp/docs/works/structure-classification/',{method})});
  assert.equal(response.status,410);
  for (const [name,value] of Object.entries(documentSecurityHeaders)) assert.equal(response.headers.get(name),value);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
  const body = await response.text();
  assert(method === 'HEAD' ? body === '' : body.includes('公開終了'));
}

const fixtures = new Map([['/__headers_ci__/test.html',Buffer.from('<!doctype html><title>CSP fixture</title><body>Loopback fixture</body>')]]);
const site = await serveBuild(fixtures,undefined,headers);
const host = await serveBuild(new Map([['/embed.html',Buffer.from(`<!doctype html><iframe src="${site.origin}/app/viewer/?model=/_data/library/26020401/model.3dss.json" allow="fullscreen"></iframe><iframe src="${site.origin}/app/modeler/" allow="clipboard-read; clipboard-write"></iframe>`)]]));
try {
  await withBrowser(async ({cmd,evaluate,events}) => {
    const requests = [], failed = [], contexts = new Map();
    const providerIntercepted = new Set();
    events.addEventListener('Network.requestWillBeSent',({detail}) => requests.push(detail));
    events.addEventListener('Network.loadingFailed',({detail}) => failed.push(detail));
    events.addEventListener('Runtime.executionContextCreated',({detail}) => contexts.set(detail.context.id,detail.context));
    events.addEventListener('Runtime.executionContextDestroyed',({detail}) => contexts.delete(detail.executionContextId));
    events.addEventListener('Runtime.executionContextsCleared',() => contexts.clear());
    await cmd('Runtime.enable');
    await cmd('Network.enable');
    events.addEventListener('Fetch.requestPaused',({detail}) => {
      providerIntercepted.add(detail.networkId);
      void cmd('Fetch.failRequest',{requestId:detail.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
    });
    await cmd('Fetch.enable',{patterns:[{urlPattern:'https://formspree.io/*',requestStage:'Request'}]});
    // No fixture submission can reach an external service.
    await cmd('Network.setBlockedURLs',{urlPatterns:[
      {urlPattern:site.origin+'/*',block:false},{urlPattern:host.origin+'/*',block:false},
      {urlPattern:'http://*:*/*',block:true},{urlPattern:'https://*:*/*',block:true},
    ]});
    await cmd('Page.addScriptToEvaluateOnNewDocument',{source:"window.__csp=[];addEventListener('securitypolicyviolation',e=>__csp.push({directive:e.effectiveDirective,uri:e.blockedURI}));"});
    await cmd('Page.navigate',{url:site.origin+'/__headers_ci__/test.html'});
    await waitFor(()=>evaluate('Array.isArray(window.__csp)'), 'policy fixture');
    const base = await evaluate('document.baseURI');
    await evaluate("const b=document.createElement('base'); b.href='https://blocked.invalid/';document.head.append(b)");
    await waitFor(()=>evaluate("__csp.some(x=>x.directive==='base-uri')"),'cross-origin base refused');
    assert.equal(await evaluate('document.baseURI'),base);
    await evaluate("document.querySelector('base').remove();const o=document.createElement('object');o.type='text/html';o.data='data:text/html,<script>parent.objectRan=true</script>';document.body.append(o)");
    await waitFor(()=>evaluate("__csp.some(x=>x.directive==='object-src')"),'object refused');
    assert.equal(await evaluate('window.objectRan === true'),false);
    await evaluate("const t=document.createElement('iframe');t.name='probe';document.body.append(t);const f=document.createElement('form');f.action='https://blocked.invalid/submit';f.method='POST';f.target='probe';document.body.append(f);f.submit()");
    await waitFor(()=>evaluate("__csp.some(x=>x.directive==='form-action')"),'foreign form refused');

    await cmd('Page.navigate',{url:site.origin+'/contact/'});
    await waitFor(()=>evaluate("!!document.querySelector('#contact-form')"),'actual contact form');
    await evaluate("const t=document.createElement('iframe');t.name='probe';document.body.append(t);const f=document.querySelector('#contact-form');f.target='probe';f.querySelector('[name=email]').value='csp-fixture@example.invalid';f.querySelector('[name=message]').value='loopback CSP test';HTMLFormElement.prototype.submit.call(f)");
    const allowed = await waitFor(()=>requests.find(x=>x.request.url==='https://formspree.io/f/xnjnpgjp' && x.request.method==='POST'),'Formspree native POST allowed by CSP');
    await waitFor(()=>providerIntercepted.has(allowed.requestId) || failed.some(x=>x.requestId===allowed.requestId && x.blockedReason==='inspector'),'external POST blocked by test transport');
    assert(!(await evaluate('__csp')).some(x=>x.directive==='form-action'));

    await cmd('Page.navigate',{url:host.origin+'/embed.html'});
    await waitFor(()=>evaluate("location.pathname==='/embed.html' && document.readyState==='complete'"),'cross-origin embedding host');
    async function childHas(expression) {
      for (const context of contexts.values()) {
        if (context.origin !== site.origin || !context.auxData?.isDefault) continue;
        try {
          const result = await cmd('Runtime.evaluate',{contextId:context.id,expression,returnByValue:true});
          if (result.result.value === true) return true;
        } catch { /* A navigating frame can discard its context. */ }
      }
      return false;
    }
    await waitFor(()=>childHas('!!window.viewerBootReady && !!window.viewerDiagnostics?.rawSnapshot()?.points?.length'),'cross-origin embedded Viewer work',45000);
    await waitFor(()=>childHas("!!document.querySelector('#modeler-root')?.__ownedUi"),'cross-origin embedded Modeler',45000);
  });
} finally { await host.close(); await site.close(); }
console.log('[check:web-defense] PASS generated/Function headers, rejected foreign base/object/form, permitted Formspree native POST intercepted before network, cross-origin Viewer work and Modeler boot. No service submission or broad XSS claim.');
