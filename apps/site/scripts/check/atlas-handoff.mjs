// Open the full Viewer from actual published anchors. Use a small multi-frame
// work as the response so selection, frame and a deliberate camera move are all observable.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';
import { captureAtlasView, readAtlasView } from '../../../reconstruction/ssot/contract_viewer/atlasView.js';

const bytes = await readFile(new URL('../../../reconstruction/ssot/models/created_3points_2lines.3dss.json', import.meta.url));
const scene = JSON.parse(bytes);
const selected = scene.points.find(p => p.appearance.frames.includes(1)).meta.uuid;
const model = { scene, sourceUrl: 'https://example.test/work.json' };
const camera = { target: { x: 1, y: -2, z: 3 }, distance: .001, theta: 1.5, phi: 1, fov: 45 };
const fragment = captureAtlasView(model, { frame: 1, camera }, selected);
const index = { get: id => id === selected ? { id } : null };
const range = { min: 0, max: 2 };
assert.deepEqual(readAtlasView(fragment, model, index, range), { frame: 1, selectedId: selected, camera });
for (const corrupt of ['#atlas-v1=%', '#atlas-v1=' + '0'.repeat(5000),
  captureAtlasView(model, { frame: 42, camera }, selected),
  captureAtlasView(model, { frame: 1, camera }, 'missing'),
  captureAtlasView(model, { frame: 1, camera: { ...camera, distance: -1 } }, selected)]) {
  assert.equal(readAtlasView(corrupt, model, index, range), null);
}
assert.equal(readAtlasView(fragment, { ...model, sourceUrl: model.sourceUrl + '.other' }, index, range), null);
assert.equal(readAtlasView(fragment, { ...model, scene: { document_meta: { ...scene.document_meta, revised_at: 'later' } } }, index, range), null);

const fixtures = new Map();
const server = await serveBuild(fixtures);
try {
  for (const [route, width] of [['/', 360], ['/library/26010501/', 1280]]) {
    const html = await (await fetch(server.origin + route)).text();
    const modelPath = html.match(/data-atlas-expand="([^"]+)"/)?.[1];
    assert.ok(modelPath, 'work page has a marked native expansion link');
    fixtures.set(modelPath, bytes);
    await withBrowser(async ({ cmd, evaluate }) => {
      await cmd('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width === 360 });
      const reader = (selector, expression) => evaluate(`(() => {
        const w=document.querySelector(${JSON.stringify(selector)})?.contentWindow, api=w?.viewerDiagnostics;
        return api ? (${expression}) : null;
      })()`);
      const stage = 'iframe.atlas-stage', full = '#app-viewer-iframe';
      const open = async selector => {
        await waitFor(() => reader(selector, '!!w.viewerBootReady'), 'reader initialisation');
        assert.equal((await reader(selector, 'w.viewerBootReady')).ok, true);
      };
      const view = selector => reader(selector, '(({frame,selectedId,camera})=>({frame,selectedId,camera}))(api.snapshot())');
      await cmd('Page.navigate', { url: server.origin + route });
      await open(stage);
      // A cached page receives pagehide but resumes its original document on Back.
      await reader(stage, `(() => {
        for (const type of ['pagehide', 'pageshow']) w.dispatchEvent(new w.PageTransitionEvent(type, { persisted: true }));
      })()`);
      await reader(stage, `(async()=>{
        await api.setFrame(1); await api.select(${JSON.stringify(selected)}); await api.fitSelection();
        await api.cameraOrbit(.53,-.24); await api.cameraZoom(-.15);
      })()`);
      const before = await view(stage);
      assert.equal(before.frame, 1);
      assert.equal(before.selectedId, selected);
      await evaluate("document.querySelector('[data-atlas-expand]').focus()");
      await cmd('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, text:'\r' });
      await cmd('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13 });
      await open(full);
      assert.deepEqual(await view(full), before, 'selection, frame, target, orientation, zoom and FOV survive navigation');
      assert.equal(await evaluate("new URL(location.href).searchParams.get('return')"), route);
      assert.ok(await evaluate("location.hash.startsWith('#atlas-v1=')"));
      assert.deepEqual(await reader(full, 'api.rawSnapshot()'), scene, 'model data stays intact');
      // A later manual file open in the same Viewer must start fresh.
      await reader(full, 'api.openText(JSON.stringify(api.rawSnapshot()), "local.json")');
      assert.equal((await view(full)).selectedId, null);
      await evaluate('history.back()');
      await waitFor(() => evaluate('location.pathname === ' + JSON.stringify(route)), 'Back to the work page');
      await open(stage);
      await reader(stage, `api.select(${JSON.stringify(selected)})`);
      assert.equal((await view(stage)).selectedId, selected, 'returned diagram is interactive');
      console.log(`[atlas-handoff] ${route} → Viewer at ${width}px: frame, selection and camera retained`);
    });
  }
} finally { await server.close(); }
