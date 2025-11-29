// viewer/runtime/renderer/microFX/config.js
//
// !!! 注意 !!!
// これは「renderer/microFX サブシステム専用」の係数置き場。
// CameraEngine や frame/timeline, UI など他レイヤの設定は
// 絶対にここへ混ぜないこと。
// （必要なら各レイヤごとに config ファイルを分ける）
//
// microFX 全体の係数をここに集約しておく。
// すべて「unitless な world 座標・距離」に対する係数。
// px や画面解像度には依存しないようにしておき、
// 数値チューニングは基本ここだけ触れば OK にする。

// microFX の有効/無効をまとめて切り替えるフラグ
// - 本番運用では true 固定
// - デバッグで「microFX 全部切りたい」ときだけ false にする
export const DEBUG_MICROFX = true;

export const microFXConfig = {
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
    maxEdge: 3.0
  },

  glow: {
    // カメラ→点 方向へのオフセット係数（距離に対する比率）
    offsetFactor: 0.01,
    // 距離 1.0（unitless）あたりの glow スケール
    scalePerDistance: 0.035,
    // clamp
    minScale: 0.18,
    maxScale: 1.5
  }
};