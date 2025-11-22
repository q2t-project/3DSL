// ============================================================
// drawPoints.js
// 3DSS.points を three.js Mesh として描画
//   - viewerRenderer.registerLayer(drawPoints) から呼ばれる
//   - three.js 依存部分をこのファイル内に隔離
// ============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, objectByUUID } from "./viewerRenderer.js";

// ------------------------------------------------------------
// 共通ヘルパ：position を {x,y,z} に正規化
//   - [x,y,z] 形式でも {x,y,z} 形式でも対応（viewer_min_scene と同じ思想）
// ------------------------------------------------------------
function normalizePos(pos) {
  if (!pos) return { x: 0, y: 0, z: 0 };

  if (Array.isArray(pos)) {
    const [x = 0, y = 0, z = 0] = pos;
    return { x, y, z };
  }

  return {
    x: pos.x ?? 0,
    y: pos.y ?? 0,
    z: pos.z ?? 0,
  };
}

/**
 * state は state.buildState(json) の戻り値想定：
 *   {
 *     document_meta,
 *     points,  // 3DSS の points 配列そのまま
 *     lines,
 *     aux,
 *     ui_state,
 *   }
 */
export function drawPoints(ctx, state) {
  const { scene } = ctx;

  if (!state || !Array.isArray(state.points)) {
    return; // points が無ければ何もしない
  }

  const points = state.points;

  for (const p of points) {
    if (!p) continue;

    const app = p.appearance || {};
    const pos = normalizePos(app.position);

    // 3DSS 準拠：基本は meta.uuid、念のため p.uuid もフォールバック
    const uuid = p.meta?.uuid ?? p.uuid;
    if (!uuid) continue;

    const radius =
      typeof app.radius === "number" && app.radius > 0 ? app.radius : 0.4;

    const colorRaw = app.color ?? "#ff5555";
    const color =
      typeof colorRaw === "string" ? new THREE.Color(colorRaw) : colorRaw;

    const opacity =
      typeof app.opacity === "number" ? app.opacity : 1.0;

    const visible =
      typeof app.visible === "boolean" ? app.visible : true;

    // すでに Mesh があれば再利用して値だけ更新
    let mesh = objectByUUID.get(uuid);

    if (!mesh) {
      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      const material = new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: opacity < 1,
      });

      mesh = new THREE.Mesh(geometry, material);
      mesh.userData.uuid = uuid;
      mesh.userData.kind = "point";

      objectByUUID.set(uuid, mesh);
      scene.add(mesh);
    }

    // 毎フレーム更新するのは position / visible / opacity / color
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.visible = visible;

    const mat = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;

    if (mat) {
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      if (typeof colorRaw === "string") {
        mat.color?.set(colorRaw);
      } else if (color instanceof THREE.Color) {
        mat.color?.copy(color);
      }
      mat.needsUpdate = true;
    }
  }
}

/**
 * viewerRenderer にレイヤ登録
 */
export function initPointsLayer() {
  registerLayer(drawPoints);
  console.log("[drawPoints] layer registered");
}
