// ============================================================
// uiState.js
// viewer 用 UI 状態オブジェクトの生成
// ============================================================

/**
 * ui_state を生成
 * @param {Object} options
 * @param {{min:number,max:number}} options.frameRange
 * @param {Object} [options.viewerSettings]
 */
export function createUiState({ frameRange, viewerSettings = {} }) {
  const range = frameRange || { min: 0, max: 0 };
  const initialFrame =
    typeof range.min === "number" && Number.isFinite(range.min)
      ? range.min
      : 0;

  return {
    camera_state: null,
    activeFrame: initialFrame,
    frameRange: { ...range },

    selection: {
      uuid: null,
      kind: null, // 'point' | 'line' | 'aux' | null
    },

    mode: "macro", // 'macro' | 'meso' | 'micro'

    viewerSettings: {
      fx: {
        micro: true,
        meso: true,
        modeTransitions: true,
        ...(viewerSettings.fx || {}),
      },
      camera: {
        rotateSpeed: 1.0,
        panSpeed: 1.0,
        zoomSpeed: 1.0,
        invertOrbitY: false,
        ...(viewerSettings.camera || {}),
      },
      ...viewerSettings,
    },

    focus: {
      active: false,
      uuid: null,
    },
  };
}
