// runtime/core/selectionController.js

const DEBUG_SELECTION = false; // 必要なとき true にする
function debugSel(...args) {
  if (!DEBUG_SELECTION) return;
  console.warn(...args);
}

export function createSelectionController(uiState, indices) {
  const uuidToKind =
    indices && indices.uuidToKind instanceof Map ? indices.uuidToKind : null;

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

  function select(uuid, kind) {
    // uuid が falsy → クリア扱い
    if (!uuid) {
      debugSel("[selection] clear via select(null)");
      uiState.selection = null;
      return null;
    }

    const finalKind = resolveKind(uuid, kind);

    if (finalKind) {
      uiState.selection = { uuid, kind: finalKind };
      debugSel("[selection] select", uiState.selection);
      return uiState.selection;
    }

    uiState.selection = { uuid };
    debugSel("[selection] select (kind unresolved)", uiState.selection);
    return uiState.selection;
  }

  function clear() {
    debugSel("[selection] clear()");
    uiState.selection = null;
    return null;
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
      if (!v) {
        uiState.selection = null;
      } else if (v.uuid) {
        uiState.selection = {
          uuid: v.uuid,
          kind:
            v.kind === "points" || v.kind === "lines" || v.kind === "aux"
              ? v.kind
              : null,
        };
      }
    },
    enumerable: false,
    configurable: true,
  });

  return controller;
}
