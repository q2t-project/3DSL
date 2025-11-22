// /viewer/runtime/renderer/drawLines.js
// ============================================================
// drawLines.js
// 3DSS.lines を three.js Line として描画
//
// - viewerRenderer.registerLayer(drawLines) から呼ばれる
// - three.js 依存部分をこのファイル内に隔離
//
// 3DSS appearance 対応（現時点の範囲）:
//   end_a / end_b : { ref: uuid } or { coord:[x,y,z] }
//   line_type     : 'straight' 他（いまは 'straight' だけ実装、それ以外も暫定で直線）
//   color         : "#rrggbb" or number
//   opacity       : 0..1
//   renderOrder   : number
//   visible       : boolean (false のときだけスキップ)
// ============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, objectByUUID } from "./viewerRenderer.js";

// 一度だけ構築して、その後は何もしない（viewer_min_scene と同じ思想）
let linesBuilt = false;

// ------------------------------------------------------------
// 共通ヘルパ：position / coord を {x,y,z} に正規化
//   - [x,y,z] 形式でも {x,y,z} 形式でも対応
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

// ------------------------------------------------------------
// points から uuid → position の index を作る
// ------------------------------------------------------------
function buildPointIndex(points) {
  /** @type {Map<string, {x:number,y:number,z:number}>} */
  const map = new Map();

  if (!Array.isArray(points)) return map;

  for (const p of points) {
    if (!p) continue;
    const app = p.appearance || {};
    const pos = normalizePos(app.position);
    const uuid = p.meta?.uuid ?? p.uuid;
    if (!uuid) continue;
    map.set(uuid, pos);
  }

  return map;
}

// ------------------------------------------------------------
// end_a / end_b を実座標 {x,y,z} に解決
//   - { ref: uuid } → pointIndex から座標取得
//   - { coord:[x,y,z] } / { coord:{x,y,z} } → そのまま採用
//   - それ以外 / 解決失敗 → {0,0,0}
// ------------------------------------------------------------
function resolveEndPos(end, pointIndex) {
  if (!end) return { x: 0, y: 0, z: 0 };

  // point 参照
  if (end.ref) {
    const pos = pointIndex.get(end.ref);
    if (pos) return pos;
  }

  // 直指定 coord or position
  const coord = end.coord ?? end.position ?? [0, 0, 0];
  return normalizePos(coord);
}

// ------------------------------------------------------------
// lines を一度だけ組み立てて scene に追加
// ------------------------------------------------------------
function buildLinesOnce(state, scene) {
  const lines = Array.isArray(state.lines) ? state.lines : [];
  const points = Array.isArray(state.points) ? state.points : [];

  console.log("[drawLines] lines length =", lines.length);

  if (!lines.length) return;

  // 既存 line オブジェクトを掃除（points/aux には触らない）
  for (const [uuid, obj] of objectByUUID.entries()) {
    if (obj?.userData?.kind === "line") {
      scene.remove(obj);
      objectByUUID.delete(uuid);
    }
  }

  const pointIndex = buildPointIndex(points);

  for (const ln of lines) {
    if (!ln) continue;

    const app = ln.appearance || {};

    // visible === false のときだけスキップ（undefined → 表示）
    if (app.visible === false) continue;

    // 端点座標
    const a = resolveEndPos(app.end_a, pointIndex);
    const b = resolveEndPos(app.end_b, pointIndex);

    const colorRaw = app.color ?? "#ffff55";
    const color =
      typeof colorRaw === "string" ? new THREE.Color(colorRaw) : colorRaw;
    const opacity =
      typeof app.opacity === "number" ? app.opacity : 1.0;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a.x, a.y, a.z),
      new THREE.Vector3(b.x, b.y, b.z),
    ]);

    const material = new THREE.LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
    });

    const line = new THREE.Line(geometry, material);

    line.visible = true;
    line.renderOrder = app.renderOrder ?? 0;

    const uuid = ln.meta?.uuid ?? ln.uuid;
    if (uuid) {
      objectByUUID.set(uuid, line);
      line.userData.uuid = uuid;
      line.userData.kind = "line";
    }

    scene.add(line);
  }

  console.log("[drawLines] lines built from state =", lines.length);
}

// ------------------------------------------------------------
// drawPoints と同じく、drawLines は renderLoop から毎フレーム呼ばれるが
// 現状の 3DSS は静的なので、一度だけ build して以降は何もしない。
// （将来 frame 依存の変形をやるなら、この中を拡張する）
// ------------------------------------------------------------
export function drawLines(ctx, state) {
  const { scene } = ctx;
  if (!state || !scene) return;

  if (!linesBuilt) {
    buildLinesOnce(state, scene);
    linesBuilt = true;
  }
}

// ------------------------------------------------------------
// viewerRenderer へのレイヤ登録
// ------------------------------------------------------------
export function initLinesLayer() {
  registerLayer(drawLines);
  console.log("[drawLines] layer registered");
}
