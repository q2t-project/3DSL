// =============================================================
// viewer/runtime/ui/gizmo.js
// 画面左下付近に出す 3 軸ギズモ（HUD）
// =============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, getContext } from "../renderer/viewerRenderer.js";

let gizmoGroup = null;
let initialized = false;

// 使い回しベクタ
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _center = new THREE.Vector3();
const _offset = new THREE.Vector3();

/**
 * viewerRenderer 初期化後に 1 回だけ呼ぶ
 */
export function initGizmo() {
  if (initialized) return;

  const { scene, camera } = getContext();
  if (!scene || !camera) {
    console.error("[gizmo] viewerRenderer のコンテキストが未初期化や");
    return;
  }

  gizmoGroup = new THREE.Group();
  gizmoGroup.name = "viewer-gizmo";
  scene.add(gizmoGroup);

  const axisLength = 0.8;
  const origin = new THREE.Vector3(0, 0, 0);

  // X+（赤）
  const xArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    origin,
    axisLength,
    0xff5555
  );
  // Y+（緑）
  const yArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    origin,
    axisLength,
    0x55ff55
  );
  // Z+（青）
  const zArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    origin,
    axisLength,
    0x5555ff
  );

  gizmoGroup.add(xArrow, yArrow, zArrow);

  gizmoGroup.scale.setScalar(0.6);
  gizmoGroup.position.set(0, 0, 0);

  // 毎フレーム、カメラの左下あたりに固定する
  registerLayer((ctx) => {
    if (!gizmoGroup) return;
    const { camera } = ctx;

    camera.getWorldDirection(_forward);
    _forward.normalize();

    _up.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    _right.crossVectors(_up, _forward).normalize();

    const distance = 4;
    _center.copy(camera.position).add(
      _forward.clone().multiplyScalar(distance)
    );

    _offset.set(-1.0, -1.0, 0).normalize();
    const strength = 1.3;
    _offset.multiplyScalar(strength);

    const pos = new THREE.Vector3();
    pos
      .copy(_center)
      .addScaledVector(_right, _offset.x)
      .addScaledVector(_up, _offset.y);

    gizmoGroup.position.copy(pos);
    gizmoGroup.quaternion.identity();
  });

  initialized = true;
  console.log("[gizmo] init 完了");
}

export function getGizmoObject() {
  return gizmoGroup;
}
