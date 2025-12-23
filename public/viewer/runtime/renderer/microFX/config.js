// viewer/runtime/renderer/microFX/config.js
//
// microFX のチューニング設定（renderer 側）
// - named export: microFXConfig / DEBUG_MICROFX
// - ここが export してないと import 側が即死する

export const DEBUG_MICROFX = false;

export const microFXConfig = {
  // ------------------------------------------------------------
  // Marker（focusPosition の薄板）
  // ------------------------------------------------------------
  marker: {
    baseSize: 0.14,
    opacity: 0.06,
  },

  // ------------------------------------------------------------
  // Glow（focusPosition の輝きオーバーレイ）
  // ------------------------------------------------------------
  glow: {
    enabled: true,

    // 位置は focusPosition に固定しつつ、距離に応じて見た目を補正したい場合の係数
    offsetFactor: 0.0,

    // world 長さ（unitless）
    baseScale: 0.6,
    minScale: 0.25,
    maxScale: 3.0,

    opacity: 0.9,
  },

  // ------------------------------------------------------------
  // Axes（localAxes の可視化）
  // ------------------------------------------------------------
  axes: {
    scalePerDistance: 0.08,
    minScale: 0.6,
    maxScale: 3.0,
    opacity: 0.9,
  },

  // ------------------------------------------------------------
  // Bounds（localBounds の可視化）
  // ------------------------------------------------------------
  bounds: {
    shrinkFactor: 0.92,
    minEdge: 0.2,
    maxEdge: 6.0,
  },

  // ------------------------------------------------------------
  // Highlight（focusUuid / relatedUuids のなぞり）
  // ------------------------------------------------------------
  highlight: {
    focus: {
      color: "#00ffff",
      opacityBoost: 0.25,
      minLineOpacity: 0.85,
    },
    related: {
      color: "#66aaff",
      opacityBoost: 0.1,
      minLineOpacity: 0.4,
    },
    others: {},

    line: {
      focusWidth: 4,
      relatedWidth: 2,
    },

    // focus line の effect_type="glow" 用（Tube）
    lineGlow: {
      enabled: true,
      color: "#00ffff",
      radius: 0.06,
      opacity: 0.7,
      tubularSegmentsPerSegment: 8,
      radialSegments: 8,
      layers: [
        { radiusMul: 1.0, opacityMul: 1.0 },
        { radiusMul: 4.8, opacityMul: 0.35 },
        { radiusMul: 9.6, opacityMul: 0.12 },
      ],
    },
  },
};
