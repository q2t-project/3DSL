// Exercise a neutral two-point scene through the published work page and Viewer.
// Override only its data response in this test server; no authored work is changed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const source = JSON.parse(await readFile(new URL('../../../reconstruction/ssot/models/created_3points_2lines.3dss.json', import.meta.url)));
const ids = source.points.slice(0, 2).map(point => point.meta.uuid);
const model = {
  document_meta: { ...source.document_meta, document_title: 'ズーム検査' },
  points: ids.map((uuid, i) => ({ meta:{uuid}, appearance:{
    position:[i * 20000, 0, 0], marker:{primitive:'sphere', radius:i ? 0.0001 : 80, common:{color:i ? '#00ff00' : '#0088ff', opacity:1}}
  } })),
  lines:[], aux:[],
};
const work = '/library/26010501/';
const data = '/_data/library/26010501/model.3dss.json';
const server = await serveBuild(new Map([[data, Buffer.from(JSON.stringify(model))]]));
try {
  for (const width of [360, 1280]) await withBrowser(async ({cmd, evaluate}) => {
    const mobile = width === 360;
    await cmd('Emulation.setDeviceMetricsOverride', {width, height:800, deviceScaleFactor:1, mobile});
    await cmd('Emulation.setTouchEmulationEnabled', {enabled:mobile, maxTouchPoints:2});
    for (const embedded of [true, false]) {
      const selector = embedded ? 'iframe.atlas-stage' : '#app-viewer-iframe';
      const reader = expression => evaluate(`(() => {const f=document.querySelector(${JSON.stringify(selector)}),w=f?.contentWindow,d=f?.contentDocument,api=w?.viewerDiagnostics;return w&&d?(${expression}):null})()`);
      await cmd('Page.navigate', {url:server.origin + (embedded ? work : '/app/viewer/?' + new URLSearchParams({model:data, return:work}))});
      await waitFor(() => reader('!!api && !!w.viewerBootReady'), 'reader startup');
      const opened = await reader('w.viewerBootReady');
      assert.equal(opened.ok, true, JSON.stringify(opened));
      const view = () => reader('api.snapshot().camera');
      const button = id => reader(`d.getElementById('${id}').click()`);
      const overview = embedded ? 'atlas-overview' : 'reading-all';
      const focus = embedded ? 'atlas-focus' : 'reading-show';
      assert((await view()).distance > 1000, 'initial all-visible fit');
      await button(overview);
      await reader('new Promise(done => w.requestAnimationFrame(() => w.requestAnimationFrame(done)))');
      const whole = await view();
      assert(whole.distance > 1000 && whole.target.x > 9900 && whole.target.x < 10100, 'overview includes both ends');
      if (embedded) assert(await reader("d.getElementById('atlas-focus').hidden"));
      await reader(`api.select(${JSON.stringify(ids[1])})`);
      if (embedded) assert(await reader("!d.getElementById('atlas-focus').hidden"));
      await button(focus);
      await waitFor(async () => (await view()).distance < .01, 'fit selected tiny marker');
      const detail = await view();
      assert.equal(detail.target.x, 20000, 'no target-coordinate clamp');
      assert.equal(detail.theta, whole.theta);
      assert.equal(detail.phi, whole.phi);
      if (embedded) {
        // Remove the highlight. Read the actual pixels and tap the focused object again.
        await reader('api.select(null)');
        await reader('new Promise(done => w.requestAnimationFrame(() => w.requestAnimationFrame(done)))');
        const center = await reader(`(() => {f.scrollIntoView({block:'center'});const frame=f.getBoundingClientRect(), canvas=d.getElementById('viewer-canvas').getBoundingClientRect();
          return {x:Math.round(frame.left+f.clientLeft+canvas.x+canvas.width/2), y:Math.round(frame.top+f.clientTop+canvas.y+canvas.height/2)};})()`);
        assert(await evaluate(`document.elementFromPoint(${center.x},${center.y}) === document.querySelector('iframe.atlas-stage')`), 'input reaches canvas iframe');
        const captured = await cmd('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
        const pixels = await sharp(Buffer.from(captured.data,'base64')).extract({left:center.x-5,top:center.y-5,width:10,height:10}).removeAlpha().raw().toBuffer();
        let green = 0;
        for (let i = 0; i < pixels.length; i += 3) if (pixels[i+1] > 100 && pixels[i+1] > 1.4 * Math.max(pixels[i], pixels[i+2])) green++;
        assert(green >= 50, 'tiny marker is drawn and fills the center of the viewport');
        const touch = (type, points) => cmd('Input.dispatchTouchEvent', {type, touchPoints:points});
        if (mobile) {
          await touch('touchStart', [{...center,id:1}]); await touch('touchEnd', []);
        } else {
          await cmd('Input.dispatchMouseEvent',{type:'mousePressed',...center,button:'left',clickCount:1});
          await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',...center,button:'left',clickCount:1});
        }
        await waitFor(() => reader('api.snapshot().selectedId === ' + JSON.stringify(ids[1])), 'actual pointer selects the visible marker');
        async function zoom(inward) {
          if (!mobile) {
            await cmd('Input.dispatchMouseEvent',{type:'mouseWheel',...center,deltaX:0,deltaY:inward ? -120 : 120});
            return;
          }
          const spans = [18,24,32,42,55];
          if (!inward) spans.reverse();
          const fingers = span => [-1,1].map((side,i) => ({x:center.x+side*span,y:center.y,id:i+1}));
          await touch('touchStart', fingers(spans[0]));
          for (const span of spans.slice(1)) await touch('touchMove', fingers(span));
          await touch('touchEnd', []);
        }
        await zoom(true);
        await waitFor(async () => (await view()).distance < detail.distance*.99, 'pinch or wheel zooms in');
        await button(focus);
        await waitFor(async () => Math.abs((await view()).distance / detail.distance - 1) < 1e-5, 'restore selected extent');
        await zoom(false);
        await waitFor(async () => (await view()).distance > detail.distance*1.01, 'pinch or wheel zooms out');
      }
      await button(overview);
      await waitFor(async () => Math.abs((await view()).distance / whole.distance - 1) < 1e-6, 'recover whole scene');
      assert.equal(await reader('api.snapshot().selectedId'), ids[1]);
      if (embedded) {
        await reader("api.setFilters({aux:false})");
        await reader("api.setScope('related')");
        await button(overview);
        await waitFor(async () => (await view()).distance < .01, 'overview respects a restricted visible set');
        assert.equal(await reader('api.snapshot().scope'), 'related');
        assert.equal(await reader('api.snapshot().filters.aux'), false);
      }
      assert.deepEqual(await reader('api.rawSnapshot()'), model);
      console.log(`[atlas-zoom] ${width}px ${embedded?'work page':'Viewer'}: ${whole.distance.toPrecision(5)} → ${detail.distance.toPrecision(5)} → overview`);
    }
  });
} finally { await server.close(); }
