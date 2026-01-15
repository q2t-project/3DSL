// viewer/runtime/core/cameraPresets.js
//
// 3 面図 + アイソメ 4 方位のカメラプリセット。
// - camera: CameraEngine 互換（snapToAxis / getState / setState）
// - struct / uiState / renderer には一切依存しない。
// - UI 側が使うための uiLabel / uiPos もここでまとめて定義する。

export { CAMERA_VIEW_DEFS, CAMERA_VIEW_ALIASES } from "./cameraViewDefs.js";

// 標準アイソメの俯角：cos φ = 1 / √3
const ISO_PHI = Math.acos(1 / Math.sqrt(3)); // ≒ 0.9553 rad

// プリセット一覧（UI 用メタ情報込み）
export const CAMERA_PRESETS = [
  // 3 面図
  {
    name: "top",
    kind: "axis",
    axis: "+z",
    label: "TOP",    // ログなどに使うラベル
    uiLabel: "TOP",  // UI ボタン表示
    uiPos: "top",    // ギズモ周り配置用
  },
  {
    name: "front",
    kind: "axis",
    axis: "+y",
    label: "FRONT",
    uiLabel: "FRONT",
    uiPos: "bottom",
  },
  {
    name: "right",
    kind: "axis",
    axis: "+x",
    label: "RIGHT",
    uiLabel: "RIGHT",
    uiPos: "right",
  },

  // アイソメ 4 方向
  // ここから下は「θ のみ切り替え、距離・target・fov は維持」
  {
    name: "iso_ne",
    kind: "angles",
    theta: Math.PI / 4,      // +X +Y
    phi: ISO_PHI,
    label: "ISO_NE",
    uiLabel: "NE",
    uiPos: "ne",
  },
  {
    name: "iso_nw",
    kind: "angles",
    theta: (3 * Math.PI) / 4, // -X +Y
    phi: ISO_PHI,
    label: "ISO_NW",
    uiLabel: "NW",
    uiPos: "nw",
  },
  {
    name: "iso_sw",
    kind: "angles",
    theta: -(3 * Math.PI) / 4, // -X -Y
    phi: ISO_PHI,
    label: "ISO_SW",
    uiLabel: "SW",
    uiPos: "sw",
  },
  {
    name: "iso_se",
    kind: "angles",
    theta: -Math.PI / 4,     // +X -Y
    phi: ISO_PHI,
    label: "ISO_SE",
    uiLabel: "SE",
    uiPos: "se",
  },
];

// name → preset のルックアップ用
const PRESET_MAP = new Map(
  CAMERA_PRESETS.map((p) => [p.name, p])
);

// 巡回順（ここをいじれば順番だけ変えられる）
export const CAMERA_PRESET_SEQUENCE = CAMERA_PRESETS.map((p) => p.name);

/**
 * 現在名と方向から「次のプリセット名」を返す。
 * - currentName が null/不明なら dir>0 で先頭, dir<0 で末尾
 * - dir >=0 → 前へ, dir<0 → 後ろへ（循環）
 */
export function getNextPresetName(currentName, dir = 1) {
  const seq = CAMERA_PRESET_SEQUENCE;
  const n = seq.length;
  if (!n) return null;

  const d = dir >= 0 ? 1 : -1;

  let idx = seq.indexOf(currentName);
  if (idx < 0) {
    idx = d > 0 ? 0 : n - 1;
  } else {
    idx = (idx + d + n) % n;
  }
  return seq[idx];
}

/**
 * 指定プリセットを camera に適用する。
 * - kind:"axis"   → snapToAxis（距離 / target / fov は維持）
 * - kind:"angles" → theta/phi だけ上書き（距離 / target / fov は維持）
 *
 * 成功したら適用したプリセット名（string）を返す。
 * 失敗したら null。
 */
export function applyCameraPreset(camera, name) {
  if (!camera || !name) return null;

  const preset = PRESET_MAP.get(String(name));
  if (!preset) return null;

  // 3 面図系：snapToAxis 優先
  if (
    preset.kind === "axis" &&
    typeof camera.snapToAxis === "function" &&
    typeof preset.axis === "string"
  ) {
    camera.snapToAxis(preset.axis);
    return preset.name;
  }

  // アイソメ系：theta / phi を直接セット
  if (
    preset.kind === "angles" &&
    typeof camera.getState === "function" &&
    typeof camera.setState === "function"
  ) {
    const cur = camera.getState() || {};
    const next = {
      ...cur,
      theta:
        typeof preset.theta === "number" ? preset.theta : cur.theta,
      phi:
        typeof preset.phi === "number" ? preset.phi : cur.phi,
      // distance / target / fov は cur をそのまま使う
    };
    camera.setState(next);
    return preset.name;
  }

  return null;
}
