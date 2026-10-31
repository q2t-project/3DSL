// Run after sync:reconstruction-preview. Requires Playwright and Chromium.
// FINANCE_MODEL_PATH points to the generated .3dss.json, CHROME_PATH to Chromium.
// Optional QA_FONT_DIR loads a Japanese test font on minimal Linux images.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const root=path.join(repo,'apps/site/public'),prefix='/preview-reconstruction';
const require=createRequire(process.env.PLAYWRIGHT_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.PLAYWRIGHT_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'/') :import.meta.url);
const {chromium}=require('playwright');
assert(process.env.FINANCE_MODEL_PATH,'FINANCE_MODEL_PATH is required');assert(process.env.CHROME_PATH,'CHROME_PATH is required');
const modelText=fs.readFileSync(process.env.FINANCE_MODEL_PATH,'utf8'),model=JSON.parse(modelText);
const server=http.createServer((req,res)=>{
 const p=path.join(root,decodeURI(req.url.split('?')[0]));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{let content=fs.readFileSync(p);if(p.endsWith('/contract_viewer/viewerBridge.js'))content=content.toString().replace('const hub = mountedViewer?.hub;','const hub = mountedViewer?.hub; window.__qaReadingHub=hub;');
 if(p.endsWith('/renderer/context.js'))content=content.toString().replace('({ ...debugMetrics, readingPresentation:', '({ ...debugMetrics, readingVisibleLabels:Array.from(labelLayer.runtime.labels).filter(([,v])=>v.obj.visible).map(([id])=>id), readingPresentation:');
 res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.wasm':'application/wasm'}[path.extname(p)]??'application/octet-stream'));res.end(content);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],errors=[];
try{
 for(const [width,height] of [[320,740],[390,844],[720,900],[1280,900]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}/contract_viewer/index.html`);await page.evaluate(()=>window.viewerBootReady);
  if(process.env.QA_FONT_DIR){const dir=process.env.QA_FONT_DIR,css=fs.readFileSync(path.join(dir,'400.css'),'utf8').replace(/url\(([^)]+)\)/g,(_,v)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(dir,v.replace(/['"]/g,''))).toString('base64')})`);await page.addStyleTag({content:css+'\nbody{font-family:"Noto Sans JP",sans-serif}'});await page.evaluate(t=>document.fonts.load('16px "Noto Sans JP"',t),modelText);}
  const opened=await page.evaluate(t=>window.viewerDiagnostics.openText(t,'finance-mini.3dss.json'),modelText);assert(opened.ok,JSON.stringify(opened));
  const initial=await page.evaluate(()=>window.viewerDiagnostics.snapshot());assert.equal(initial.frame,0);assert(Math.abs(initial.camera.target.x)<5,'initial target uses this frame rather than hidden frames');
  const layout=await page.evaluate(()=>({panel:document.body.dataset.readingPanel,canvas:document.getElementById('viewer-canvas').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1,diag:window.__qaReadingHub.getRenderDiagnostics()}));
  assert(!layout.overflow);assert(layout.diag.initialReadingView);if(width<=650){assert.equal(layout.panel,'diagram');assert(layout.canvas.height>height*.6);await page.locator('#reading-mobile-next').click();await page.waitForFunction(()=>window.viewerDiagnostics.snapshot().frame===1);assert.equal((await page.evaluate(()=>window.viewerDiagnostics.snapshot())).frame,1);}
  const frames=[];
  for(let n=0;n<=5;n++){
   await page.evaluate(n=>window.viewerDiagnostics.setFrame(n),n);const state=await page.evaluate(()=>window.viewerDiagnostics.snapshot());assert.equal(state.frame,n);assert(Object.values(state.camera.target).every(Number.isFinite));
   frames.push({frame:n,camera:state.camera});
  }
  await page.evaluate(()=>window.viewerDiagnostics.setFrame(1));const previous=await page.evaluate(()=>window.__qaReadingHub.getRenderDiagnostics().labelVisible);
  const annotation=model.aux.map(a=>a.appearance?.module?.extension?.parametric?.params).find(p=>p?.frame===1&&p?.label_uuid).label_uuid;
  await page.evaluate(id=>window.viewerDiagnostics.select(id),annotation);await page.evaluate(()=>window.viewerDiagnostics.fitSelection());await page.waitForTimeout(150);const detailMetrics=await page.evaluate(()=>window.__qaReadingHub.getRenderDiagnostics());const enlarged=detailMetrics.labelVisible;assert(detailMetrics.readingVisibleLabels.includes(annotation),'enlarged selection reveals its detailed label');
  await page.evaluate(()=>window.viewerDiagnostics.setFrame(0));const beforeSelection=(await page.evaluate(()=>window.viewerDiagnostics.snapshot())).camera;
  const id=model.points.find(p=>p.appearance.frames?.includes(0)&&p.appearance.marker.primitive==='box').meta.uuid;
  await page.evaluate(id=>window.viewerDiagnostics.select(id),id);assert.deepEqual((await page.evaluate(()=>window.viewerDiagnostics.snapshot())).camera,beforeSelection,'selection alone keeps camera');
  if(width<=650){await page.locator('#reading-tab-info').click();assert.equal(await page.evaluate(()=>document.body.dataset.readingPanel),'info');await page.locator('#reading-tab-diagram').click();}
  await page.evaluate(()=>window.viewerDiagnostics.cameraReset());assert.deepEqual((await page.evaluate(()=>window.viewerDiagnostics.snapshot())).camera,initial.camera,'Home restores opening view');
  assert.deepEqual(await page.evaluate(()=>window.viewerDiagnostics.rawSnapshot()),model,'browsing retains all accounting and geometry data');
  if(process.env.FINANCE_QA_OUT){fs.mkdirSync(process.env.FINANCE_QA_OUT,{recursive:true});await page.screenshot({path:path.join(process.env.FINANCE_QA_OUT,`finance-${width}.png`)});}
  results.push({width,height,canvas_height:layout.canvas.height,initial_view:true,frames,labels_before_zoom:previous,labels_after_zoom:enlarged,source_preserved:true});await page.close();
 }
 assert.deepEqual(errors,[]);
 const report={result:'PASS',scope:'Generated Viewer in Chromium software WebGL; not physical Android or human readability approval.',states:results,page_errors:errors};
 if(process.env.FINANCE_QA_OUT)fs.writeFileSync(path.join(process.env.FINANCE_QA_OUT,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,widths:results.map(r=>r.width),checks:'initial view, 6 frames, mobile panels, zoom labels, selection, Home and raw source preservation'},null,2));
}finally{await browser.close();server.close();}
