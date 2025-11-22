// /viewer/viewer_min_drawPoints.js
import * as THREE from "../vendor/three/build/three.module.js";

export function setupPoints(core, threeDSS) {
  const { scene } = core;
  const points = threeDSS.points || [];

  console.log("[min] points length =", points.length);

  /** uuid → position */
  const pointPosByUUID = new Map();

  for (const p of points) {
    const app = p.appearance || {};
    const pos = Array.isArray(app.position) ? app.position : [0, 0, 0];

    const colorRaw = app.color ?? "#ff5555";
    const color    = new THREE.Color(colorRaw);
    const opacity  = app.opacity ?? 1.0;
    const radius   = app.radius  ?? 0.04;

    const geo = new THREE.SphereGeometry(radius, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    scene.add(mesh);

    if (p.uuid) {
      pointPosByUUID.set(p.uuid, { x: pos[0], y: pos[1], z: pos[2] });
    }
  }

  console.log("[min] pointPosByUUID size =", pointPosByUUID.size);
  return pointPosByUUID;
}
