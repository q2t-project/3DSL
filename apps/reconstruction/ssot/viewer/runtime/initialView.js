// Conservative initial reading view. A camera choice is presentation state only;
// authored coordinates, labels, orientation and document data are never changed.
const finite3 = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function unit(a) { if(!finite3(a))return null;const n=Math.hypot(...a);return n>1e-8?a.map(v=>v/n):null; }
const range=(points,i)=>[Math.min(...points.map(p=>p[i])),Math.max(...points.map(p=>p[i]))];
const same=(a,b)=>a && b && dot(a,b)>.999999;

// A fixed +Z-up orbit can show several unrolled cardinal faces from one octant.
// Give each occupied face axis equal weight, irrespective of label count. Two
// opposed fronts cannot both be viewed from their authored front, so do not pick
// a winner or rotate/rewrite the labels. Noncardinal or rolled mixtures likewise
// retain the ordinary initial camera.
function mixedFaceNormal(labels) {
  const signs=[0,0,0];
  for(const label of labels) {
    const front=unit(label.pose?.front),up=unit(label.pose?.up);
    if(label.pose?.mode!=='fixed' || !front || !up) return null;
    const axis=front.findIndex(v=>Math.abs(v)>.999999);
    if(axis<0 || front.some((v,i)=>i!==axis && Math.abs(v)>1e-6)) return null;
    // Horizontal face text may be authored toward either Y direction. Keep
    // that orientation; it does not change which side of the face is visible.
    const supportedUp=axis===2?(same(up,[0,1,0]) || same(up,[0,-1,0])):same(up,[0,0,1]);
    if(!supportedUp) return null;
    const sign=Math.sign(front[axis]);
    if(signs[axis] && signs[axis]!==sign) return null;
    signs[axis]=sign;
  }
  if(signs.filter(Boolean).length<2) return null;
  return unit(signs);
}

export function computeInitialReadingView({ layout, camera, width, height, explicitCamera = false } = {}) {
  if (explicitCamera || !layout || layout.hasAux || !Number.isFinite(width) || !Number.isFinite(height) || !(width>0 && height>0)) return null;
  const labels=layout.labels ?? [], geometry=layout.geometry ?? [];
  if(labels.length<2 || geometry.length<3 || !geometry.every(finite3)) return null;
  const pose=labels[0]?.pose;
  const firstNormal=unit(pose?.front), firstUp=unit(pose?.up);
  const commonPlane=firstNormal && firstUp && Math.abs(firstNormal[2])<=1e-6 && same(firstUp,[0,0,1])
    && labels.every(label=>label.pose?.mode==='fixed' && same(unit(label.pose.front),firstNormal) && same(unit(label.pose.up),firstUp));
  let planar=commonPlane;
  let normal=commonPlane?firstNormal:mixedFaceNormal(labels);
  if(!normal) return null;
  let right=unit(cross(commonPlane?firstUp:[0,0,1],normal));
  if(!right) return null;
  let up=commonPlane?firstUp:unit(cross(normal,right));
  const project = points => points.map(p=>[dot(p,right),dot(p,up),dot(p,normal)]);
  const g=project(geometry);
  const [gx0,gx1]=range(g,0),[gy0,gy1]=range(g,1),[gz0,gz1]=range(g,2);
  const lateral=Math.max(gx1-gx0,gy1-gy0);
  if(gx1-gx0<1e-5 || gy1-gy0<1e-5) return null;
  // Thin volumetric marks (for example stacked bars) remain readable head-on.
  // A deep series of similarly oriented labels needs an oblique view so that
  // its depth remains visible. Fit only this frame, preserving every coordinate.
  if(commonPlane && gz1-gz0>Math.max(1e-6,lateral*.1)) {
    normal=unit(firstNormal.map((v,i)=>v+.8*right[i]+.6*firstUp[i]));
    right=unit(cross([0,0,1],normal));up=unit(cross(normal,right));planar=false;
  }
  const corners=labels.flatMap(label=>label.corners ?? []);
  if(corners.length!==labels.length*4 || !corners.every(finite3)) return null;
  const all=project([...geometry,...corners]);
  const c=[0,1,2].map(i=>{const [a,b]=range(all,i);return(a+b)/2;});
  const fov=Number(camera?.fov) || 50;
  if(!(fov>1 && fov<179))return null;
  const tan=Math.tan(fov*Math.PI/360), aspect=width/height, margin=1.12;
  let distance=2;
  for(const p of all) distance=Math.max(distance,p[2]-c[2]+Math.max(planar?0:1,margin*Math.max(Math.abs(p[0]-c[0])/(tan*aspect),Math.abs(p[1]-c[1])/tan)));
  // Match cameraEngine's existing numerical limits without pretending a clamped
  // fit can contain a larger model.
  if(distance>1000 || !Number.isFinite(distance))return null;
  const target=[0,1,2].map(i=>right[i]*c[0]+up[i]*c[1]+normal[i]*c[2]);
  if(target.some(v=>Math.abs(v)>10000))return null;
  return {theta:Math.atan2(normal[1],normal[0]),phi:planar?Math.PI/2:Math.acos(normal[2]),distance,
    target:{x:target[0],y:target[1],z:target[2]},fov};
}
