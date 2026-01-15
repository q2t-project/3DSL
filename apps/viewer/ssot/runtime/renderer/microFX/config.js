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
    screenPx: 180,   // ★ 直径(px)。64→120 とかに上げる
    opacity: 0.8,
    // 必要なら安全弁（world直径）
    minWorld: 0.6,
    maxWorld: 6.0,
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

    // focus line の強調表示（Tube）
    lineGlow: {
      enabled: true,
      color: "#00ffff",
      // true にすると、lineProfile.effect_type="glow" の線だけに限定する（旧挙動）
      requireEffectTypeGlow: false,
      radius: 0.06,
      opacity: 0.7,
      widthFactor: 3.0,   // ベース線の何倍にするか
      depthTest: false,   // 常に前に出したいなら false
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
