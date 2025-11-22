// ============================================================
// runtime/core/state.js
// 3DSS JSON → Core state（構造データは read-only, ui_state は viewer 専用）
// three.js 非依存・proxy / 正規化 / 再構築は一切しない
// ============================================================

/**
 * 3DSS JSON から Core state を構築する
 *
 * 戻り値の形:
 * {
 *   document_meta,  // read-only
 *   points,         // read-only
 *   lines,          // read-only
 *   aux,            // read-only
 *
 *   ui_state: {     // viewer 専用（構造と完全分離）
 *     selected_uuid,
 *     hovered_uuid,
 *     active_frame,
 *     visibility_state,
 *     panel_state,
 *     camera_state,
 *     viewer_settings,
 *   }
 * }
 *
 * @param {object} json - strict validation 済みの 3DSS
 * @returns {object} state
 */
export function buildState(json) {
  if (!json || typeof json !== "object") {
    throw new Error("[state] invalid 3DSS json");
  }

  // 構造データ部分：JSON そのまま（なければ空配列）を束ねるだけ
  const document_meta = json.document_meta ?? {};
  const points = Array.isArray(json.points) ? json.points : [];
  const lines = Array.isArray(json.lines) ? json.lines : [];
  const aux = Array.isArray(json.aux) ? json.aux : [];

  const struct = {
    document_meta,
    points,
    lines,
    aux,
  };

  // 構造データは deep-freeze（ui_state は後で別に作る）
  deepFreeze(struct);

  // viewer 専用の ui_state 初期値
  const ui_state = createInitialUIState();

  // state 本体：構造データ＋ ui_state
  return {
    ...struct,
    ui_state,
  };
}

// ============================================================
// ui_state 初期化
// ============================================================

function createInitialUIState() {
  const viewer_settings = createDefaultViewerSettings();

  return {
    // Select / Hover / Frame
    selected_uuid: null,
    hovered_uuid: null,
    active_frame: null, // null = frame フィルタ OFF

    // レイヤ表示状態（全部 ON からスタート）
    visibility_state: {
      points: true,
      lines: true,
      aux: true,
      aux_module: {
        grid: true,
        axis: true,
        plate: true,
        shell: true,
        hud: true,
        extension: true,
      },
    },

    // パネル開閉状態（暫定値。必要に応じて UI 側で上書き）
    panel_state: {
      info_panel_open: true,
      control_panel_open: false,
    },

    // カメラ状態（実際の値は CameraEngine が bounding box から再セット）
    camera_state: {
      position: [0, 0, 0],
      target: [0, 0, 0],
      zoom: 1,
      spherical: null, // { theta, phi, radius } などを後でセット
      fov: viewer_settings.camera.fov,
    },

    // 表示オプション（構造データとは独立）
    viewer_settings,
  };
}

function createDefaultViewerSettings() {
  return {
    info_display: "hover",
    render: {
      line_width_mode: "auto",
      min_line_width: 1.0,
      fixed_line_width: 2.0,
    },
    camera: {
      fov: 45,
      near: 0.1,
      far: 50000,
    },
  };
}

// ============================================================
// deep-freeze ユーティリティ（構造データ専用）
// ============================================================

function deepFreeze(obj) {
  if (!obj || typeof obj !== "object") return obj;

  // まず自分自身
  Object.freeze(obj);

  // 配下を再帰的に freeze
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj;
}
