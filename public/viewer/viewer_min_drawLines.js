// /viewer/viewer_min_drawLines.js
import * as THREE from "../vendor/three/build/three.module.js";

export function setupLines(core, threeDSS, pointPosByUUID) {
  const { scene } = core;
  const lines = threeDSS.lines || [];

  console.log("[min] lines length =", lines.length);

  for (const ln of lines) {
    const app = ln.appearance || {};
    const endA = app.end_a || {};
    const endB = app.end_b || {};

    const pa = pointPosByUUID.get(endA.ref);
    const pb = pointPosByUUID.get(endB.ref);
    if (!pa || !pb) continue;

    const colorRaw = app.color ?? "#ffffff";
    const color    = new THREE.Color(colorRaw);
    const opacity  = app.opacity ?? 1.0;

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pa.x, pa.y, pa.z),
      new THREE.Vector3(pb.x, pb.y, pb.z),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1.0,
    });

    const line = new THREE.Line(geo, mat);
    scene.add(line);
  }
}
