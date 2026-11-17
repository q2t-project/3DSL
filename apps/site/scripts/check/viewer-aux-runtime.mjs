// Exercise real renderer document/frame paths with real Three geometries.
// Only WebGL and Canvas2D are doubled. Browser/GPU rendering is checked separately.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';

const root = new URL('../../../reconstruction/ssot/', import.meta.url);
const threeUrl = new URL('vendor/three/build/three.module.js', root).href;
const rendererUrl = new URL('viewer/runtime/renderer/context.js', root).href;
const shim = 'data:text/javascript,' + encodeURIComponent(`
  export * from ${JSON.stringify(threeUrl)};
  export class WebGLRenderer {
    static last;
    constructor({canvas}) { this.domElement=canvas; this.info={}; WebGLRenderer.last=this; }
    getContext() { return {isContextLost:()=>false}; }
    setPixelRatio() {}
    setSize() {}
    setAnimationLoop() {}
    render(scene) { this.scene=scene; }
    dispose() {}
  }
`);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '/vendor/three/build/three.module.js' && context.parentURL === rendererUrl) {
    return next(shim, context);
  }
  return next(specifier.startsWith('/vendor/') ? new URL(specifier.slice(1), root).href : specifier, context);
}});
class Canvas {
  width=1024; height=720; clientWidth=1024; clientHeight=720;
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {}
  getBoundingClientRect() { return {width:1024,height:720}; }
  getContext() {
    return {
      font:'',scale(){},fillRect(){},strokeText(){},fillText(){},
      measureText(text) {
        const px=Number(this.font.match(/([\d.]+)px/)?.[1]) || 12;
        return {width:[...text].length*px*.8,actualBoundingBoxAscent:px*.8,actualBoundingBoxDescent:px*.2};
      },
    };
  }
}
globalThis.document={createElement:()=>new Canvas()};
const {WebGLRenderer}=await import(shim);
const {createRendererContext}=await import(rendererUrl);
const uid=index=>'00000000-0000-4000-8000-'+String(index).padStart(12,'0');
const aux=(index,module,tags)=>({
  meta:{uuid:uid(index),...(tags===undefined?{}:{tags})},
  appearance:{position:[index*8,0,0],frames:[1],visible:true,module},
});
const cases=[
  {name:'empty',points:[],lines:[],aux:[]},
  {name:'modern modules',points:[],lines:[],aux:[
    aux(1,{plate:{plane:'zx',size:[4.2,20]}}),
    aux(2,{plate:{plane:'xy',size:[6.4,32]}},['x:legal_period']),
    aux(3,{plate:{plane:'yz',size:[8,16]}},[]),
    aux(4,{grid:{length:16,step:4}},['x:grid']),
    aux(5,{axis:{length:16}},['x:axis']),
    aux(6,{shell:{shell_type:'box'}},['x:shell']),
    aux(7,{hud:{follow_camera:true}},['x:hud']),
  ]},
  {name:'legacy tag hints',points:[],lines:[],aux:[
    aux(8,{},['aux:plane']),aux(9,{},['aux:grid']),aux(10,{},['aux:axis']),
  ]},
];
for(const filename of process.argv.slice(2)) {
  cases.push({name:filename,...JSON.parse(await readFile(filename,'utf8'))});
}
for(const specimen of cases) {
  const context=createRendererContext(new Canvas(),{}, {readingPresentation:true});
  try {
    for(let pass=0;pass<2;pass++) {
      context.syncDocument(specimen);
      const ids=Object.fromEntries(['points','lines','aux'].map(kind=>[
        kind,new Set(specimen[kind].map(item=>item.meta.uuid)),
      ]));
      context.applyFrame(ids);
      context.updateCamera({target:{x:0,y:0,z:0},distance:500,theta:Math.PI/4,phi:Math.PI/3,fov:50});
      context.render();
      const snapshot=context.getDebugPoseSnapshot({uuids:[...ids.points,...ids.lines,...ids.aux]});
      assert.equal(snapshot.items.length,ids.points.size+ids.lines.size+ids.aux.size,specimen.name);
      const roots=[];
      WebGLRenderer.last.scene.traverse(object=>{if(object.userData.kind==='aux')roots.push(object);});
      assert.equal(roots.length,ids.aux.size,'aux roots survive synchronization');
      for(const item of specimen.aux) {
        const plate=item.appearance.module?.plate;
        if(!plate)continue;
        const owner=roots.find(object=>object.userData.uuid===item.meta.uuid);
        const mesh=owner.children.find(child=>child.isMesh);
        assert(mesh,'plate module produces a mesh');
        assert.equal(mesh.geometry.type,'PlaneGeometry');
        assert.equal(mesh.material.side,2,'plate is visible from both sides');
      }
      context.applyFrame({points:new Set(),lines:new Set(),aux:new Set()});
      assert(roots.every(object=>!object.visible),'frame changes hide aux objects');
    }
    console.log('[viewer-aux-runtime] PASS',specimen.name,specimen.aux.length,'aux, open/reopen/frame paths');
  } finally { context.dispose(); }
}
