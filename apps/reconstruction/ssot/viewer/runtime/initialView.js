// Conservative initial reading view. A camera choice is presentation state only;
// authored coordinates, labels, orientation and document data are never changed.
const finite3 = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function unit(a) { if(!finite3(a))return null;const n=Math.hypot(...a);return n>1e-8?a.map(v=>v/n):null; }

export function computeInitialReadingView({ layout, camera, width, height, explicitCamera = false } = {}) {
  if (explicitCamera || !layout || layout.hasAux || !(width>0 && height>0)) return null;
  const labels=layout.labels ?? [], geometry=layout.geometry ?? [];
  if(labels.length<2 || geometry.length<3 || !geometry.every(finite3)) return null;
  const pose=labels[0]?.pose;
  const normal=unit(pose?.front), up=unit(pose?.up);
  // The current orbit camera fixes +Z up. Top planes or authored roll need a
  // different camera contract, so leave their existing initial view untouched.
  if(!normal || !up || Math.abs(normal[2])>1e-6 || dot(up,[0,0,1])<.999999) return null;
  if(labels.some(label=>label.pose?.mode!=='fixed' || !unit(label.pose.front) || !unit(label.pose.up)
    || dot(unit(label.pose.front),normal)<.999999 || dot(unit(label.pose.up),up)<.999999)) return null;
  const right=unit(cross(up,normal));
  const project = points => points.map(p=>[dot(p,right),dot(p,up),dot(p,normal)]);
  const g=project(geometry);
  const range=(points,i)=>[Math.min(...points.map(p=>p[i])),Math.max(...points.map(p=>p[i]))];
  const [gx0,gx1]=range(g,0),[gy0,gy1]=range(g,1),[gz0,gz1]=range(g,2);
  const lateral=Math.max(gx1-gx0,gy1-gy0);
  if(gx1-gx0<1e-5 || gy1-gy0<1e-5 || gz1-gz0>Math.max(1e-6,lateral*.01)) return null;
  const corners=labels.flatMap(label=>label.corners ?? []);
  if(corners.length!==labels.length*4 || !corners.every(finite3)) return null;
  const all=project([...geometry,...corners]);
  const c=[0,1,2].map(i=>{const [a,b]=range(all,i);return(a+b)/2;});
  const fov=Number(camera?.fov) || 50;
  if(!(fov>1 && fov<179))return null;
  const tan=Math.tan(fov*Math.PI/360), aspect=width/height, margin=1.12;
  let distance=2;
  for(const p of all) distance=Math.max(distance,p[2]-c[2]+margin*Math.max(Math.abs(p[0]-c[0])/(tan*aspect),Math.abs(p[1]-c[1])/tan));
  // Match cameraEngine's existing numerical limits without pretending a clamped
  // fit can contain a larger model.
  if(distance>1000 || !Number.isFinite(distance))return null;
  const target=[0,1,2].map(i=>right[i]*c[0]+up[i]*c[1]+normal[i]*c[2]);
  if(target.some(v=>Math.abs(v)>10000))return null;
  return {theta:Math.atan2(normal[1],normal[0]),phi:Math.PI/2,distance,
    target:{x:target[0],y:target[1],z:target[2]},fov};
}
