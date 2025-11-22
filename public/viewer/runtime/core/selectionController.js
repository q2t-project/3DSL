// ============================================================
// selectionController.js
//  - uuid ベースの選択状態管理
//  - rendererContext.setHighlight / clearAllHighlights を利用
// ============================================================

/**
 * @param {Object} params
 * @param {Object} params.ui_state
 * @param {Map<string,any>} params.indexByUUID
 * @param {Object} params.rendererContext
 */
export function createSelectionController({
  ui_state,
  indexByUUID,
  rendererContext,
}) {
  const {
    setHighlight = null,
    clearAllHighlights = null,
  } = rendererContext || {};

  function select(uuid) {
    const info = indexByUUID.get(uuid);
    if (!info) {
      clear();
      return;
    }

    ui_state.selection.uuid = uuid;
    ui_state.selection.kind = info.kind;

    if (typeof clearAllHighlights === "function") {
      clearAllHighlights();
    }
    if (typeof setHighlight === "function") {
      setHighlight({ uuid, level: 2 }); // 2 = selected
    }
  }

  function clear() {
    ui_state.selection.uuid = null;
    ui_state.selection.kind = null;

    if (typeof clearAllHighlights === "function") {
      clearAllHighlights();
    }
  }

  return { select, clear };
}
