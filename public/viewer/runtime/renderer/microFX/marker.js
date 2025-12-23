// viewer/runtime/renderer/microFX/marker.js
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";
import { clampScale, normalizeIntensity, sanitizePosition } from "./utils.js";

let marker = null;

export function ensureMarker(scene) {
  if (marker && marker.parent !== scene) {
    marker.parent?.remove(marker);
    marker = null;
  }

  if (!marker) {
    const cfg = microFXConfig.marker || {};
    const baseSize = Number.isFinite(cfg.baseSize) ? cfg.baseSize : 0.14;
    const baseOpacity = Number.isFinite(cfg.opacity) ? cfg.opacity : 0.06;

    const geometry = new THREE.PlaneGeometry(baseSize, baseSize);
    const material = new THREE.MeshBasicMaterial({
      color: "#ffffaa",
      transparent: true,
      opacity: baseOpacity,
      depthTest: false,
      depthWrite: false,
    });

    marker = new THREE.Mesh(geometry, material);
    marker.renderOrder = 20;
    marker.visible = false;
    marker.userData.baseOpacity = baseOpacity;
  }

  if (marker.parent !== scene) scene.add(marker);
  return marker;
}

// position: microState.focusPosition（unitless world vec3）
export function updateMarker(target, position, intensity = 1) {
  if (!target) return;

  const p = sanitizePosition(position, null);
  const s = normalizeIntensity(intensity, 1);

  if (!p || s <= 0) {
    target.visible = false;
    return;
  }

  target.position.set(p[0], p[1], p[2]);

  const cfg = microFXConfig.marker || {};
  const fallbackOpacity = Number.isFinite(cfg.opacity) ? cfg.opacity : 0.06;
  const baseOpacity =
    typeof target.userData.baseOpacity === "number" ? target.userData.baseOpacity : fallbackOpacity;

  const mat = target.material;
  if (mat && "opacity" in mat) {
    mat.transparent = true;
    mat.opacity = baseOpacity * s;
    mat.depthTest = false;
    mat.depthWrite = false;
  }

  const minScale = 0.3;
  const scale = minScale + (1 - minScale) * s;
  target.scale.setScalar(clampScale(scale, 0.01, 100));

  target.visible = true;
}

export function removeMarker(scene) {
  if (!marker) return;
  marker.parent?.remove(marker);
  marker = null;
}
