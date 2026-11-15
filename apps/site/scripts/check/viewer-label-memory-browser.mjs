// Chromium software WebGL at DPR3. This is not an Android hardware/crash dump.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {serveBuild,withBrowser,waitFor} from './site-browser.mjs';

const specimen=JSON.parse(await readFile(new URL('../../../reconstruction/ssot/legend_lab/model.3dss.json',import.meta.url),'utf8'));
const scene={document_meta:structuredClone(specimen.document_meta),points:[],lines:[],aux:[]};
for(let i=0;i<252;i++) {
 const point=structuredClone(specimen.points[0]);
 point.meta.uuid='00000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
 point.signification={name:'会社の組織と取引の関係 '+i};
 point.appearance={
  position:[(i%6)*70,Math.floor(i%18/6)*50,0],frames:[1+Math.floor(i/18)],visible:true,
  marker:{primitive:'none',text:{content:'会社の組織と取引の関係 '+i,font:'Noto Sans JP',size:i%18===0?32:16,pose:{front:[0,0,1],up:[0,1,0]}}},
 };
 scene.points.push(point);
}
const content=JSON.stringify(scene),moduleRoot='/preview-reconstruction/viewer/runtime/renderer/labels/';
const fixtures=new Map([['/label-memory.json',Buffer.from(content)]]);
const server=await serveBuild(fixtures);
const reports=[];
try {
 await withBrowser(async({cmd,evaluate,events})=>{
  const exceptions=[];events.addEventListener('Runtime.exceptionThrown',e=>exceptions.push(e.detail.exceptionDetails.text));
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true});
  await cmd('Page.navigate',{url:server.origin+'/preview-reconstruction/contract_viewer/reader.html?model=/label-memory.json&dbgHub=1'});
  await waitFor(()=>evaluate("window.viewerDiagnostics?.snapshot().renderAvailable && !viewerDiagnostics.snapshot().loading"),'loaded reader',45000);
  const stats=()=>evaluate("import("+JSON.stringify(moduleRoot+'textSprite.js')+").then(m=>m.getTextTextureStats())");
  const observe=async stage=>{
   const s=await stats();assert(s.count>0 && s.count<=18,'only the active frame has textures: '+JSON.stringify(s));
   assert(s.bytes<=s.maxBytes);
   assert.deepEqual(await evaluate('viewerDiagnostics.rawSnapshot()'),scene,'author data retained');
   reports.push({stage,...s});
  };
  await observe('first');
  for(const frame of [8,14,1,13,1]) {
   await evaluate('viewerDiagnostics.setFrame('+frame+')');await observe('frame '+frame);
  }
  await evaluate('viewerDiagnostics.cameraZoom(-.3)');await evaluate('viewerDiagnostics.cameraOrbit(.1,.05)');
  for(let i=0;i<5;i++) {
   const result=await evaluate('viewerDiagnostics.openText('+JSON.stringify(content)+',"labels.json")');
   assert.equal(result.ok,true,JSON.stringify(result));await observe('reopen '+i);
  }
  // Deliberately deny raster memory through the internal config. Public file
  // loading must reject promptly, release partial allocations and retain the
  // previous authored record even when restoring its rendering also fails.
  const config=JSON.stringify(moduleRoot+'labelConfig.js');
  await evaluate('import('+config+').then(m=>{window.__oldLabelBudget=m.labelConfig.raster.maxCacheBytes;m.labelConfig.raster.maxCacheBytes=1;})');
  const denied=await evaluate('viewerDiagnostics.openText('+JSON.stringify(content)+',"denied.json")');
  assert.equal(denied.ok,false);
  assert.match(denied.error,/描画メモリの上限/);
  await waitFor(()=>evaluate("document.body.classList.contains('reading-error')"),'visible memory failure');
  assert.deepEqual(await evaluate('viewerDiagnostics.rawSnapshot()'),scene);
  assert.equal((await stats()).bytes,0,'failed mount and restoration release partial images');
  await evaluate('import('+config+').then(m=>{m.labelConfig.raster.maxCacheBytes=window.__oldLabelBudget;})');
  assert.equal((await evaluate('viewerDiagnostics.openText('+JSON.stringify(content)+',"recovered.json")')).ok,true);
  await observe('memory recovery');

  const extension=await evaluate("(()=>{window.__contextLoss=document.getElementById('viewer-canvas').getContext('webgl2').getExtension('WEBGL_lose_context');return !!window.__contextLoss;})()");
  assert(extension,'test WebGL context loss extension');
  await evaluate('window.__contextLoss.loseContext()');
  await waitFor(()=>evaluate("document.body.classList.contains('reading-error') && document.getElementById('contract-status').textContent.includes('3D描画が停止')"),'visible context loss');
  const draw=await evaluate("viewerHub.whenPainted({timeoutMs:2000}).then(()=>({ok:true}),e=>({ok:false,message:e.message}))");
  assert.equal(draw.ok,false);assert.match(draw.message,/3D描画が停止/);
  assert.deepEqual(await evaluate('viewerDiagnostics.rawSnapshot()'),scene);
  await evaluate('window.__contextRestored=false;document.getElementById("viewer-canvas").addEventListener("webglcontextrestored",()=>{window.__contextRestored=true;},{once:true});window.__contextLoss.restoreContext()');
  await waitFor(()=>evaluate('window.__contextRestored'),'restore test context');
  assert.equal((await evaluate('viewerDiagnostics.openText('+JSON.stringify(content)+',"context-recovered.json")')).ok,true);
  await observe('context recovery');
  assert.deepEqual(exceptions,[],'render errors are handled, without unhandled exceptions');
 });
 await mkdir(new URL('../../ci-logs/',import.meta.url),{recursive:true});
 await writeFile(new URL('../../ci-logs/viewer-label-memory.json',import.meta.url),JSON.stringify({scope:'Desktop Chromium SwiftShader, mobile viewport DPR3, no Android hardware claim',reports},null,2));
 console.log('[viewer-label-memory-browser] PASS active-frame raster limits, 5 repeated opens, preserved data, visible/recoverable memory denial and WebGL loss.');
}finally{await server.close();}
