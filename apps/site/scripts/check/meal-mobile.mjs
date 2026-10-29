// Actual generated Viewer with software WebGL and trusted CDP touch input.
// Emulated Chromium touch is not Android hardware or reader comprehension.
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
const viewportWidth = Number(process.env.MEAL_TOUCH_VIEWPORT_WIDTH) || null;
if (!chrome) {
  console.log('[check:meal-mobile] SKIP: Chromium unavailable; no Viewer/WebGL/mobile display PASS claimed.');
} else if (!viewportWidth) {
  // Use a fresh Chromium process for each device. Its emulated touchscreen can
  // otherwise retain browser gesture state across viewport changes/navigation.
  const cases=[];
  for(const width of [360,390,1280]) {
    const child=spawn(process.execPath,[fileURLToPath(import.meta.url)],{env:{...process.env,MEAL_TOUCH_VIEWPORT_WIDTH:String(width)},stdio:'inherit'});
    await new Promise((resolve,reject)=>{
      child.on('error',reject);
      child.on('exit',(code,signal)=>code===0?resolve():reject(new Error(`Meal interaction check ${width} failed (${code??signal})`)));
    });
    const result=JSON.parse(await fs.readFile(path.join(site,'ci-logs',`meal-mobile-results-${width}.json`),'utf8'));
    cases.push(...result.cases);
  }
  await fs.writeFile(path.join(site,'ci-logs','meal-mobile-results.json'),JSON.stringify({cases,scope:'Generated actual Viewer, software WebGL, trusted CDP touch at 360/390 and mouse at 1280; not Android hardware or reader comprehension.'},null,2));
  console.log('[check:meal-mobile] PASS 360/390 trusted emulated touch: word pick, 6px jitter, drag/pinch/cancel safety, fixed pane navigation, information swipe without page scroll, short viewport, search, selected fit, unchanged input; 1280 mouse. Not Android hardware.');
} else {
  assert([360,390,1280].includes(viewportWidth),'known interaction test viewport');
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
    const painted = () => evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    async function until(expression, message) {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        if (await evaluate(expression)) return;
        await sleep(50);
      }
      const failure=await evaluate('({state:window.viewerDiagnostics.snapshot(),panel:document.body.dataset.readingPanel,informationScrollTop:document.getElementById("contract-info").scrollTop,events:window.__mealPointerEvents??[]})');
      await fs.writeFile(path.join(logs,'meal-mobile-last-input.json'),JSON.stringify(failure,null,2));
      assert.fail(message + ': ' + JSON.stringify(failure));
    }
    async function touch(type, points) {
      await cmd('Input.dispatchTouchEvent', {type, touchPoints:points.map((point,i)=>({x:point.x,y:point.y,id:i+1,radiusX:2,radiusY:2}))});
    }
    async function tap(point, jitter = 0) {
      await touch('touchStart',[point]);
      if(jitter)await touch('touchMove',[{x:point.x+jitter,y:point.y}]);
      await touch('touchEnd',[]);
      await painted();
    }
    async function clickElement(expression, useTouch) {
      await evaluate(`(${expression}).scrollIntoView({block:'center'})`);
      await painted();
      const point=await evaluate(`(() => {const r=(${expression}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      if(useTouch)await tap(point);
      else {
        await cmd('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
        await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
        await painted();
      }
    }
    async function mobileLayout() {
      return evaluate(`(() => {const canvas=document.getElementById('viewer-canvas'),nav=document.getElementById('reading-tab-diagram').closest('nav'),rect=nav.getBoundingClientRect();return {panel:document.body.dataset.readingPanel,width:innerWidth,height:innerHeight,pageY:scrollY,pageHeight:document.scrollingElement.scrollHeight,pageWidth:document.scrollingElement.scrollWidth,nav:{top:rect.top,bottom:rect.bottom},canvas:[canvas.clientWidth,canvas.clientHeight],buttons:['diagram','info','find','tools'].map(name=>{const b=document.getElementById('reading-tab-'+name),r=b.getBoundingClientRect();return {name,pressed:b.getAttribute('aria-pressed'),top:r.top,bottom:r.bottom,height:r.height,reachable:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===b};})};})()`);
    }
    async function assertMobileViewport(message) {
      const layout=await mobileLayout();
      assert.equal(layout.pageY,0,message+': page stays at origin');
      assert(layout.pageHeight<=layout.height+1,message+': no vertically scrolling page '+JSON.stringify(layout));
      assert(layout.pageWidth<=layout.width+1,message+': no horizontal page overflow');
      assert(layout.nav.top>=0&&layout.nav.bottom<=layout.height+1,message+': navigation remains inside viewport');
      for(const button of layout.buttons)assert(button.height>=44&&button.reachable,message+': reachable touch target '+button.name);
      assert(layout.canvas.every(n=>n>0),message+': mounted canvas keeps nonzero dimensions');
      return layout;
    }
    async function choosePanel(name) {
      await clickElement(`document.getElementById('reading-tab-${name}')`,true);
      await until(`document.body.dataset.readingPanel===${JSON.stringify(name)}`,'navigation opens '+name);
      const layout=await assertMobileViewport(name+' pane');
      assert.equal(layout.buttons.find(button=>button.name===name).pressed,'true','active navigation state');
      return layout;
    }
    async function swipeInformation() {
      const rect=await evaluate(`(() => {const r=document.getElementById('contract-info').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};})()`);
      const x=rect.left+rect.width*.65,startY=rect.top+rect.height*.8,endY=rect.top+rect.height*.25;
      await touch('touchStart',[{x,y:startY}]);
      for(let step=1;step<=7;step++) {
        await touch('touchMove',[{x,y:startY+(endY-startY)*step/7}]);
        await sleep(25);
      }
      await touch('touchEnd',[]);
      await painted();
    }
    async function waitForInformationScrollSettled() {
      const started=Date.now();
      let previous=await evaluate(`document.getElementById('contract-info').scrollTop`),stableSince=Date.now();
      while(Date.now()-started<5000) {
        await sleep(50);
        const current=await evaluate(`document.getElementById('contract-info').scrollTop`);
        if(current!==previous){previous=current;stableSince=Date.now();}
        else if(Date.now()-stableSince>=300)return;
      }
      assert.fail('native information scrolling did not settle within 5s: '+JSON.stringify(await mobileLayout()));
    }
    async function projectPoint(point) {
      return evaluate(`(async()=>{const THREE=await import('/preview-reconstruction/vendor/three/build/three.module.js'),s=window.viewerDiagnostics.snapshot().camera,r=document.getElementById('viewer-canvas').getBoundingClientRect(),c=new THREE.PerspectiveCamera(s.fov,r.width/r.height,.1,10000),t=s.target;c.up.set(0,0,1);c.position.set(t.x+s.distance*Math.sin(s.phi)*Math.cos(s.theta),t.y+s.distance*Math.sin(s.phi)*Math.sin(s.theta),t.z+s.distance*Math.cos(s.phi));c.lookAt(t.x,t.y,t.z);c.updateMatrixWorld(true);const p=new THREE.Vector3(...${JSON.stringify(point)}).project(c);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,ndc:[p.x,p.y,p.z]};})()`);
    }
    const measure = `(() => { const root=document.getElementById('viewer-root'),canvas=document.getElementById('viewer-canvas'),tools=document.getElementById('reading-tools'),dock=document.getElementById('viewer-rightdock'); const canvasRect=canvas.getBoundingClientRect(),dockRect=dock.getBoundingClientRect(); return {width:innerWidth,scroll:document.documentElement.scrollWidth,rootHeight:root.getBoundingClientRect().height,canvasHeight:canvas.clientHeight,canvasWidth:canvas.clientWidth,canvasBottom:canvasRect.bottom,dockTop:dockRect.top,canvasPixels:[canvas.width,canvas.height],toolsOpen:tools.open,state:window.viewerDiagnostics.snapshot()}; })()`;
    await cmd('Page.enable');
    await cmd('Runtime.enable');
    const cases = [];
    for (const width of [viewportWidth]) {
      errors.length = 0;
      const useTouch=width<650;
      // Reset Chromium's emulated touchscreen between documents/viewports.
      // A completed gesture in the prior case must not suppress the next page.
      await cmd('Emulation.setTouchEmulationEnabled', {enabled:false});
      await cmd('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: useTouch });
      await cmd('Emulation.setTouchEmulationEnabled', {enabled:useTouch,maxTouchPoints:2});
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
        const initialLayout=await assertMobileViewport('initial diagram');
        assert.equal(initialLayout.panel,'diagram','mobile starts on diagram');
        assert(actual.canvasHeight >= 360, 'actual mobile canvas height >=360px');
        assert(actual.canvasBottom <= actual.dockTop + 1, 'mobile gizmo strip does not overlap drawing');
        const toolLayout=await choosePanel('tools');
        assert.deepEqual(toolLayout.canvas,initialLayout.canvas,'tools pane preserves canvas dimensions');
        assert(await evaluate(`document.getElementById('reading-tools').open&&getComputedStyle(document.getElementById('reading-preset')).visibility==='visible'`),'operation pane exposes preset controls');
        const findLayout=await choosePanel('find');
        assert.deepEqual(findLayout.canvas,initialLayout.canvas,'find pane preserves canvas dimensions');
        assert(await evaluate(`getComputedStyle(document.getElementById('reading-search')).visibility==='visible'`),'search is available from persistent navigation');
        assert(await evaluate(`!['auto','scroll'].includes(getComputedStyle(document.getElementById('reading-result-list')).overflowY)`),'result list does not introduce another scroll container');
        await choosePanel('diagram');
      } else assert.equal(actual.toolsOpen, true, 'desktop controls remain expanded');
      const roleId='f225f07d-b1ab-5ece-8834-d60b3726bec7';
      await evaluate(`document.getElementById('viewer-canvas').scrollIntoView({block:'center'});window.__mealPointerEvents=[];for(const type of ['pointerdown','pointerup','pointermove','pointerleave','pointercancel','touchstart','touchend','click'])document.addEventListener(type,event=>window.__mealPointerEvents.push({target:event.target.id,type:event.type,timeStamp:event.timeStamp,panel:document.body.dataset.readingPanel,trusted:event.isTrusted,pointerType:event.pointerType,primary:event.isPrimary,button:event.button,buttons:event.buttons,x:event.clientX,y:event.clientY}),{passive:true,capture:true});`);
      await painted();
      const beforePick=await evaluate('window.viewerDiagnostics.snapshot().camera');
      // Inside the visible word but away from its 0.4-radius marker and links.
      const word=await projectPoint([-40,0,67]);
      await fs.writeFile(path.join(logs,`meal-mobile-input-${width}.json`),JSON.stringify({word,beforePick},null,2));
      assert(word.y>0&&word.y<900&&word.x>0&&word.x<width,'word target inside viewport');
      assert.equal(await evaluate(`document.elementFromPoint(${word.x},${word.y})?.id`),'viewer-canvas','projected word reaches the canvas');
      if(useTouch)await tap(word);
      else {
        await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:word.x,y:word.y,button:'left',clickCount:1});
        await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:word.x,y:word.y,button:'left',clickCount:1});
      }
      await until(`window.viewerDiagnostics.snapshot().bridgeState.selection?.uuid===${JSON.stringify(roleId)}`,'visible role word selects directly');
      assert.deepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforePick,'normal word selection does not move the camera');
      assert.equal(await evaluate(`document.getElementById('reading-selection-label').textContent`),'調理役','selection feedback identifies tapped word');
      assert(await evaluate(`document.getElementById('contract-reading').textContent.includes('調理役')`),'tap updates information');
      assert(await evaluate(`window.__mealPointerEvents.some(event=>event.target==='viewer-canvas'&&event.type==='pointerup'&&event.trusted&&event.pointerType===${JSON.stringify(useTouch?'touch':'mouse')})`),'trusted browser pointer path exercised');
      if(useTouch) {
        await evaluate('window.viewerDiagnostics.select(null)');
        await tap(await projectPoint([-40,0,67]),6);
        await until(`window.viewerDiagnostics.snapshot().bridgeState.selection?.uuid===${JSON.stringify(roleId)}`,'6px finger jitter still selects');
        assert.deepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforePick,'small touch jitter does not rotate');
        await evaluate('window.viewerDiagnostics.select(null)');
        const start=await projectPoint([-40,0,67]);
        await touch('touchStart',[start]);await touch('touchMove',[{x:start.x+35,y:start.y+20}]);await touch('touchEnd',[]);await painted();
        assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),null,'drag does not accidentally select');
        assert.notDeepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforePick,'drag still rotates');
        await evaluate('window.viewerDiagnostics.cameraReset()');
        const center=await projectPoint([-40,0,67]);
        await touch('touchStart',[center,{x:center.x+50,y:center.y}]);
        await touch('touchMove',[{x:center.x-10,y:center.y},{x:center.x+65,y:center.y}]);
        await touch('touchEnd',[]);await painted();
        assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),null,'pinch does not accidentally select');
        assert.notDeepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforePick,'pinch still changes view');
        await evaluate('window.viewerDiagnostics.cameraReset()');
        await touch('touchStart',[await projectPoint([-40,0,67])]);await touch('touchCancel',[]);await painted();
        assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),null,'cancelled touch does not select');
        // Measure actual projected movement, rather than merely checking that
        // the camera changed. The old gain moved only ~1px for a 40px gesture.
        for(const zoom of [0,-0.5]) {
          await evaluate('window.viewerDiagnostics.cameraReset()');
          if(zoom)await evaluate(`window.viewerDiagnostics.cameraZoom(${zoom})`);
          const panBefore=await evaluate('window.viewerDiagnostics.snapshot().camera');
          const anchor=[panBefore.target.x,panBefore.target.y,panBefore.target.z];
          const projectedBefore=await projectPoint(anchor);
          const fingers=[{x:projectedBefore.x-30,y:projectedBefore.y},{x:projectedBefore.x+30,y:projectedBefore.y}];
          await touch('touchStart',fingers);
          for(let step=1;step<=8;step++)await touch('touchMove',fingers.map(p=>({x:p.x+40*step/8,y:p.y+24*step/8})));
          await touch('touchEnd',[]);await painted();
          const projectedAfter=await projectPoint(anchor);
          const panAfter=await evaluate('window.viewerDiagnostics.snapshot().camera');
          const movement={x:projectedAfter.x-projectedBefore.x,y:projectedAfter.y-projectedBefore.y};
          assert(Math.abs(movement.x-40)<3&&Math.abs(movement.y-24)<3,`two-finger pan follows screen distance at zoom ${zoom}: ${JSON.stringify(movement)}`);
          assert.equal(panAfter.theta,panBefore.theta,'two-finger pan does not rotate horizontally');
          assert.equal(panAfter.phi,panBefore.phi,'two-finger pan does not rotate vertically');
          assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),null,'two-finger pan does not select');
          console.log('[check:meal-mobile] PAN '+JSON.stringify({width,zoom,movement}));
        }
        await evaluate('window.viewerDiagnostics.cameraReset()');
        await evaluate('window.viewerDiagnostics.setFrame(1)');
        await tap(await projectPoint([-40,0,67]));
        assert.notEqual(await evaluate('window.viewerDiagnostics.snapshot().bridgeState.selection?.uuid'),roleId,'hidden-frame label cannot be picked');
        await evaluate('window.viewerDiagnostics.setFrame(0)');
      }
      await evaluate('window.viewerDiagnostics.select(null)');
      const beforeSearch=await evaluate('window.viewerDiagnostics.snapshot().camera');
      if(useTouch)await choosePanel('find');
      await clickElement(`document.getElementById('reading-search')`,useTouch);
      await cmd('Input.insertText',{text:'調理役'});
      await clickElement(`document.getElementById('reading-search-button')`,useTouch);
      await until(`document.getElementById('reading-results').open&&document.querySelectorAll('#reading-result-list .result-button').length===1`,'name search returns role directly');
      await clickElement(`document.querySelector('#reading-result-list .result-button')`,useTouch);
      await until(`window.viewerDiagnostics.snapshot().bridgeState.selection?.uuid===${JSON.stringify(roleId)}`,'search result selects role without traversing connections');
      assert.deepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforeSearch,'search selection preserves camera');
      if(useTouch)await until(`document.body.dataset.readingPanel==='info'`,'choosing search result opens information');
      await clickElement(`document.getElementById('reading-selection-show')`,useTouch);
      await until(`window.viewerDiagnostics.snapshot().camera.distance<100`,'explicit show fits the selected word');
      await painted();
      const fitted=await evaluate('window.viewerDiagnostics.snapshot()');
      if(useTouch)await until(`document.body.dataset.readingPanel==='diagram'`,'explicit show opens diagram');
      assert(fitted.camera.distance>15,'fit includes word extent instead of zooming into tiny point');
      for(const p of [[-45,0,62.2],[-25,0,69.2]])assert((await projectPoint(p)).ndc.slice(0,2).every(n=>Math.abs(n)<1),'selected word remains inside drawing');
      const selectedScreenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await fs.writeFile(path.join(logs,`meal-mobile-selected-${width}.png`),Buffer.from(selectedScreenshot.data,'base64'));
      await clickElement(`document.getElementById('reading-selection-info')`,useTouch);
      if(useTouch) {
        await until(`document.body.dataset.readingPanel==='info'`,'information action opens pane');
        const infoLayout=await assertMobileViewport('selected information');
        const infoTopScreenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        await fs.writeFile(path.join(logs,`meal-mobile-info-top-${width}.png`),Buffer.from(infoTopScreenshot.data,'base64'));
        const beforeSwipe=await evaluate('window.viewerDiagnostics.snapshot()');
        // Expand an actual model record so a long article/record is exercised,
        // rather than fabricating tall fixture content or assigning scrollTop.
        await clickElement(`Array.from(document.querySelectorAll('#contract-reading details>summary')).find(node=>node.textContent==='選択した記録の詳細')`,true);
        await until(`document.querySelector('#contract-reading pre')!==null`,'record content rendered');
        assert(await evaluate(`document.getElementById('contract-info').scrollHeight>document.getElementById('contract-info').clientHeight+100`),'information has real scrollable content');
        assert(await evaluate(`!['auto','scroll'].includes(getComputedStyle(document.querySelector('#contract-reading pre')).overflowY)`),'record does not introduce a nested vertical scroller');
        await clickElement(`document.getElementById('reading-selection-info')`,true);
        await until(`document.activeElement===document.getElementById('contract-info')`,'information action focuses the scrollable pane');
        await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40,nativeVirtualKeyCode:40});
        await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40,nativeVirtualKeyCode:40});
        await painted();
        assert.deepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforeSwipe.camera,'arrow key in information does not move the drawing');
        assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),beforeSwipe.selectedId,'arrow key in information preserves selection');
        await assertMobileViewport('keyboard-focused information');
        const beforeScroll=await evaluate(`document.getElementById('contract-info').scrollTop`);
        await swipeInformation();
        await until(`document.getElementById('contract-info').scrollTop>${beforeScroll}+30`,'native finger swipe scrolls information');
        // A tap during native momentum can intentionally cancel the fling.
        // Wait for actual scroll stability before testing one navigation tap.
        await waitForInformationScrollSettled();
        const afterScroll=await evaluate(`document.getElementById('contract-info').scrollTop`);
        await assertMobileViewport('scrolled information');
        assert.deepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforeSwipe.camera,'information swipes do not orbit the drawing');
        assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),beforeSwipe.selectedId,'information swipes preserve selection');
        const infoScreenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        await fs.writeFile(path.join(logs,`meal-mobile-info-${width}.png`),Buffer.from(infoScreenshot.data,'base64'));
        const diagramLayout=await choosePanel('diagram');
        assert.deepEqual(diagramLayout.canvas,infoLayout.canvas,'returning to diagram preserves canvas size');
        assert.deepEqual(await evaluate('window.viewerDiagnostics.snapshot().camera'),beforeSwipe.camera,'pane navigation preserves camera');
        assert.equal(await evaluate('window.viewerDiagnostics.snapshot().selectedId'),beforeSwipe.selectedId,'pane navigation preserves selection');
        await choosePanel('info');
        assert(await evaluate(`document.getElementById('contract-info').scrollTop>=${afterScroll}`),'information reading position survives pane switch');
        await choosePanel('diagram');
        await cmd('Emulation.setDeviceMetricsOverride',{width,height:640,deviceScaleFactor:1,mobile:true});
        await until('innerHeight===640','short mobile viewport applied');
        await painted();
        const shortLayout=await assertMobileViewport('short viewport');
        assert(shortLayout.canvas[1]>0,'short viewport retains a drawing area');
        await choosePanel('info');
        await choosePanel('diagram');
        const shortScreenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        await fs.writeFile(path.join(logs,`meal-mobile-short-${width}.png`),Buffer.from(shortScreenshot.data,'base64'));
        await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
        await until('innerHeight===900','full mobile viewport restored');
        await painted();
        await assertMobileViewport('restored viewport');
      } else await until(`document.getElementById('contract-info').getBoundingClientRect().top<innerHeight`,'information button reaches selected details');
      await evaluate('window.viewerDiagnostics.cameraReset()');
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
      cases.push({ width, input:useTouch?'trusted emulated touch':'trusted mouse', directLabelPick:true, nameSearch:true, mobilePanels:useTouch, informationSwipe:useTouch, shortViewport:useTouch, selectedFitDistance:fitted.camera.distance, scroll: actual.scroll, canvasHeight: actual.canvasHeight, canvasBottom: actual.canvasBottom, dockTop: actual.dockTop, toolsOpen: actual.toolsOpen, entryCount: actual.state.entryCount, camera: actual.state.camera, frame2: focused.frame });
      console.log('[check:meal-mobile] CASE PASS ' + JSON.stringify(cases.at(-1)));
    }
    await fs.writeFile(path.join(logs, `meal-mobile-results-${viewportWidth}.json`), JSON.stringify({ cases }, null, 2));
  } catch (error) {
    if(ws?.readyState===WebSocket.OPEN) {
      // Keep visual evidence even when an interaction assertion fails.
      const failure=await new Promise(resolve=>{const id=900000;const timer=setTimeout(()=>resolve(null),3000);ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id===id){clearTimeout(timer);resolve(message.result);} });ws.send(JSON.stringify({id,method:'Page.captureScreenshot',params:{format:'png'}}));});
      if(failure?.data)await fs.writeFile(path.join(logs,'meal-mobile-failure.png'),Buffer.from(failure.data,'base64'));
    }
    await fs.writeFile(path.join(logs, 'meal-mobile-chrome-stderr.log'), stderr);
    throw error;
  } finally {
    ws?.close(); proc.kill('SIGTERM');
    server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
