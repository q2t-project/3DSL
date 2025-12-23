// viewer/runtime/renderer/microFX/axes.js
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";
import { clamp01, clampScale, normalizeIntensity, sanitizeVec3 } from "./utils.js";

// singleton
let axesGroup = null;

function readAxesConfig() {
  const cfg = microFXConfig.axes || {};
  const scalePerDistance = Number.isFinite(cfg.scalePerDistance) ? cfg.scalePerDistance : 0.08;
  const minScale = Number.isFinite(cfg.minScale) ? cfg.minScale : 0.6;
  const maxScale = Number.isFinite(cfg.maxScale) ? cfg.maxScale : 3.0;
  const opacity = Number.isFinite(cfg.opacity) ? cfg.opacity : 0.9;
  return { scalePerDistance, minScale, maxScale, opacity };
}

export function ensureAxes(scene) {
  if (axesGroup && axesGroup.parent !== scene) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }

  if (!axesGroup) {
    const positions = new Float32Array([
      -1, 0, 0,  1, 0, 0,
      0, -1, 0,  0, 1, 0,
      0, 0, -1,  0, 0, 1,
    ]);

    const colors = new Float32Array([
      0.3, 0.6, 1,  0.3, 0.6, 1,
      0.2, 1, 0.2,  0.2, 1, 0.2,
      1, 0.2, 0.2,  1, 0.2, 0.2,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 1,
    });

    axesGroup = new THREE.LineSegments(geometry, material);
    axesGroup.name = "micro-axes";
    axesGroup.renderOrder = 996;
  }

  if (axesGroup.parent !== scene) scene.add(axesGroup);
  return axesGroup;
}

export function updateAxes(target, localAxes, camera, intensity = 1) {
  if (!target) return;

  const s = normalizeIntensity(intensity, 1);
  if (s <= 0 || !localAxes || !camera) {
    target.visible = false;
    return;
  }

  const origin = sanitizeVec3(localAxes.origin ?? localAxes, null);
  if (!origin) {
    target.visible = false;
    return;
  }

  const xDir = sanitizeVec3(localAxes.xDir, null);
  const yDir = sanitizeVec3(localAxes.yDir, null);
  const zDir = sanitizeVec3(localAxes.zDir, null);
  const baseScale = clampScale(localAxes.baseScale ?? localAxes.scale ?? 1, 0.01, 10);

  target.position.fromArray(origin);

  if (xDir && yDir && zDir) {
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(
      new THREE.Vector3(...xDir),
      new THREE.Vector3(...yDir),
      new THREE.Vector3(...zDir),
    );
    target.quaternion.setFromRotationMatrix(matrix);
  } else {
    target.quaternion.copy(camera.quaternion);
  }

  const distance = camera.position.distanceTo(target.position) || 1;
  const { scalePerDistance, minScale, maxScale, opacity: opacityBase } = readAxesConfig();

  const rawScale = baseScale * distance * scalePerDistance;
  const scaled = THREE.MathUtils.clamp(rawScale, minScale, maxScale);

  target.scale.setScalar(scaled * s);

  const material = target.material;
  if (material && "opacity" in material) {
    material.transparent = true;
    material.opacity = clamp01(opacityBase * s);
  }

  target.visible = true;
}

export function removeAxes(scene) {
  if (!axesGroup) return;
  axesGroup.parent?.remove(axesGroup);
  axesGroup = null;
}
