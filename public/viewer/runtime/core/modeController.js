// runtime/core/modeController.js
// mode（macro/meso/micro）と micro 侵入条件の優先ルールを管理する

export function createModeController(
  uiState,
  selectionController,
  microController,
  frameController,
  visibilityController,
  document3dss,
  indices
) {
  function isVisible(uuid) {
    if (visibilityController && typeof visibilityController.isVisible === 'function') {
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

  function set(mode, uuid) {
    if (mode === "macro") {
      uiState.mode = "macro";
      return uiState.mode;
    }

    const currentSelection = selectionController?.get?.();
    const targetUuid = uuid ?? currentSelection?.uuid ?? null;
    if (!targetUuid || !canEnter(targetUuid)) {
      uiState.mode = "macro";
      uiState.microState = null;
      return uiState.mode;
    }

    if (mode === "meso" || mode === "micro") {
      selectionController?.select?.(targetUuid);

      if (mode === "micro") {
        const selection = selectionController?.get?.();
        const microState = microController?.compute?.(
          selection,
          uiState.cameraState,
          document3dss,
          indices
        );
        // micro カメラ移動の核心
        if (!microState || !Array.isArray(microState.focusPosition)) {
          console.warn("[mode] micro compute failed, stay macro", { targetUuid });
          uiState.mode = "macro";
          uiState.microState = null;
          return uiState.mode;
        }

        uiState.microState = microState;

        console.log("[mode] enter micro", {
          focusUuid: microState.focusUuid,
          kind: microState.kind,
          focusPosition: microState.focusPosition,
        });

      } else {
        uiState.microState = null;
      }

      uiState.mode = mode;
    }

    return uiState.mode;
  }

  function get() {
    return uiState.mode;
  }

  function exit() {
    return set('macro');
  }

  function focus(uuid) {
    return set('micro', uuid);
  }

  return {
    set,
    get,
    canEnter,
    exit,
    focus
  };
}