// Chromium software WebGL at DPR3. This is not an Android hardware/crash dump.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {serveBuild,withBrowser,waitFor} from './site-browser.mjs';

const specimen=JSON.parse(await readFile(new URL('../../../reconstruction/ssot/models/meal_prototype.3dss.json',import.meta.url),'utf8'));
const scene={document_meta:structuredClone(specimen.document_meta),points:[],lines:[],aux:[]};
for(let i=0;i<252;i++) {
 const point=structuredClone(specimen.points[0]);
 point.meta={uuid:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')};
 point.signification={name:'会社の組織と取引の関係 '+i};
 point.appearance={
  position:[(i%6)*70,Math.floor(i%18/6)*50,0],frames:[1+Math.floor(i/18)],visible:true,
  marker:{primitive:'none',text:{content:'会社の組織と取引の関係 '+i,font:'Noto Sans JP',size:i%18===0?32:16,pose:{front:[0,0,1],up:[0,1,0]}}},
 };
 scene.points.push(point);
}
// Keep this fixture synthetic. It exercises a different loading pattern from
// the multi-frame example: a dense single frame with points AND edge captions.
const singleFrame={document_meta:structuredClone(specimen.document_meta),points:[],lines:[],aux:[]};
const sizes=[16,...Array(8).fill(9),...Array(36).fill(2.2),...Array(32).fill(1.5),
 ...Array(27).fill(1.6),...Array(38).fill(1)];
for(let i=0;i<142;i++) {
 const point=structuredClone(specimen.points[0]);
 point.meta={uuid:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0')};
 point.signification={name:'要素 '+i};
 point.appearance={
  position:[i%19===0?12:0,(i%12)*14-77,Math.floor(i/12)*16-88],
  frames:[1],visible:true,
  marker:{primitive:'none',text:{content:'図の要素 '+i,font:'Noto Sans JP',size:sizes[i],
   pose:{front:[1,0,0],up:[0,0,1]}}},
 };
 singleFrame.points.push(point);
}
for(let i=0;i<163;i++) {
 const edge=structuredClone(specimen.lines[0]);
 edge.meta={uuid:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0')};
 edge.signification.caption=['収録','関連','条件','効果','例外'][i%5];
 edge.appearance.end_a={ref:singleFrame.points[i%142].meta.uuid};
 edge.appearance.end_b={ref:singleFrame.points[(i+13)%142].meta.uuid};
 edge.appearance.frames=[1];
 edge.appearance.caption_text={font_size:i%8===0?1.4:.4,pose:{front:[1,0,0],up:[0,0,1]}};
 singleFrame.lines.push(edge);
}
const content=JSON.stringify(scene),singleContent=JSON.stringify(singleFrame);
const moduleRoot='/preview-reconstruction/viewer/runtime/renderer/labels/';
// Reject malformed test data before starting a browser or waiting for a draw.
const schema=JSON.parse(await readFile(new URL('../../../reconstruction/ssot/schemas/3DSS.schema.json',import.meta.url),'utf8'));
const {default:createAjv}=await import('../../../reconstruction/ssot/vendor/ajv/dist/ajv.js');
const previousAjv=globalThis.Ajv,previousFetch=globalThis.fetch;
try {
 globalThis.Ajv=createAjv;globalThis.fetch=async()=>({ok:true,status:200,json:async()=>structuredClone(schema)});
 const {createCoreControllers}=await import('../../../reconstruction/ssot/modeler_app/runtime/core/coreControllers.js');
 const validator=createCoreControllers({emit(){}}).validator;
 await validator.ensureInitialized();
 assert(validator.validate(scene),JSON.stringify(validator.getErrors()));
 assert(validator.validate(singleFrame),JSON.stringify(validator.getErrors()));
}finally{if(previousAjv===undefined)delete globalThis.Ajv;else globalThis.Ajv=previousAjv;globalThis.fetch=previousFetch;}
if(process.argv.includes('--static')) {console.log('[viewer-label-memory-browser] STATIC PASS strict fixture validation.');process.exit(0);}
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
  await waitFor(()=>evaluate("window.viewerDiagnostics && !viewerDiagnostics.snapshot().loading && (viewerDiagnostics.snapshot().renderAvailable || document.body.classList.contains('reading-error'))"),'reader result',45000);
  assert.equal(await evaluate('viewerDiagnostics.snapshot().renderAvailable'),true,await evaluate('document.getElementById("contract-status").textContent'));
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
  // Exercise the same public loading, fit and reopening path with every item
  // in one frame. The text and geometry are generated without user content.
  for(let i=0;i<3;i++) {
   const result=await evaluate('viewerDiagnostics.openText('+JSON.stringify(singleContent)+',"single-frame.json")');
   assert.equal(result.ok,true,JSON.stringify(result));
   assert.equal(await evaluate('viewerDiagnostics.snapshot().renderAvailable'),true);
   assert.deepEqual(await evaluate('viewerDiagnostics.rawSnapshot()'),singleFrame);
   const loaded=await stats();
   assert(loaded.count>0 && loaded.count<305,'only visible labels allocate: '+JSON.stringify(loaded));
   assert(loaded.bytes<=loaded.maxBytes);
   reports.push({stage:'single frame reopen '+i,...loaded});
   await evaluate('viewerDiagnostics.cameraZoom(-.3)');
   await evaluate('viewerDiagnostics.cameraOrbit(.1,.05)');
   await evaluate('viewerDiagnostics.fitAll()');
   await evaluate('viewerDiagnostics.waitForPaint()');
   assert.equal(await evaluate('viewerDiagnostics.snapshot().renderAvailable'),true);
   assert.deepEqual(await evaluate('viewerDiagnostics.rawSnapshot()'),singleFrame);
   const navigated=await stats();assert(navigated.bytes<=navigated.maxBytes);
   reports.push({stage:'single frame navigation '+i,...navigated});
  }
  assert.deepEqual(exceptions,[],'render errors are handled, without unhandled exceptions');
 });
 await mkdir(new URL('../../ci-logs/',import.meta.url),{recursive:true});
 await writeFile(new URL('../../ci-logs/viewer-label-memory.json',import.meta.url),JSON.stringify({scope:'Desktop Chromium SwiftShader, mobile viewport DPR3, no Android hardware claim',reports},null,2));
 console.log('[viewer-label-memory-browser] PASS multi-frame and single-frame raster limits, repeated opens, navigation, preserved data, visible/recoverable memory denial and WebGL loss.');
}finally{await server.close();}
