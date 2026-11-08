import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {serveBuild,withBrowser,waitFor} from './site-browser.mjs';
import {rendererMemory} from './linux-renderer-memory.mjs';
import {dragViewer} from '../lib/viewer-load-client.mjs';

const server=await serveBuild(), path='/diagnostics/viewer-load/';
const output=fileURLToPath(new URL('../../ci-logs/viewer-load-page.json',import.meta.url));
try {
 await withBrowser(async page=>{
  const {cmd,evaluate,events,pid}=page;
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true});
  await cmd('Network.enable');
  const urls=[];events.addEventListener('Network.requestWillBeSent',e=>urls.push(e.detail.request.url));
  const go=async(search='')=>{
    await cmd('Page.navigate',{url:server.origin+path+search});
    await waitFor(()=>evaluate("typeof readViewerLoadReport==='function'"),'device check page');
  };
  const status=()=>evaluate('readViewerLoadReport()');
  const click=id=>evaluate('document.getElementById('+JSON.stringify(id)+').click()');
  const untilPhase=async(phase,count)=>{
    const result=await waitFor(async()=>{const r=await status();return ((r?.phase===phase && (count===undefined || r.rows.length===count)) || r?.phase==='end') && r;},phase);
    if (phase!=='end') assert.equal(result.phase,phase,JSON.stringify(result));
    return result;
  };
  await go('?sample=1');
  assert(!urls.some(u=>/\.glb|reader\.html/.test(u)), 'no Viewer or mesh loads before start');
  assert((await evaluate("document.querySelector('meta[name=robots]').content")).includes('noindex'));
  await click('run');await untilPhase('sample');
  const originTime=await evaluate("document.querySelector('iframe').contentWindow.performance.timeOrigin");
  let done=false;
  const samples=[];
  const monitor=(async()=>{
    while(!done) {
      const t=performance.now(),r=await status(),m=await rendererMemory(pid).catch(()=>({}));
      samples.push({stage:r.rows.length,phase:r.phase,at:t,rendererPssBytes:m.rendererPssBytes??null});
      await delay(150);
    }
  })();
  let result;
  try {
    for(let stage=1;stage<=5;stage++) {
      await click('next');
      if(stage===4) {
        await untilPhase('gesture');
        await evaluate("document.querySelector('iframe').contentDocument.getElementById('viewer-canvas').dispatchEvent(new PointerEvent('pointermove'))");
        assert.equal((await status()).phase,'gesture','untrusted movement cannot satisfy the gesture');
        await dragViewer(page);
      }
      const held=await untilPhase('sample',stage);
      assert.equal(held.rows.length,stage);
      assert.equal(await evaluate("document.querySelector('iframe').contentWindow.performance.timeOrigin"),originTime,'reader document reused');
      assert(held.rows.at(-1).drawnTriangles>=held.rows.at(-1).triangles);
      assert.equal(held.rows.at(-1).decodedBitmaps,stage);
      assert.equal(held.rows.at(-1).closedBitmaps,stage-1);
      await delay(300);
    }
    await click('next');result=await untilPhase('end');
  } finally {done=true;await monitor;}
  assert.equal(result.status,'完了',JSON.stringify(result));assert.equal(result.rows[3].gesture,'touch');
  assert.deepEqual(result.rows.map(r=>[r.size,r.done,r.orbit]),['small','large','large','large','small'].map(s=>[s,true,true]));
  assert(!urls.some(u=>!u.startsWith(server.origin) && !u.startsWith('blob:') && !u.startsWith('data:')),'local-only run');
  // A retry interrupted by reload retains its stage but cannot become a pass.
  await click('run');await untilPhase('sample');await click('next');await untilPhase('sample',1);
  await cmd('Page.reload');
  await waitFor(()=>evaluate("window.readViewerLoadReport?.()?.status==='中断'"),'interrupted checkpoint');
  await click('run');await untilPhase('sample');await click('stop');
  assert.equal((await untilPhase('end')).status,'中断');
  await go();await click('run');
  await untilPhase('gesture',4);await dragViewer(page);
  assert.equal((await untilPhase('end')).status,'完了','ordinary phone path needs a single drag');
  await cmd('Network.setBlockedURLs',{urls:['*small/grid.*.glb']});
  await click('run');
  // Fixture failure is also exercised separately below at the JSON boundary.
  await waitFor(()=>evaluate("readViewerLoadReport()?.phase==='load'"),'begin asset load');
  await click('stop');await untilPhase('end');
  await cmd('Network.setBlockedURLs',{urls:['*small/scene.*.json']});
  await click('run');assert.equal((await untilPhase('end')).status,'失敗','failed model is not a completed sample');
  await mkdir(fileURLToPath(new URL('../../ci-logs/',import.meta.url)),{recursive:true});
  await writeFile(output,JSON.stringify({scope:'Desktop Chromium, emulated touch, Linux sampled renderer PSS',result,samples},null,2));
  console.log('[viewer-load-page] PASS five same-document loads, three large, actual camera response, retained interruption and failed input.');
 });
} finally {await server.close();}
