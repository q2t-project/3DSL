// ============================================================
// drawAux.js
// state.aux をまとめて描画する「ハブ」
//
// - grid / paxis / marker / image … を drawAux_modules/* に委譲
// - ここは “分岐 + auxGroup 管理 + uuid 登録の入口” だけを担当
//
// 3DSS aux 対応ポリシー：
//   - aux.type               : 旧版の type。なければ module.kind などから推定
//   - aux.appearance.visible : false のものは描画スキップ（未指定は表示）
//   - aux.meta.uuid          : あれば objectByUUID に登録（frame/selection 用）
//
// モジュール側の推奨シグネチャ：
//   drawGrid(ctx, aux)
//   ctx.scene     : THREE.Scene
//   ctx.auxGroup  : その aux 専用の Group（ここに add するのが推奨）
// ============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, objectByUUID } from "./viewerRenderer.js";

// モジュール読み込み
import { drawGrid } from "./drawAux_modules/grid.js";
import { drawPaxis } from "./drawAux_modules/paxis.js";
import { drawMarker } from "./drawAux_modules/marker.js";
import { drawImage } from "./drawAux_modules/image.js";
// gizmo（scene 内補助）を追加する場合ここで import
// import { drawGizmo } from "./drawAux_modules/gizmo.js";

// aux 全体をまとめる Group
let auxRootGroup = null;
let auxBuilt = false;

// ------------------------------------------------------------
// type 判定（3DSS / 旧版両対応）
// ------------------------------------------------------------
function getAuxType(aux) {
  if (!aux) return null;

  // 旧版そのまま
  if (typeof aux.type === "string") return aux.type;

  // 3DSS 風：appearance.module.kind / type など
  const mod = aux.appearance?.module;
  if (typeof mod?.kind === "string") return mod.kind;
  if (typeof mod?.type === "string") return mod.type;

  return null;
}

// ------------------------------------------------------------
// handler ディスパッチ
// ------------------------------------------------------------
function pickHandler(type) {
  switch (type) {
    case "grid":
      return drawGrid;

    case "paxis":
    case "axes":
      return drawPaxis;

    case "marker":
      return drawMarker;

    case "image":
      return drawImage;

    // case "gizmo":
    //   return drawGizmo;

    default:
      return null;
  }
}

// fallback
function drawUnknown(_ctx, aux) {
  console.warn("[drawAux] 未対応 aux.type / module:", aux);
}

// ------------------------------------------------------------
// auxGroup 構築
//   state.aux を走査して、各 aux 用の Group を 1 回だけ生成
// ------------------------------------------------------------
function buildAux(ctx, state) {
  const { scene } = ctx;

  if (!state || !Array.isArray(state.aux) || state.aux.length === 0) {
    return;
  }

  if (!auxRootGroup) {
    auxRootGroup = new THREE.Group();
    auxRootGroup.name = "auxGroup";
    scene.add(auxRootGroup);
  }

  auxRootGroup.clear();

  for (const aux of state.aux) {
    const app = aux.appearance || {};

    // visible === false のものだけスキップ（undefined → 表示）
    if (app.visible === false) continue;

    const type = getAuxType(aux);
    const handler = pickHandler(type) || drawUnknown;

    // この aux 専用のコンテナ Group
    const auxGroup = new THREE.Group();
    auxGroup.name = `aux-${type || "unknown"}`;
    auxRootGroup.add(auxGroup);

    // uuid → Object3D 登録（frame / selection / highlight 用）
    const uuid = aux.meta?.uuid;
    if (uuid) {
      objectByUUID.set(uuid, auxGroup);
    }

    // モジュール側に渡す ctx を拡張
    const ctxForModule = {
      ...ctx,
      auxGroup, // モジュールは基本ここに add する想定
    };

    try {
      handler(ctxForModule, aux);
    } catch (err) {
      console.error("[drawAux] handler error:", err, aux);
    }
  }

  console.log(
    "[drawAux] buildAux finished, children =",
    auxRootGroup.children.length
  );
}

// ============================================================
// メイン関数（レイヤ本体）
// ============================================================
export function drawAux(ctx, state) {
  if (!state || !Array.isArray(state.aux) || state.aux.length === 0) {
    return;
  }

  if (!auxRootGroup || !auxBuilt) {
    buildAux(ctx, state);
    auxBuilt = true;
  }
}

// viewerRenderer 初期化後に一度だけ呼んでレイヤ登録する
export function initAuxLayer() {
  registerLayer(drawAux);
  console.log("[drawAux] layer registered");
}
