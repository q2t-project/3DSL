// ============================================================
// drawPoints.js
// 3DSS.points を three.js Mesh として描画
//   - viewerRenderer.registerLayer(drawPoints) から呼ばれる
//   - three.js 依存部分をこのファイル内に隔離
// ============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, objectByUUID } from "./viewerRenderer.js";

// キャッシュ：point cloud の Object3D
let pointsGroup = null;
let pointsBuilt = false;

/**
 * 3DSS 構造から point メッシュを構築
 */
function buildPoints(state, scene) {
  if (!state || !Array.isArray(state.points)) return;

  if (!pointsGroup) {
    pointsGroup = new THREE.Group();
    pointsGroup.name = "pointsGroup";
    scene.add(pointsGroup);
  }

  pointsGroup.clear();

  for (const p of state.points) {
    const app = p.appearance || {};
    const pos = Array.isArray(app.position) ? app.position : [0, 0, 0];

    const colorRaw = app.color ?? 0xff5555;
    const color =
      typeof colorRaw === "string"
        ? new THREE.Color(colorRaw)
        : colorRaw;

    const opacity = app.opacity ?? 1.0;
    const renderOrder = app.renderOrder ?? 0;

    // テスト用にかなり大きめ
    const radius = 20.0;

    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      pos[0] ?? 0,
      pos[1] ?? 0,
      pos[2] ?? 0
    );
    mesh.renderOrder = renderOrder;

    // uuid → Object3D の対応を登録（selection / highlight 用）
    const uuid = p.meta?.uuid;
    if (uuid) {
      objectByUUID.set(uuid, mesh);
      mesh.userData.uuid = uuid;
    }

    pointsGroup.add(mesh);
  }

  console.log(
    "[drawPoints] buildPoints finished, children =",
    pointsGroup.children.length
  );
}

/**
 * レイヤ本体
 */
export function drawPoints(ctx, state) {
  if (!state || !Array.isArray(state.points) || state.points.length === 0) {
    return;
  }

  console.log("[drawPoints] called, points =", state.points.length);

  const { scene } = ctx;

  if (!pointsGroup || !pointsBuilt) {
    buildPoints(state, scene);
    pointsBuilt = true;
  }
}

/**
 * viewerRenderer にレイヤ登録
 */
export function initPointsLayer() {
  registerLayer(drawPoints);
  console.log("[drawPoints] layer registered");
}
