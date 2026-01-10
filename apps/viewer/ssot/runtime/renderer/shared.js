// runtime/renderer/shared.js
import * as THREE from "/viewer/vendor/three/build/three.module.js";

export function getUuid(node) {
  if (!node) return null;
  return node?.meta?.uuid ?? node?.uuid ?? null;
}

export function getPointPosition(node, indices) {
  const uuid = getUuid(node);

  if (
    uuid &&
    indices &&
    indices.pointPosition instanceof Map &&
    indices.pointPosition.has(uuid)
  ) {
    return indices.pointPosition.get(uuid);
  }

  if (
    Array.isArray(node?.appearance?.position) &&
    node.appearance.position.length === 3
  ) {
    return node.appearance.position;
  }

  if (Array.isArray(node?.position) && node.position.length === 3) {
    return node.position;
  }

  return [0, 0, 0];
}

export function getColor(node, fallback = "#ffffff") {
  const c = node?.appearance?.color ?? node?.color ?? fallback;
  return new THREE.Color(c);
}

export function getOpacity(node, fallback = 1.0) {
  const o = node?.appearance?.opacity ?? node?.opacity;
  return typeof o === "number" ? o : fallback;
}

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
