// runtime/core/modeController.js
// mode（macro/meso/micro）と micro 侵入条件の優先ルールを管理する

const DEBUG_MODE = false;
function debugMode(...args) {
  if (!DEBUG_MODE) return;
  console.log(...args);
}

export function createModeController(
  uiState,
  selectionController,
  microController,
  frameController,
  visibilityController,
  indices
) {
  function isVisible(uuid) {
    if (
      visibilityController &&
      typeof visibilityController.isVisible === "function"
    ) {
      return visibilityController.isVisible(uuid);
    }
    if (uiState && uiState.visibleSet instanceof Set) {
      return uiState.visibleSet.has(uuid);
    }
    return true;
  }

  function canEnter(uuid) {
    if (!uuid) return false;
    if (uiState?.runtime?.isFramePlaying) return false;
    if (uiState?.runtime?.isCameraAuto) return false;
    return isVisible(uuid);
  }

  // --- macro への共通遷移処理（A-7: selection ハイライト復元もここ） ---
  function enterMacro() {
    debugMode("[mode] enter macro");

    uiState.mode = "macro";

    // microState は必ずクリア
    if (microController && typeof microController.clear === "function") {
      microController.clear();
    } else {
      uiState.microState = null;
    }

    // いまの selection を使って macro 用ハイライトを再適用
    if (
      selectionController &&
      typeof selectionController.get === "function" &&
      typeof selectionController.select === "function"
    ) {
      const current = selectionController.get();
      if (current && current.uuid) {
        selectionController.select(current.uuid, current.kind);
      } else if (typeof selectionController.clear === "function") {
        selectionController.clear();
      }
    }

    return uiState.mode;
  }

  function set(mode, uuid) {
    // --- 明示的に macro を指定された場合 ---
    if (mode === "macro") {
      return enterMacro();
    }

    // micro / meso への遷移
    const currentSelection = selectionController?.get?.();
    const targetUuid = uuid ?? currentSelection?.uuid ?? null;

    if (!targetUuid || !canEnter(targetUuid)) {
      // 侵入条件満たせない → 強制 macro
      debugMode("[mode] cannot enter, fallback macro", {
        requested: mode,
        targetUuid,
      });
      return enterMacro();
    }

    if (mode === "meso" || mode === "micro") {
      // 先に mode を切り替えてから select することで、
      // selectionController 側の「macro 以外なら clearAllHighlights()」を効かせる（A-7）
      uiState.mode = mode;

      if (selectionController && typeof selectionController.select === "function") {
        selectionController.select(targetUuid);
      }

      if (mode === "micro") {
        const selection = selectionController?.get?.();
        const microState = microController?.compute?.(
          selection,
          uiState.cameraState,
          indices
        );

        // micro カメラ移動の核心：focusPosition が取れなければ macro に戻す
        if (!microState || !Array.isArray(microState.focusPosition)) {
          console.warn("[mode] micro compute failed, stay macro", {
            targetUuid,
          });
          return enterMacro();
        }

        debugMode("[mode] enter micro", {
          focusUuid: microState.focusUuid,
          kind: microState.kind,
          focusPosition: microState.focusPosition,
        });
      } else {
        // meso では microState は常にクリア
        if (microController && typeof microController.clear === "function") {
          microController.clear();
        } else {
          uiState.microState = null;
        }
        debugMode("[mode] enter meso", { targetUuid });
      }
    }

    return uiState.mode;
  }

  function get() {
    return uiState.mode;
  }

  function exit() {
    // どこからでも macro に戻る
    return enterMacro();
  }

  function focus(uuid) {
    // micro フォーカスショートカット
    return set("micro", uuid);
  }

  return {
    set,
    get,
    canEnter,
    exit,
    focus,
  };
}
