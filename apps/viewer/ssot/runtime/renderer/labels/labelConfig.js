// viewer/runtime/renderer/labelConfig.js

import { LABEL_FONT_DEFAULT_FAMILY } from "./labelSpec.js";

// ラベル描画全般のチューニング用パラメータ
export const labelConfig = {
  // 3DSS の label.size=8 を「論理サイズ 1.0」の基準とみなす
  baseLabelSize: 8,

  // ワールド座標系での見た目
  world: {
    // size=8 のときの world 高さ
    baseHeight: 8,
    // 点の位置からどれだけ持ち上げるか（worldHeight に対する係数）
    offsetYFactor: 0.6,
  },

  // Text backend
  // - Default: troika-three-text (SDF/MSDF-like). Must be available under /vendor.
  // - You can map 3DSS `text.font` tokens to actual font URLs.
  troika: {
    // default font URL (optional). When null/empty, troika uses its internal default.
    defaultFontUrl: "/vendor/fonts/noto-sans-jp/NotoSansJP-Regular.ttf",
    // font token -> URL
    //
    // NOTE: troika font parser expects TTF/OTF (woff/woff2 are not reliably supported).
    fontMap: {
      helvetiker_regular: "/vendor/fonts/noto-sans-jp/NotoSansJP-Regular.ttf",
      helvetiker_bold: "/vendor/fonts/noto-sans-jp/NotoSansJP-Bold.ttf",
      noto_sans_jp_regular: "/vendor/fonts/noto-sans-jp/NotoSansJP-Regular.ttf",
      noto_sans_jp_bold: "/vendor/fonts/noto-sans-jp/NotoSansJP-Bold.ttf",
    },
  },


  // Canvas2D へのラスタライズ設定
  raster: {
    // 1 論理サイズあたり何 px で描くか
    // NOTE: CanvasTexture は縮小時にボヤけやすいので少し高めにしておく
    supersamplePx: 96,
    // フォント px の下限／上限
    minFontPx: 8,
    maxFontPx: 256,
    // 文字周りの padding(px)
    padding: 4,
    // フォントファミリ
    fontFamily: LABEL_FONT_DEFAULT_FAMILY,

    // texture sampling
    // - 縮小時の輪郭を保つため mipmap を有効化
    // - 互換性のため文字列で指定（three の定数に変換する）
    generateMipmaps: true,
    minFilter: "LinearMipmapLinear",
    magFilter: "Linear",
    anisotropy: 4,
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
