// viewer/runtime/core/cameraViewDefs.js
// カメラの「定義済み視点」テーブル
// - Z+ が絶対上
// - theta: Z 軸まわり（ヨー）[rad]
// - phi  : Z+ からの極角       [rad]  (0=真上, π/2=水平, π=真下)

const DEG = Math.PI / 180;

// 真上すぎると数値的に不安なので、ちょいだけ寝かせる
export const TOP_EPS = 5 * DEG;

// アイソメ用の俯角（地平線からの角度） ≒ 35°
export const ISO_PITCH = 35 * DEG;
// pitch（地平線からの角度）→ phi（Z+ からの極角）への変換
// pitch = 0   → phi = π/2  (水平)
// pitch = π/2 → phi = 0    (真上)
const ISO_PHI = Math.PI / 2 - ISO_PITCH;

// ------------------------------------------------------------
// 基本 6 面 (x±, y±, z±)
// ------------------------------------------------------------
export const CAMERA_VIEW_DEFS = {
  // X+
  "x+": {
    theta: 0,             // +X 側から原点を見る
    phi: Math.PI / 2,     // 水平
  },
  // X-
  "x-": {
    theta: Math.PI,       // -X 側
    phi: Math.PI / 2,
  },
  // Y+（正面扱い）
  "y+": {
    theta: Math.PI / 2,   // +Y 側
    phi: Math.PI / 2,
  },
  // Y-
  "y-": {
    theta: -Math.PI / 2,  // -Y 側
    phi: Math.PI / 2,
  },
  // Z+（天）
  "z+": {
    theta: 0,
    phi: TOP_EPS,         // ほぼ真上
  },
  // Z-（地）
  "z-": {
    theta: 0,
    phi: Math.PI - TOP_EPS,
  },

  // ----------------------------------------------------------
  // アイソメ 4 方位（俯角 = ISO_PITCH, 方位は 45° + 90°×k）
  // ----------------------------------------------------------
  // NE: +X, +Y
  "iso-ne": {
    theta: 45 * DEG,
    phi: ISO_PHI,
  },
  // NW: -X, +Y
  "iso-nw": {
    theta: 135 * DEG,
    phi: ISO_PHI,
  },
  // SW: -X, -Y
  "iso-sw": {
    theta: -135 * DEG,
    phi: ISO_PHI,
  },
  // SE: +X, -Y
  "iso-se": {
    theta: -45 * DEG,
    phi: ISO_PHI,
  },
};

// わかりやすい名前からのショートカット
export const CAMERA_VIEW_ALIASES = {
  top: "z+",
  bottom: "z-",
  front: "y+",
  back: "y-",
  right: "x+",
  left: "x-",
  iso: "iso-ne",
};

// 7 プリセット巡回の順番（view_preset_index）
export const CAMERA_VIEW_PRESET_SEQUENCE = [
  "z+",      // 0: top
  "y+",      // 1: front
  "x+",      // 2: right
  "iso-ne",  // 3
  "iso-nw",  // 4
  "iso-sw",  // 5
  "iso-se",  // 6
];

export const CAMERA_VIEW_PRESET_COUNT =
  CAMERA_VIEW_PRESET_SEQUENCE.length;
