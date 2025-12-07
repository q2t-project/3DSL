// runtime/core/selectionController.js

const DEBUG_SELECTION = false; // 必要なとき true にする
function debugSel(...args) {
  if (!DEBUG_SELECTION) return;
  console.warn(...args);
}

export function createSelectionController(uiState, indices, highlightApi = {}) {
  const uuidToKind =
    indices && indices.uuidToKind instanceof Map ? indices.uuidToKind : null;

  // rendererContext から渡してもらう想定
  const { setHighlight, clearAllHighlights } = highlightApi || {};

  function resolveKind(uuid, explicitKind) {
    if (
      explicitKind === "points" ||
      explicitKind === "lines" ||
      explicitKind === "aux"
    ) {
      return explicitKind;
    }

    if (!uuidToKind) return null;
    const k = uuidToKind.get(uuid);
    if (k === "points" || k === "lines" || k === "aux") {
      return k;
    }
    return null;
  }

  function clear() {
    debugSel("[selection] clear()");
    uiState.selection = null;

    // モード関係なく「とりあえず全部元に戻す」だけは OK
    if (typeof clearAllHighlights === "function") {
      clearAllHighlights();
    }

    return null;
  }

  function select(uuid, kind) {
    // uuid が falsy → クリア扱い
    if (!uuid) {
      debugSel("[selection] clear via select(null)");
      return clear();
    }

    const finalKind = resolveKind(uuid, kind);

    if (finalKind) {
      uiState.selection = { uuid, kind: finalKind };
      debugSel("[selection] select", uiState.selection);
    } else {
      uiState.selection = { uuid };
      debugSel("[selection] select (kind unresolved)", uiState.selection);
    }

    // --- ハイライト反映（A-7：macro 限定） ---
    if (
      typeof setHighlight === "function" ||
      typeof clearAllHighlights === "function"
    ) {
      if (uiState.mode === "macro") {
        if (typeof setHighlight === "function") {
          setHighlight({ uuid, level: 1 });
        }
      } else if (typeof clearAllHighlights === "function") {
        // micro / meso では selection ハイライトを出さない
        clearAllHighlights();
      }
    }

    return uiState.selection;
  }

  function get() {
    return uiState.selection || null;
  }

  const controller = {
    select,
    clear,
    get,
  };

  // 旧実装互換: controller.selection プロパティで現状態を読めるようにしておく
  Object.defineProperty(controller, "selection", {
    get() {
      return uiState.selection || null;
    },
    set(v) {
      // 旧コードから直接 .selection = {uuid,kind} が来た場合でも
      // select/clear を経由させてハイライトも同期させる
      if (!v || !v.uuid) {
        clear();
      } else {
        select(
          v.uuid,
          v.kind === "points" || v.kind === "lines" || v.kind === "aux"
            ? v.kind
            : undefined
        );
      }
    },
    enumerable: false,
    configurable: true,
  });

  return controller;
}
