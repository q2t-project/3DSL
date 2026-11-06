// Pure camera contract checks: authored fronts stay authored; fit every real
// geometry/label corner by perspective projection, including phone aspect ratios.
import assert from 'node:assert/strict';
import { computeInitialReadingView } from '../../../reconstruction/ssot/viewer/runtime/initialView.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
const cube=(size=30,offset=[0,0,0])=>[-size,size].flatMap(x=>[-size,size].flatMap(y=>[-size,size].map(z=>plus([x,y,z],offset))));
function label(front,center=[0,0,0],size=18) {
  const up=Math.abs(front[2])===1?[0,1,0]:[0,0,1],right=cross(up,front);
  return {pose:{mode:'fixed',front,up},corners:[-1,1].flatMap(x=>[-1,1].map(y=>center.map((v,i)=>v+x*size*right[i]+y*size*.4*up[i])))};
}
function fit(layout,extra={}) {return computeInitialReadingView({layout,camera:{fov:50},width:360,height:900,...extra});}
function assertContained(layout,view,width,height) {
  assert(view,'fit returned camera');
  const outward=[Math.sin(view.phi)*Math.cos(view.theta),Math.sin(view.phi)*Math.sin(view.theta),Math.cos(view.phi)];
  const right=norm(cross([0,0,1],outward)),up=cross(outward,right),target=[view.target.x,view.target.y,view.target.z];
  const tan=Math.tan(view.fov*Math.PI/360),aspect=width/height;
  for(const p of [...layout.geometry,...layout.labels.flatMap(l=>l.corners)]) {
    const d=p.map((v,i)=>v-target[i]),depth=view.distance-dot(d,outward);
    assert(depth>0,'each corner is in front of camera');
    assert(Math.abs(dot(d,right)/(depth*tan*aspect))<=1/1.12+1e-9,'each corner fits horizontal margin');
    assert(Math.abs(dot(d,up)/(depth*tan))<=1/1.12+1e-9,'each corner fits vertical margin');
  }
  return outward;
}
// Existing vertical planar works keep a head-on view; a spatial/thick single
// plane gets an oblique fit; horizontal-only work or authored roll retains its camera.
const planar={geometry:[[-40,0,-20],[40,0,-20],[-40,0,20],[40,0,20]],labels:[label([0,1,0],[-25,0,0],8),label([0,1,0],[25,0,0],8)]};
const planarView=fit(planar);
assert.equal(planarView.phi,Math.PI/2);
assert.equal(planarView.theta,Math.PI/2);
assertContained(planar,planarView,360,900);
const reversePlanar=structuredClone(planar);reversePlanar.labels.forEach(l=>{l.pose.front=[0,-1,0];});
assert.equal(fit(reversePlanar).theta,-Math.PI/2);
assertContained({...planar,geometry:cube()},fit({...planar,geometry:cube()}),360,900);
assert.notEqual(fit({...planar,geometry:cube()}).phi,Math.PI/2,'deep geometry keeps an oblique view');
assert.equal(fit({...planar,geometry:cube(30).map(p=>[p[0],p[1]*.02,p[2]])}).phi,Math.PI/2,'thin volumetric bars are fitted head-on');
assert.equal(fit({geometry:cube(),labels:[label([0,0,1]),label([0,0,1],[5,5,0])]}),null,'single top plane retains ordinary orbit');
// Every compatible sign combination chooses the authored-facing octant. A
// repeated face must not bias the camera towards the most numerous label class.
let cases=0;
for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]) {
  const layout={geometry:cube(),labels:[label([sx,0,0],[20,0,0]),label([0,sy,0],[0,20,0]),label([0,0,sz],[0,0,20])]};
  const before=JSON.stringify(layout);
  for(const [width,height] of [[360,900],[390,900],[1280,900]]) {
    const view=fit(layout,{width,height}),outward=assertContained(layout,view,width,height);
    assert.deepEqual(outward.map(v=>Math.round(v*Math.sqrt(3))),[sx,sy,sz]);
    const repeated=fit({...layout,labels:[...layout.labels,...Array.from({length:10},()=>structuredClone(layout.labels[0]))]},{width,height});
    assert(Math.abs(repeated.theta-view.theta)<1e-12 && Math.abs(repeated.phi-view.phi)<1e-12,'faces have equal orientation weight');
    cases++;
  }
  assert.equal(JSON.stringify(layout),before,'camera fit leaves authored geometry/pose unchanged');
}
// Two occupied faces also have a balanced view, without inventing a third face.
for(const fronts of [[[1,0,0],[0,1,0]],[[-1,0,0],[0,0,-1]],[[0,-1,0],[0,0,1]]]) {
  const two={geometry:cube(),labels:fronts.map(front=>label(front))};
  const outward=assertContained(two,fit(two),360,900),expected=norm(fronts[0].map((v,i)=>v+fronts[1][i]));
  assert(outward.every((v,i)=>Math.abs(v-expected[i])<1e-12),'two occupied axes receive equal weight');
}
const mixed={geometry:cube(),labels:[label([1,0,0]),label([0,1,0]),label([0,0,1])]};
const deep={...mixed,geometry:[...mixed.geometry,[450,450,450]]};
assertContained(deep,fit(deep),360,900);
// Horizontal up−Y is an authored opposite reading direction, not something the
// camera rewrites to up+Y. Its actual corner bounds must still fit unchanged.
const topReverse=structuredClone(mixed);
const top=topReverse.labels[2];top.pose.up=[0,-1,0];
// Rotating the local top text axes 180 degrees maps each original corner to its
// opposite around the center, keeping this sample rectangle in the same plane.
top.corners=top.corners.map(p=>[-p[0],-p[1],p[2]]);
const topBefore=JSON.stringify(topReverse);
assertContained(topReverse,fit(topReverse),360,900);
assert.equal(JSON.stringify(topReverse),topBefore,'horizontal authored up−Y pose/corners unchanged');
assert.equal(fit(topReverse).theta,fit(mixed).theta,'top authored reading direction does not bias face normal');
assert.equal(fit(topReverse).phi,fit(mixed).phi);
// Actual label extents, not just marker centers, must influence perspective fit.
const wide={...mixed,labels:[label([1,0,0]),label([0,1,0],[170,0,0],40),label([0,0,1])]};
assert(fit(wide).distance>fit(mixed).distance,'wide raster label increases required fit distance');
assertContained(wide,fit(wide),360,900);
assert.equal(fit({...mixed,labels:[...mixed.labels,label([-1,0,0])]}),null,'opposed fronts do not get silently flipped');
const rolled=structuredClone(mixed);rolled.labels[0].pose.up=[0,0,-1];
assert.equal(fit(rolled),null,'arbitrary authored roll is not corrected');
const topRolled=structuredClone(mixed);topRolled.labels[2].pose.up=[1,0,0];
assert.equal(fit(topRolled),null,'horizontal upX remains outside the supported reading directions');
const tilted=structuredClone(mixed);tilted.labels[0].pose.front=[1,1,0];
assert.equal(fit(tilted),null,'mixed noncardinal planes are outside the conservative contract');
const billboard=structuredClone(mixed);billboard.labels[0].pose.mode='billboard';
assert.equal(fit(billboard),null,'billboard mixtures retain default camera');
assert.equal(fit(mixed,{explicitCamera:true}),null,'explicit camera wins');
assert.equal(fit({...mixed,hasAux:true}),null,'aux eligibility unchanged');
assert.equal(fit({...mixed,geometry:[[0,NaN,0],...mixed.geometry]}),null,'nonfinite geometry refused');
assert.equal(fit(mixed,{width:Infinity}),null,'nonfinite viewport refused');
assert.equal(fit(mixed,{height:0}),null,'zero viewport refused');
const malformed=structuredClone(mixed);malformed.labels[0].corners.pop();
assert.equal(fit(malformed),null,'incomplete label bounds refused');
const invalidCorner=structuredClone(mixed);invalidCorner.labels[0].corners[0][2]=Infinity;
assert.equal(fit(invalidCorner),null,'nonfinite label bound refused');
assert.equal(fit({...mixed,geometry:cube(5000)}),null,'distance limit is not hidden by clamping');
const far={geometry:cube(30,[20000,0,0]),labels:mixed.labels.map(l=>({...l,corners:l.corners.map(p=>plus(p,[20000,0,0]))}))};
assert.equal(fit(far),null,'target coordinate limit is not hidden by clamping');
console.log(`[check:initial-reading-view] PASS vertical-planar compatibility; ${cases} signed mixed-face perspective fits; equal face weighting; authored-pose/data retention; conservative refusal and bounds.`);
