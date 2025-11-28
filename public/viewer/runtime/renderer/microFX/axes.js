// viewer/runtime/renderer/microFX/axes.js

import * as THREE from "../../../../vendor/three/build/three.module.js";

let axesGroup = null; // singleton

function sanitizeVector3(arr) {
  if (!Array.isArray(arr) || arr.length < 3) return null;

  const MAX = 1e4;
  const [x, y, z] = arr.map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return THREE.MathUtils.clamp(n, -MAX, MAX);
  });

  return [x, y, z];
}

function sanitizeLocalAxes(localAxes) {
  if (!localAxes) return null;

  const origin = Array.isArray(localAxes?.origin)
    ? localAxes.origin
    : Array.isArray(localAxes)
      ? localAxes
      : null;

  const sanitizedOrigin = sanitizeVector3(origin);
  if (!sanitizedOrigin) return null;

  const sanitizedX = sanitizeVector3(localAxes?.xDir);
  const sanitizedY = sanitizeVector3(localAxes?.yDir);
  const sanitizedZ = sanitizeVector3(localAxes?.zDir);

  const rawScale = typeof localAxes?.scale === "number" ? Number(localAxes.scale) : 1;
  const baseScale = Number.isFinite(rawScale)
    ? THREE.MathUtils.clamp(rawScale, 0.01, 10)
    : 1;

  return {
    origin: sanitizedOrigin,
    xDir: sanitizedX,
    yDir: sanitizedY,
    zDir: sanitizedZ,
    baseScale,
  };
}

export function ensureAxes(scene) {
  if (axesGroup && axesGroup.parent !== scene) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }

  if (!axesGroup) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      // X axis
      -0.5, 0, 0,
      0.5, 0, 0,
      // Y axis
      0, -0.5, 0,
      0, 0.5, 0,
      // Z axis
      0, 0, -0.5,
      0, 0, 0.5,
    ]);

    const colors = new Float32Array([
      // X axis (red)
      1, 0, 0,
      1, 0, 0,
      // Y axis (green)
      0, 1, 0,
      0, 1, 0,
      // Z axis (blue)
      0, 0, 1,
      0, 0, 1,
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    axesGroup = new THREE.LineSegments(geometry, material);
    axesGroup.name = "micro-axes";
    axesGroup.renderOrder = 996;
  }

  if (axesGroup.parent !== scene) {
    scene.add(axesGroup);
  }

  return axesGroup;
}

export function updateAxes(target, localAxes, camera) {
  if (!target) return;

  const sanitized = sanitizeLocalAxes(localAxes);
  if (!sanitized || !camera) {
    target.visible = false;
    return;
  }

  const { origin, xDir, yDir, zDir, baseScale } = sanitized;

  target.position.fromArray(origin);

    if (xDir && yDir && zDir) {
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(
      new THREE.Vector3(...xDir),
      new THREE.Vector3(...yDir),
      new THREE.Vector3(...zDir)
    );
    target.quaternion.setFromRotationMatrix(matrix);
  } else {
    // fallback: カメラ方向に揃える（HUD 軸として自然）
    target.quaternion.copy(camera.quaternion);
  }

  const distance = camera.position.distanceTo(target.position);
  const scaled = THREE.MathUtils.clamp(baseScale * distance * 0.06, 0.06, 4.0);
  target.scale.setScalar(scaled);

  target.visible = true;
}

export function removeAxes(scene) {
  if (axesGroup) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }
}