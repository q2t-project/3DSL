import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const partsRoot = new URL('../../../../packages/3dss-content/parts/outline/v1/', import.meta.url);
const { parts } = JSON.parse(await readFile(new URL('parts-index.json', partsRoot)));
const fixtures = new Map();
for (const part of parts) fixtures.set('/__gltf/' + part.filename, await readFile(new URL(part.filename, partsRoot)));
fixtures.set('/__gltf/test.html', Buffer.from(`<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script><canvas width="640" height="640" style="width:640px;height:640px"></canvas>`));
const server = await serveBuild(fixtures);
await mkdir('ci-logs/gltf', { recursive: true });
try {
  for (const base of ['/modeler_app/', '/preview-reconstruction/modeler_app/']) {
    await withBrowser(async ({ cmd, evaluate }) => {
      await cmd('Page.navigate', { url: server.origin + '/__gltf/test.html' });
      await waitFor(() => evaluate('!!document.querySelector("canvas")'), 'test canvas');
      await evaluate(`(async()=>{
        const {createRenderer} = await import(${JSON.stringify(base)}+'runtime/renderer/modelerRenderer.js');
        window.canvas = document.querySelector('canvas');
        window.view = createRenderer(canvas); view.resize(640,640,1); view.start();
        window.pixels = () => new Promise(resolve => requestAnimationFrame(()=>{
          const copy=document.createElement('canvas');copy.width=640;copy.height=640;
          const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);
          resolve(ctx.getImageData(0,0,640,640).data);
        }));
        window.blank=await pixels();
        window.changed=async()=>{const now=await pixels();let n=0;for(let i=0;i<now.length;i+=4)if(Math.abs(now[i]-blank[i])+Math.abs(now[i+1]-blank[i+1])+Math.abs(now[i+2]-blank[i+2])>30)n++;return n;};
        window.meshHit=()=>{
          for(let y=-.3;y<=.3;y+=.01)for(let x=-.3;x<=.3;x+=.01){
            const hit=view.pickObjectAt(x,y);
            if(hit?.uuid==='part' && Math.hypot(...hit.point)>2)return hit;
          }return null;
        };
      })()`);
      for (const [index, part] of parts.entries()) {
        await evaluate(`(()=>{
          view.setDocument({points:[{meta:{uuid:'part'},appearance:{position:[0,0,0],marker:{primitive:'none',gltf:{url:${JSON.stringify('/__gltf/' + part.filename)},rotation:[0,Math.PI/2,0]}}}}]});
        })()`);
        // A hit outside the invisible 0.9-radius proxy proves actual GLB mesh picking.
        const hit = await waitFor(() => evaluate('meshHit()'), part.filename + ' mesh');
        assert.equal(hit.kind, 'point');
        assert(await evaluate('changed()') > 20, part.filename + ' changes the rendered pixels');
        await evaluate('view.setSelection(["part"]); view.previewSetPosition("part",[12,0,0])');
        assert.deepEqual(await evaluate('view.getDebugPoseSnapshot({uuids:["part"]}).items[0].world'), [12,0,0]);
        // Refocus removes translation from the image; the part must still be pickable away from its proxy.
        await evaluate('view.focusOnUuid("part"); view.previewSetPosition("part",[0,0,0]); view.focusOnUuid("part"); view.setSelection([])');
        await waitFor(() => evaluate('meshHit()'), 'moved GLB mesh');
        const { data } = await cmd('Page.captureScreenshot', { format:'png', clip:{x:0,y:0,width:660,height:660,scale:1} });
        await writeFile(`ci-logs/gltf/${base.includes('preview')?'reconstruction':'primary'}-${index+1}.png`, Buffer.from(data,'base64'));
        await evaluate('view.setDocument({points:[]})');
        assert.equal(await evaluate('meshHit()'), null, 'replacement removes mesh picking');
      }
      await evaluate('view.dispose()');
      console.log('[modeler-gltf-browser] PASS ' + base + ' seven GLBs: WebGL pixels, mesh picking, selection, movement and replacement');
    });
  }
} finally { await server.close(); }
