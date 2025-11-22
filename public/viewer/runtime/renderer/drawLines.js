// ============================================================
// drawLines.js
// 3DSS.lines を three.js Line として描画
//
// - viewerRenderer.registerLayer(drawLines) から呼ばれる
// - three.js 依存部分をこのファイル内に隔離
// - 旧版の a/b, color, opacity, renderOrder も 3DSS.appearance に対応済み
//
// 3DSS appearance 対応:
//   end_a / end_b : { ref: uuid } or { coord:[x,y,z] }
//   line_type     : 'straight' 他（いまは 'straight' だけ実装、それ以外は暫定で直線）
//   line_style    : 'solid' / 'dashed' / 'dotted' / 'double' / 'none'
//   color         : "#rrggbb" or number
//   opacity       : 0..1
//   renderOrder   : number
//   visible       : boolean (false のときだけスキップ)
//   frames        : 可視制御は frameController 側で uuid → Object3D.visible を操作
//   arrow/effect  : 入口だけ確保（現時点では視覚効果なし）
// ============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, objectByUUID } from "./viewerRenderer.js";

// キャッシュ：lines の Object3D
let linesGroup = null;
let linesBuilt = false;

// ------------------------------------------------------------
// points から uuid → position の index を作る
// ------------------------------------------------------------
function buildPointIndex(state) {
  /** @type {Map<string, [number, number, number]>} */
  const map = new Map();

  if (!state || !Array.isArray(state.points)) return map;

  for (const p of state.points) {
    const uuid = p?.meta?.uuid;
    const pos = p?.appearance?.position;
    if (!uuid) continue;
    if (!Array.isArray(pos) || pos.length < 3) continue;
    map.set(uuid, [pos[0], pos[1], pos[2]]);
  }

  return map;
}

// ------------------------------------------------------------
// end_a / end_b を実座標 [x,y,z] に解決
//   - { ref: uuid } → pointIndex から座標取得
//   - { coord:[x,y,z] } → そのまま採用
//   - それ以外 / 解決失敗 → [0,0,0]
// ------------------------------------------------------------
function resolveEnd(end, pointIndex) {
  if (!end) return [0, 0, 0];

  // point 参照
  if (end.ref) {
    const pos = pointIndex.get(end.ref);
    if (pos) return pos;
  }

  // 直指定 coord
  if (Array.isArray(end.coord) && end.coord.length >= 3) {
    return [
      end.coord[0] ?? 0,
      end.coord[1] ?? 0,
      end.coord[2] ?? 0,
    ];
  }

  return [0, 0, 0];
}

// ------------------------------------------------------------
// material を line_style に応じて作る
//   - solid     → LineBasicMaterial
//   - dashed    → LineDashedMaterial（単純な破線）
//   - dotted    → LineDashedMaterial（破線間隔を短く）
//   - double    → ひとまず LineBasicMaterial 1 本（将来拡張）
//   - none      → null（そのラインは描画しない）
// ------------------------------------------------------------
function createLineMaterial(app) {
  const colorRaw = app.color ?? 0xff5555;
  const color =
    typeof colorRaw === "string" ? new THREE.Color(colorRaw) : colorRaw;

  const opacity = app.opacity ?? 1.0;
  const transparent = opacity < 1.0;

  const style = app.line_style ?? "solid";

  if (style === "none") return null;

  if (style === "dashed" || style === "dotted") {
    const dashSize = style === "dotted" ? 0.1 : 0.4;
    const gapSize = style === "dotted" ? 0.2 : 0.2;

    return new THREE.LineDashedMaterial({
      color,
      opacity,
      transparent,
      dashSize,
      gapSize,
    });
  }

  // solid / double / その他 → 基本線
  return new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent,
  });
}

// ------------------------------------------------------------
// linesGroup の構築（state.lines から一回だけ Mesh/Line を生成）
// ------------------------------------------------------------
function buildLines(state, scene) {
  if (!state || !Array.isArray(state.lines) || state.lines.length === 0) {
    return;
  }

  if (!linesGroup) {
    linesGroup = new THREE.Group();
    linesGroup.name = "linesGroup";
    scene.add(linesGroup);
  }

  linesGroup.clear();

  const pointIndex = buildPointIndex(state);

  for (const l of state.lines) {
    const app = l?.appearance || {};

    // visible === false のときだけスキップ（undefined → 表示）
    if (app.visible === false) continue;

    const lineType = app.line_type || "straight";

    // 端点座標を resolve
    const aPos = resolveEnd(app.end_a, pointIndex);
    const bPos = resolveEnd(app.end_b, pointIndex);

    // geometry 準備
    const geometry = new THREE.BufferGeometry();

    // line_type による分岐（今は straight 以外も単純な2点線で暫定表示）
    // 将来 polyline / bezier / arc などに拡張可能。
    const positions = new Float32Array([
      aPos[0], aPos[1], aPos[2],
      bPos[0], bPos[1], bPos[2],
    ]);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material = createLineMaterial(app);
    if (!material) {
      // line_style: "none" など
      continue;
    }

    const line = new THREE.Line(geometry, material);

    // dashed の場合は距離計算が必要
    if (material instanceof THREE.LineDashedMaterial) {
      line.computeLineDistances();
    }

    line.renderOrder = app.renderOrder ?? 0;

    // 旧版: l.color / l.opacity / l.renderOrder
    // → すべて app.color / app.opacity / app.renderOrder に移行済み

    // uuid → Object3D の登録（frame / selection / highlight 用）
    const uuid = l?.meta?.uuid;
    if (uuid) {
      objectByUUID.set(uuid, line);
    }

    // arrow / effect は現状未実装だが入口だけ確保
    // const arrow = app.arrow;
    // const effect = app.effect;

    linesGroup.add(line);
  }

  console.log(
    "[drawLines] buildLines finished, children =",
    linesGroup.children.length
  );
}

// ------------------------------------------------------------
// レイヤ本体
// ------------------------------------------------------------
export function drawLines(ctx, state) {
  if (!state || !Array.isArray(state.lines) || state.lines.length === 0) {
    return;
  }

  const { scene } = ctx;

  if (!linesGroup || !linesBuilt) {
    buildLines(state, scene);
    linesBuilt = true;
  }
}

// ------------------------------------------------------------
// viewerRenderer へのレイヤ登録用エントリ
//   （bootstrapViewer などから initLinesLayer() を呼ぶ前提）
// ------------------------------------------------------------
export function initLinesLayer() {
  registerLayer(drawLines);
  console.log("[drawLines] layer registered");
}
