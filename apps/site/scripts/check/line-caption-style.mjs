// Exercise the native label index and Canvas2D raster paths without a GPU.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import vm from 'node:vm';
const root = new URL('../../../reconstruction/ssot/', import.meta.url);
registerHooks({resolve(specifier, context, next) {
  return next(specifier.startsWith('/vendor/') ? new URL(specifier.slice(1), root).href : specifier, context);
}});
const draws = [];
class Canvas {
  width = 300;
  height = 150;
  getContext() {
    return {
      font:'', fillStyle:'', scale() {}, fillRect() {}, strokeText() {},
      fillText(text) {draws.push({text, font:this.font, color:this.fillStyle});},
      measureText(text) {
        const px = Number(this.font.match(/([\d.]+)px/)?.[1]) || 12;
        return {width:[...text].length*px, actualBoundingBoxAscent:px*.8, actualBoundingBoxDescent:px*.2};
      },
    };
  }
}
globalThis.document = {createElement() {return new Canvas();}};
globalThis.devicePixelRatio = 1;
const THREE = await import(new URL('vendor/three/build/three.module.js', root));
const {lineCaptionStyle} = await import(new URL('shared/renderConventions.js', root));
const {buildLabelIndex} = await import(new URL('viewer/runtime/renderer/labels/labelIndex.js', root));
const {createLabelRuntime} = await import(new URL('viewer/runtime/renderer/labels/labelRuntime.js', root));
const model = {
  points:[{meta:{uuid:'point'}, signification:{name:'結果'}, appearance:{marker:{text:{content:'結果',size:8,font:'bold sans-serif'}}}}],
  lines:[{meta:{uuid:'line'},signification:{caption:'作用'},appearance:{color:'#ff0000',caption_text:{font_size:4}}}],
};
const before = JSON.stringify(model);
const index = buildLabelIndex(model);
const point = index.get('point'), line = index.get('line');
const style = lineCaptionStyle(model.lines[0].appearance.caption_text);
assert.equal(line.size,4,'authored caption size retained');
assert.equal(line.font.weight,'400');
assert.match(line.font.family,/serif$/);
assert.equal(line.style.color,style.color,'caption ink comes from shared convention');
assert.notEqual(line.style.color,model.lines[0].appearance.color,'geometry color has a separate role');
assert.equal(point.font.weight,'bold','authored point font retained');
assert.equal(point.font.family,'sans-serif');
assert.equal(point.style,undefined,'line presentation does not recolor points');
assert.equal(lineCaptionStyle(null).worldSize,8,'legacy omitted size retained');
const scene = new THREE.Scene(), runtime = createLabelRuntime(scene,{readingPresentation:true});
const points = new Map([['point',new THREE.Object3D()]]), lines = new Map([['line',new THREE.Object3D()]]);
runtime.setObjects({points,lines});
runtime.syncIndex(index);
runtime.update({distance:100,viewport:{height:900}}, {points:new Set(['point']),lines:new Set(['line'])});
const renderedLine = draws.find(draw => draw.text === '作用');
const renderedPoint = draws.find(draw => draw.text === '結果');
assert.equal(renderedLine.color,style.color,'Viewer Canvas2D receives caption ink');
assert.match(renderedLine.font,/normal 400 .*serif$/,'Viewer raster receives relation font');
assert.equal(renderedPoint.color,'#ffffff','point ink retains its existing default');
assert.match(renderedPoint.font,/bold .*sans-serif$/);
runtime.dispose();

// Execute Modeler's actual pure text constructors without starting WebGL.
// These functions remain private to the renderer in production.
const source = await readFile(new URL('modeler_app/runtime/renderer/modelerRenderer.js',root),'utf8');
const constructors = source.slice(0,source.indexOf('function applyPoseToLabelObject'))
  .replace(/^import .*;\r?\n/gm,'');
const {makeTextPlane,makeTextSprite} = vm.runInNewContext(
  constructors+'\n({makeTextPlane,makeTextSprite})',
  {THREE,document:globalThis.document,devicePixelRatio:1},
);
for (const make of [makeTextPlane,makeTextSprite]) {
  draws.length=0;
  const relation = make('作用',{fontSize:32,worldSize:4,font:style.font,color:style.color});
  const concept = make('結果',{fontSize:32,worldSize:8});
  assert.equal(draws[0].color,style.color,'Modeler constructor receives caption ink');
  assert.match(draws[0].font,/normal 400 .*serif$/,'Modeler constructor receives relation font');
  assert.equal(draws[1].color,'#ffffff','Modeler point default retained');
  assert.match(draws[1].font,/sans-serif$/);
  for(const label of [relation,concept]) {
    label.userData.__labelTexture.dispose();label.material.dispose();
    if(label.isMesh)label.geometry.dispose();
  }
}
assert.equal(JSON.stringify(model),before,'presentation does not add fields to saved documents');
console.log('[check:line-caption-style] PASS Viewer raster, Modeler plane/sprite raster, authored point font, separate geometry color, legacy size and document retention. Canvas2D double; no browser-font claim.');
