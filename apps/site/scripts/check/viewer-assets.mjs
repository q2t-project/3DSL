import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';
import { texturedGrid } from './fixtures/textured-grid.mjs';

const site = fileURLToPath(new URL('../../', import.meta.url));
const source = await readFile(path.join(site, '../../apps/reconstruction/ssot/models/created_3points_2lines.3dss.json'), 'utf8');
const fixtures = new Map();
const sizes = [{name:'small', cells:16, width:256}, {name:'large', cells:256, width:2048}];
for (const spec of sizes) {
  const model = JSON.parse(source);
  model.points[0].appearance.marker.gltf = {url:'./grid.glb'};
  spec.url = '/__measure/' + spec.name + '/model.3dss.json';
  const glb = texturedGrid(spec.cells, spec.width);
  fixtures.set(spec.url, Buffer.from(JSON.stringify(model)));
  fixtures.set(spec.url.replace('model.3dss.json','grid.glb'), glb);
  fixtures.set(spec.url.replace('model.3dss.json','late.glb'), glb);
  spec.glbBytes = glb.length;
}
// /proc can be mounted in a parent PID namespace. Identify our browser among
// this Node process's children and read memory only for its renderer descendants.
async function rendererMemory(pid) {
  const empty = {rendererProcesses:0, rendererRssBytes:null, rendererPssBytes:null};
  if (process.platform !== 'linux') return empty;
  const status = id => readFile('/proc/'+id+'/status','utf8');
  const node = (await status('self')).match(/^Pid:\s+(\d+)$/m)[1];
  const children = new Map();
  for (const id of (await readdir('/proc')).filter(name => /^\d+$/.test(name))) {
    const stat = await readFile('/proc/'+id+'/stat','utf8').catch(() => '');
    const parent = stat.slice(stat.lastIndexOf(')')+2).split(' ')[1];
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(id);
  }
  let browser;
  for (const id of children.get(node) || []) {
    const ns = (await status(id)).match(/^NSpid:\s+([\d\t ]+)$/m)?.[1];
    if (Number(ns?.trim().split(/\s+/).pop() ?? id) === pid) browser=id;
  }
  if (!browser) return empty;
  const queue = [...(children.get(browser) || [])];
  let rss = 0, pss = 0, count = 0, hasPss = true;
  while (queue.length) {
    const id = queue.pop();
    queue.push(...(children.get(id) || []));
    const args = await readFile('/proc/'+id+'/cmdline','utf8').catch(() => '');
    if (!args.includes('--type=renderer')) continue;
    rss += Number((await status(id)).match(/^VmRSS:\s+(\d+) kB$/m)[1])*1024;
    const rollup = await readFile('/proc/'+id+'/smaps_rollup','utf8').catch(() => '');
    const match = rollup.match(/^Pss:\s+(\d+) kB$/m);
    if (match) pss += Number(match[1])*1024; else hasPss=false;
    count++;
  }
  return {rendererProcesses:count,rendererRssBytes:count ? rss : null,rendererPssBytes:count && hasPss ? pss : null};
}

