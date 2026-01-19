// viewer/runtime/renderer/labelConfig.js

import { LABEL_FONT_DEFAULT_FAMILY } from "./labelSpec.js";

// ラベル描画全般のチューニング用パラメータ
export const labelConfig = {
  // 3DSS の label.size=8 を「論理サイズ 1.0」の基準とみなす
  baseLabelSize: 8,

  // ワールド座標系での見た目
  world: {
    // size=8 のときの world 高さ
    // - 旧: 固定値 baseHeight
    // - 新: sceneRadius が取れる場合は baseHeightFactor * sceneRadius を優先（スケール感を合わせやすい）
    baseHeight: 1.0,
    baseHeightFactor: 0.32,
    // 点の位置からどれだけ持ち上げるか（worldHeight に対する係数）
    offsetYFactor: 0.6,
  },

  // Canvas2D へのラスタライズ設定
  raster: {
    // 1 論理サイズあたり何 px で描くか
    supersamplePx: 64,
    // フォント px の下限／上限
    minFontPx: 8,
    maxFontPx: 256,
    // 文字周りの padding(px)
    padding: 4,
    // フォントファミリ
    fontFamily: LABEL_FONT_DEFAULT_FAMILY,
  },

  // 文字色
  text: {
    fillStyle: "#ffffff",
  },

  // 背景矩形
  background: {
    enabled: false,
    fillStyle: "rgba(0, 0, 0, 0.65)",
  },

  // 文字アウトライン設定
  outline: {
    enabled: true,
    // Canvas 上の線幅(px) – supersample 高いので多少太めでOK
    widthPx: 4.,
    color: "rgba(0, 0, 0, 0.95)",
    lineJoin: "round",

    // アウトラインが切れないように追加の余白
    extraPaddingPx: 4,
  },
  // LOD / culling / throttle
  lod: {
    enabled: true,
    distance: {
      maxDistanceFactor: 6.0,
      fadeStartFactor: 0.85,
    },
    screenSize: {
      minPixels: 10,
    },
    throttleMs: 80,
    frustum: {
      enabled: true,
    },
  },
};
