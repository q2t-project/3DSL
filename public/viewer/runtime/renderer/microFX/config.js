// viewer/runtime/renderer/microFX/config.js
//
// !!! 注意 !!!
// これは「renderer/microFX サブシステム専用」の係数置き場。
// CameraEngine や frame/timeline, UI など他レイヤの設定は
// 絶対にここへ混ぜないこと。
// （必要なら各レイヤごとに config ファイルを分ける）
//
// microFX 全体の係数をここに集約しておく。
// 原則としてすべて「unitless な world 座標・距離」に対する係数。
// （一部、three.js の描画用パラメータ値 linewidth などを含む）
// px や画面解像度には依存しないようにしておき、
// 数値チューニングは基本ここだけ触れば OK にする。

// microFX の有効/無効をまとめて切り替えるフラグ
// - 本番運用では true 固定
// - デバッグで「microFX 全部切りたい」ときだけ false にする
export const DEBUG_MICROFX = true;

export const microFXConfig = {
  // フォーカスマーカー（plane）の見た目
  marker: {
    // world 座標系での一辺長さ（unitless）
    baseSize: 0.14,
    // plane の不透明度
    opacity: 0.06,
  },
  axes: {
  // target との距離 1.0（unitless）あたりの軸長スケール係数
    scalePerDistance: 0.045,
    // clamp
    minScale: 0.08,
    maxScale: 1.8
  },

  bounds: {
    // AABB のサイズ（unitless 長さ）に対する縮小率
    shrinkFactor: 0.7,
    // AABB エッジ長の下限・上限（unitless）
    minEdge: 0.4,
    maxEdge: 3.0,

    // コーナーハンドルのスケール計算用
    // - minBase/maxBase: 「最小辺長」から切り出す基準スケールの範囲
    // - scaleFactor: 基準スケールに掛ける係数
    handle: {
      minBase: 0.2,
      maxBase: 1.0,
      scaleFactor: 0.05,
    },
  },

  glow: {
    // カメラ→点 方向へのオフセット係数（距離に対する比率）
    // 距離 dist に対して dist * offsetFactor だけカメラ側へ寄せる
    offsetFactor: 0.04,

    // world 座標系での「グロー半径」の基準値（unitless）
    // ここを変えると、ズームしたときの見かけの大きさも一緒に変わる。
    baseScale: 0.4,

    // 安全のためのクランプ（unitless）
    minScale: 0.1,
    maxScale: 3.0,
  },

  // micro モード時の「親等別」強調ポリシー
  // idx = degree（0 親等 = focus, 1 親等, 2 親等, 3 親等以上）
  degree: {
    alpha: [1.0, 0.7, 0.4, 0.15],
    scale: [1.2, 1.0, 0.95, 0.9],

    // これより大きい degree は描画自体を抑制してもよい
    // （axes/bounds/glow を出さない等）
    maxVisibleDegree: 3
  },

  // focus / related 用のハイライト係数
  highlight: {
    focus: {
      // baseStyle.opacity に対する加算ブースト（0.0〜）
      opacityBoost: 0.25,
      // 線オーバーレイの色
      color: "#00ffff",
      // 線の見た目を最低どれくらい明るくするか
      minLineOpacity: 0.95
    },
    related: {
      opacityBoost: 0.1,
      color: "#00bfff",
      minLineOpacity: 0.85
    },
    others: {
      // focus/related 以外をどれくらい暗くするか（1.0 で変化なし）
      opacityMultiplier: 0.4
    },

    // 線オーバーレイの線幅（three.js LineBasicMaterial の linewidth 単位）
    line: {
      focusWidth: 4,
      relatedWidth: 2,
    },
    // 線フォーカス時の「線そのものが光って見える」用グロー
    lineGlow: {
      enabled: true,
      // チューブ半径（unitless）。太さの基準
      radius: 0.005,
      // 発光の濃さ
      opacity: 0.7,
      // 1 セグメントあたりの細分数（増やすと滑らか・重くなる）
      tubularSegmentsPerSegment: 32,
      radialSegments: 32,
      color: "#00ffff",

      // radius に対する多層グローの倍率と不透明度
      // radiusMul: 半径倍率, opacityMul: 不透明度倍率
      layers: [
        { radiusMul: 1.0, opacityMul: 1.0 },   // コア
        { radiusMul: 4.8, opacityMul: 0.35 },  // 内側ハロー
        { radiusMul: 9.6, opacityMul: 0.12 },  // 外側ハロー
      ],
    }
  }
};