const server = await serveBuild(fixtures);
const results = [];
const trials = Number(process.env.VIEWER_ASSET_TRIALS || 3);
assert(Number.isInteger(trials) && trials > 0 && trials <= 10);
try {
  for (let trial=1; trial<=trials; trial++) for (const spec of trial % 2 ? sizes : [...sizes].reverse()) {
    await withBrowser(async ({ cmd, evaluate, events, pid }) => {
      const version = (await cmd('Browser.getVersion')).product;
      const urls = [], errors = [];
      let transferred = 0;
      events.addEventListener('Network.loadingFinished', e => { transferred += e.detail.encodedDataLength; });
      events.addEventListener('Network.responseReceived', e => { urls.push([new URL(e.detail.response.url).pathname,e.detail.response.status]); });
      events.addEventListener('Runtime.exceptionThrown', e => { errors.push(e.detail.exceptionDetails.exception?.description); });
      await cmd('Network.enable'); await cmd('Runtime.enable'); await cmd('Network.setCacheDisabled',{cacheDisabled:true});
      await cmd('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
      await cmd('Emulation.setTouchEmulationEnabled', {enabled:true});
      await cmd('Page.addScriptToEvaluateOnNewDocument', {source:`(() => {
        const create = window.createImageBitmap.bind(window), close = ImageBitmap.prototype.close;
        const ours = new WeakSet(); window.decoded = 0; window.assetClosed = 0;
        window.createImageBitmap = async (...args) => {
          const image = await create(...args);
          if(image.width === ${spec.width} && image.height === ${spec.width}) {decoded++;ours.add(image);}
          return image;
        };
        ImageBitmap.prototype.close = function() {if(ours.delete(this)) window.assetClosed++;return close.call(this);};
        if (window !== top) {
          function painted() {
            const m = window.viewerHub?.getRenderDiagnostics?.();
            if (decoded && m?.triangles >= ${2*spec.cells**2} && m.textures) window.assetPaint = performance.timeOrigin + performance.now();
            else requestAnimationFrame(painted);
          }
          requestAnimationFrame(painted);
        }
      })()`});
      const url = server.origin + '/app/viewer/?dbgHub=1&model=' + encodeURIComponent(spec.url);
      await cmd('Page.navigate', {url});
      const inner = "document.getElementById('app-viewer-iframe')?.contentWindow";
      await waitFor(() => evaluate(`!!${inner}?.viewerBootReady`), 'Viewer boot');
      const boot = await evaluate(`${inner}.viewerBootReady`);
      assert(boot.ok, JSON.stringify(boot));
      const read = code => evaluate(`(w => ${code})(${inner})`);
      const theta = await read('w.viewerDiagnostics.snapshot().camera.theta');
      const touch = (type, coords) => cmd('Input.dispatchTouchEvent', {type, touchPoints:coords ? [{...coords,id:1}]:[]});
      await touch('touchStart',{x:130,y:325});
      await touch('touchMove',{x:151,y:331});
      await touch('touchMove',{x:178,y:335});
      await touch('touchEnd',null);
      await waitFor(() => read('Math.abs(w.viewerDiagnostics.snapshot().camera.theta - ' + theta + ') > .01'), 'orbit from touch drag');
      const firstOrbitMs = Math.round(await evaluate('performance.now()'));
      try { await waitFor(() => read('w.assetPaint'), 'textured grid rendered',12000); }
      catch (error) { throw new Error(error.message + ': ' + JSON.stringify({resources:urls.filter(([u,s])=>s>=400||/grid|GLTF/.test(u)), errors, state:await read('({decoded:w.decoded,metrics:w.viewerHub.getRenderDiagnostics()})')})); }
      const assetPaintMs = Math.round(await read('w.assetPaint - top.performance.timeOrigin'));
      const totalBytes = transferred;
      const metrics = await read('w.viewerHub.getRenderDiagnostics()');
      await cmd('HeapProfiler.collectGarbage');
      const heap = await cmd('Runtime.getHeapUsage');
      const observed = {trial, name:spec.name, browser:version, glbBytes:spec.glbBytes, triangles:spec.cells**2*2,
        textureWidth:spec.width, rgbaBytes:spec.width**2*4, firstOrbitMs, assetPaintMs, totalBytes,
        jsHeapBytes:heap.usedSize, backingStorageBytes:heap.backingStorageSize,
        ...await rendererMemory(pid).catch(() => ({rendererRssBytes:null,rendererPssBytes:null})),
        drawnTriangles:metrics.triangles, gpuTextureCount:metrics.textures};
      const replacement = await read('w.viewerDiagnostics.openText(' + JSON.stringify(source) + ',"replacement.json")');
      assert(replacement.ok, 'replace loaded model in the same tab');
      observed.decoded = await read('w.decoded');
      observed.closed = await read('w.assetClosed');
      assert(observed.decoded > 0, 'actual texture decoder ran');
      console.log('[viewer-assets]', JSON.stringify(observed));
      assert.equal(observed.closed, observed.decoded, 'replaced model releases each decoded bitmap');
      if (trial === 1 && spec.name === 'small') {
        // Delay a real network response until after the user has switched works.
        let paused;
        events.addEventListener('Fetch.requestPaused', e => { paused = e.detail.requestId; }, {once:true});
        await cmd('Fetch.enable',{patterns:[{urlPattern:'*/late.glb'}]});
        const late = JSON.parse(source);
        late.points[0].appearance.marker.gltf = {url:spec.url.replace('model.3dss.json','late.glb')};
        const open = async (doc, label) => {
          const r = await read('w.viewerDiagnostics.openText(' + JSON.stringify(doc) + ',' + JSON.stringify(label) + ')');
          assert(r.ok, label);
        };
        await open(JSON.stringify(late),'pending');
        await waitFor(() => paused,'intercept pending asset');
        await open(source,'replacement');
        await cmd('Fetch.continueRequest',{requestId:paused});
        await waitFor(() => read('w.decoded===2 && w.assetClosed===2'),'release late texture after replacement');
        await cmd('Fetch.disable');
        console.log('[viewer-assets] PASS already-replaced model releases late bitmap');
      }
      results.push(observed);
    });
  }
  await mkdir(path.join(site,'ci-logs'),{recursive:true});
  await writeFile(path.join(site,'ci-logs/viewer-assets.json'),JSON.stringify({viewport:[390,844],dpr:1,cache:'cold, local HTTP without compression',results},null,2));
} finally { await server.close(); }
