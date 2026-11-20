// Deterministic allocation/lifetime checks using real Three objects and a bounded
// Canvas2D double. Browser/GPU behavior is covered separately.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const root = new URL('../../../reconstruction/ssot/', import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('/vendor/') ? new URL(specifier.slice(1), root).href : specifier, context);
}});
const canvases = [];
class Canvas {
  width = 300;
  height = 150;
  getContext() {
    return {
      font: '', scale() {}, fillRect() {}, strokeText() {}, fillText() {},
      save() {}, restore() {}, translate() {}, rotate() {},
      measureText(text) {
        const px = Number(this.font.match(/([\d.]+)px/)?.[1]) || 12;
        return {width:[...text].length*px*.8,actualBoundingBoxAscent:px*.8,actualBoundingBoxDescent:px*.2};
      },
    };
  }
}
globalThis.document = {createElement() {const c=new Canvas();canvases.push(c);return c;}};
globalThis.devicePixelRatio = 4;
const THREE = await import(new URL('vendor/three/build/three.module.js', root));
const text = await import(new URL('viewer/runtime/renderer/labels/textSprite.js', root));
const {labelConfig} = await import(new URL('viewer/runtime/renderer/labels/labelConfig.js', root));
const {createLabelRuntime} = await import(new URL('viewer/runtime/renderer/labels/labelRuntime.js', root));
const {buildLabelIndex} = await import(new URL('viewer/runtime/renderer/labels/labelIndex.js', root));
const style = {size:32,font:'Noto Sans JP',pose:{mode:'fixed',front:[0,0,1],up:[0,1,0]}};
const long = '会社法の条文と商法・民法の接続'.repeat(200);
const layout = text.measureTextLabel(long,style);
assert(layout.w<=2048 && layout.h<=2048 && layout.w*layout.h<=65536);
assert.equal(layout.aspect,layout.cw/layout.ch,'raster caps preserve layout aspect');
assert.equal(text.getTextTextureStats().count,0,'measurement creates no textures');
const a=text.createTextLabelObject(long,style),b=text.createTextLabelObject(long,style);
assert.equal(a.material.map,b.material.map,'identical raster shares one texture');
const backing=a.material.map.image;
assert.equal(text.getTextTextureStats().count,1);
text.disposeTextLabelObject(a);
assert(backing.width>0,'another live label keeps the canvas');
text.disposeTextLabelObject(b);
assert.equal(backing.width,0,'last reference releases CPU pixels');
assert.equal(text.getTextTextureStats().bytes,0);
const objects=[];
try {
  for(let i=0;i<400;i++)objects.push(text.createTextLabelObject(i+'_'+'会社法の条文と商法・民法の接続'.repeat(2),style));
  assert.fail('bounded cache must reject before unbounded allocation');
} catch(error) {
  assert.match(error.message,/描画メモリの上限/);
  assert(text.getTextTextureStats().bytes<=labelConfig.raster.maxCacheBytes);
} finally {objects.forEach(text.disposeTextLabelObject);}
assert.equal(text.getTextTextureStats().bytes,0);
const scene=new THREE.Scene(),runtime=createLabelRuntime(scene,{readingPresentation:true});
const entries=new Map(),anchors=new Map();
for(let i=0;i<240;i++) {
  const id='label-'+i;
  entries.set(id,{...style,text:'第一編 総則の条文 '+i,kind:'points'});
  const anchor=new THREE.Object3D();anchor.position.set(i,0,0);anchors.set(id,anchor);
}
runtime.setObjects({points:anchors});runtime.syncIndex(entries);
assert.equal(text.getTextTextureStats().count,0,'inactive frames do not allocate rasters');
const camera={distance:100,viewport:{height:0}};
const first=new Set([...entries.keys()].slice(0,12)),second=new Set([...entries.keys()].slice(12,24));
const corners=runtime.getReadingLayout({points:first});
assert.equal(corners.length,12,'initial fit includes un-rasterized labels');
const before=structuredClone(corners);
runtime.update(camera,{points:first});
assert.equal(text.getTextTextureStats().count,12);
const oldTexture=runtime.labels.get('label-0').obj.material.map.image;
runtime.update(camera,{points:second});
assert.equal(oldTexture.width,0,'leaving a frame frees its backing pixels');
assert.equal(text.getTextTextureStats().count,12,'frame switch does not accumulate textures');
for(let i=0;i<10;i++) {runtime.update(camera,{points:first});runtime.update(camera,{points:second});}
assert.equal(text.getTextTextureStats().count,12);
runtime.update(camera,{points:first});
assert.deepEqual(runtime.getReadingLayout({points:first}),before,'rasterization does not change world layout');
runtime.syncIndex(new Map());
assert.equal(text.getTextTextureStats().count,0);
runtime.dispose();

