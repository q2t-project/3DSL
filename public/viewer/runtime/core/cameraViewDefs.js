// viewer/runtime/core/cameraViewDefs.js
//
// 極座標 (theta, phi) によるカメラ向き定義の単一ソース。
// - Z-up
// - theta: Z 軸まわりのヨー（水平回転）、0 = +X, +π/2 = +Y
// - phi  : +Z からの極角（0 ≒ 真上, π/2 ≒ 水平, π ≒ 真下）

// 「ほぼ真上／真下」用の少しだけ傾けた値
// cameraEngine の EPSILON(1e-4) * 4 相当
const TOP_EPS = 4e-4;

export const CAMERA_VIEW_DEFS = {
  // 軸 6 面
  "x+": { theta: 0,            phi: Math.PI / 2 },
  "x-": { theta: Math.PI,      phi: Math.PI / 2 },
  "y+": { theta: Math.PI / 2,  phi: Math.PI / 2 },
  "y-": { theta: -Math.PI / 2, phi: Math.PI / 2 },
  "z+": { theta: 0,            phi: TOP_EPS },
  "z-": { theta: 0,            phi: Math.PI - TOP_EPS },

  // アイソメ 4 方（NE / NW / SW / SE）
  "iso-ne": { theta:  Math.PI / 4,        phi: Math.PI / 3 },
  "iso-nw": { theta:  3 * Math.PI / 4,    phi: Math.PI / 3 },
  "iso-sw": { theta: -3 * Math.PI / 4,    phi: Math.PI / 3 },
  "iso-se": { theta: -Math.PI / 4,        phi: Math.PI / 3 },
};

// 7ビュー巡回などで使う論理名→プリセット ID のマップ（必要なら拡張）
export const CAMERA_VIEW_ALIASES = {
  top: "z+",
  bottom: "z-",
  front: "y+",
  back: "y-",
  right: "x+",
  left: "x-",
  iso: "iso-ne", // 代表として NE
};
