import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const server=await serveBuild();
try {
  await withBrowser(async ({cmd,evaluate,events})=>{
    const requests=[], errors=[];
    // Substitute a known local image on retry, so this never sends a URL to the service.
    const png=await readFile(new URL('../../dist/_data/library/26020401/assets/財産法.png',import.meta.url));
    events.addEventListener('Fetch.requestPaused',({detail})=>{
      const u=new URL(detail.request.url);
      let action;
      if(u.origin===server.origin) action=cmd('Fetch.continueRequest',{requestId:detail.requestId});
      else if(u.hostname==='api.qrserver.com') {
        requests.push({url:u.href,referrer:Object.entries(detail.request.headers).some(([k])=>k.toLowerCase()==='referer')});
        action=requests.length===1 ? cmd('Fetch.failRequest',{requestId:detail.requestId,errorReason:'BlockedByClient'})
          : cmd('Fetch.fulfillRequest',{requestId:detail.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:png.toString('base64')});
      } else action=cmd('Fetch.failRequest',{requestId:detail.requestId,errorReason:'BlockedByClient'});
      action.catch(e=>errors.push(e.message));
    });
    await cmd('Fetch.enable',{patterns:[{urlPattern:'https://*'},{urlPattern:'http://*'}]});
    const url=server.origin+'/library/26020401/';
    await cmd('Page.navigate',{url:url+'?test=local-only#section'});
    await waitFor(()=>evaluate("document.readyState==='complete' && document.querySelector('#lib-qr')?.hidden===false"),'QR control');
    await evaluate("document.querySelector('#lib-qr').scrollIntoView();new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
    assert.equal(await evaluate("document.querySelector('#lib-qr-inline').hasAttribute('src')"),false);
    assert.equal(requests.length,0,'ordinary reading makes no QR request');
    const toggle=()=>evaluate("document.querySelector('#lib-qr summary').click()");
    await toggle();
    await waitFor(()=>evaluate("document.querySelector('#lib-qr-status').textContent.includes('取得できません')"),'off-line fallback');
    assert(await evaluate("!!document.querySelector('#lib-copy') && !document.querySelector('#lib-copy').disabled"));
    await toggle();await waitFor(()=>evaluate("!document.querySelector('#lib-qr').open"),'close');
    await toggle();
    await waitFor(()=>evaluate("!document.querySelector('#lib-qr-inline').hidden && document.querySelector('#lib-qr-inline').naturalWidth>0"),'retry shows QR image');
    assert.equal(requests.length,2);
    for(const request of requests) {
      const u=new URL(request.url);
      assert.equal(u.pathname,'/v1/create-qr-code/');assert.equal(u.searchParams.get('data'),url);
      assert.equal(request.referrer,false);
    }
    assert.deepEqual(errors,[]);
    console.log('[library-qr] PASS no request on open/scroll, opt-in sends only the work URL, failure and retry; external delivery simulated.');
  });
} finally {await server.close();}