const uprightPose = {front:[0,1,0],up:[0,0,1]};
const invertedPose = {front:[0,1,0],up:[0,0,-1]};
const caption = (uuid, pose) => ({
  meta:{uuid},
  signification:{caption:'結果ABC'},
  appearance:{caption_text:{writing_mode:'vertical-rl',pose,font:'noto-sans-jp',font_weight:700,color:'#ff0000'}},
});
const verticalEntries = buildLabelIndex({lines:[caption('forward',uprightPose),caption('reverse',invertedPose)]});
const verticalEntry = verticalEntries.get('forward');
assert.equal(verticalEntry.writingMode,'vertical-rl');
assert.equal(verticalEntry.font.weight,'700');
assert.equal(verticalEntry.color,'#ff0000');
const verticalLayout=text.measureTextLabel('結果ABC\n次の列',verticalEntry);
assert.deepEqual(verticalLayout.vertical.columns.map(column=>column.runs.map(run=>run.text)),[['結','果','ABC'],['次','の','列']]);
assert.equal(verticalLayout.vertical.columns[0].runs[2].orientation,'sideways');
assert(verticalLayout.heightFactor>1,'vertical text extends the label without shrinking a glyph');
assert.notEqual(text.makeTextTextureKey(verticalEntry.text,verticalEntry),
  text.makeTextTextureKey(verticalEntry.text,{...verticalEntry,writingMode:'horizontal-tb'}),'different writing modes cannot share pixels');
const verticalRuntime=createLabelRuntime(new THREE.Scene(),{readingPresentation:true});
verticalRuntime.setObjects({lines:new Map([['forward',new THREE.Object3D()],['reverse',new THREE.Object3D()]])});
verticalRuntime.syncIndex(verticalEntries);
const visibleCaptions={lines:new Set(verticalEntries.keys())};
const byId=new Map(verticalRuntime.getReadingLayout(visibleCaptions).map(label=>[label.uuid,label]));
const downZ=label=>label.corners[0][2]-label.corners[1][2];
assert(downZ(byId.get('forward'))<0 && downZ(byId.get('reverse'))>0,
  'reversing pose.up reverses world reading order of the complete label');
verticalRuntime.update(camera,visibleCaptions);
assert.equal(text.getTextTextureStats().count,1,'the two poses share the same vertical raster');
verticalRuntime.dispose();
assert.equal(text.getTextTextureStats().count,0);

// A failed animation draw rejects current and future paint waits and ends the
// loop. It must never be acknowledged as a successful paint or time out silently.
let callback=null;
globalThis.requestAnimationFrame=fn=>{callback=fn;return 1;};
globalThis.cancelAnimationFrame=()=>{callback=null;};
const {createViewerHub}=await import(new URL('viewer/runtime/viewerHub.js',root));
const failure=new Error('test raster limit'), core={
 uiState:{mode:'macro',runtime:{},selection:{uuid:null}},
 recomputeVisibleSet(){return {points:[],lines:[],aux:[]};},
 cameraEngine:{getState(){return {fov:50};},update(){}},
 frameController:{updatePlayback(){}},
 visibilityController:{isVisible(){return true;},setTypeFilter(){},getFilters(){return {};}},
 selectionController:{select(){},clear(){}},
 modeController:{set(){},get(){return 'macro';},canEnter(){return true;},exit(){},focus(){}},
};
const hub=createViewerHub({core,renderer:{render(){throw failure;},dispose(){}}});
hub.start();const rejected=assert.rejects(hub.whenPainted(),error=>error===failure);
const tick=callback;callback=null;tick(0);
await rejected;
assert.equal(callback,null,'failed render does not schedule another frame');
await assert.rejects(hub.whenPainted(),error=>error===failure);
hub.dispose();
assert.equal(text.getTextTextureStats().count,0);

// Optional real user document, kept outside the repository. It takes the exact
// label-index and frame/visibility path, including legacy data.
if(process.argv[2]) {
 const {readFile}=await import('node:fs/promises');
 const document=JSON.parse(await readFile(process.argv[2],'utf8'));
 const frozen=JSON.stringify(document);
 const labels=buildLabelIndex(document,{readingPresentation:true});
 const perFrame=[];
 const frames=[...new Set(document.points.flatMap(p=>p.appearance.frames||[0]))];
 for(const frame of frames) {
  const layer=createLabelRuntime(new THREE.Scene(),{readingPresentation:true});
  const maps={points:new Map(),lines:new Map(),aux:new Map()},visible={points:new Set(),lines:new Set(),aux:new Set()};
  for(const kind of ['points','lines','aux'])for(const item of document[kind]||[]) {
   const id=item.meta.uuid;maps[kind].set(id,new THREE.Object3D());
   if(!item.appearance.frames?.length||item.appearance.frames.includes(frame))visible[kind].add(id);
  }
  layer.setObjects(maps);layer.syncIndex(labels);layer.update(camera,visible);
  perFrame.push({frame,...text.getTextTextureStats()});layer.dispose();
  assert.equal(text.getTextTextureStats().bytes,0);
 }
 assert.equal(JSON.stringify(document),frozen,'document contents untouched');
 console.log(JSON.stringify({source:process.argv[2],perFrame}));
}
console.log('[viewer-label-memory] PASS bounded raster/cache, shared lifetime, lazy frame allocation, stable layout, repeated disposal, rejected paint and stopped loop. Canvas2D double; no GPU/Android claim.');
