// ============================================================
// modeController.js
//  - macro / meso / micro モード遷移
//  - CameraEngine / MicroVisualController / SelectionController を協調
// ============================================================

/**
 * @param {Object} params
 * @param {Object} params.ui_state
 * @param {import("./CameraEngine.js").CameraEngine} params.cameraEngine
 * @param {Object} params.microVisualController
 * @param {Object} params.selectionController
 */
export function createModeController({
  ui_state,
  cameraEngine,
  microVisualController,
  selectionController,
}) {
  function setMode(mode, uuid) {
    if (!["macro", "meso", "micro"].includes(mode)) {
      mode = "macro";
    }

    ui_state.mode = mode;

    if (mode === "macro") {
      microVisualController.exit();
      cameraEngine.setMode("macro");
      return;
    }

    const focusUUID = uuid || ui_state.selection.uuid;
    if (!focusUUID) {
      ui_state.mode = "macro";
      microVisualController.exit();
      cameraEngine.setMode("macro");
      return;
    }

    microVisualController.enter(focusUUID);
    cameraEngine.setMode(mode, focusUUID);
  }

  function focusOn(uuid) {
    if (!uuid) {
      selectionController.clear();
      microVisualController.exit();
      ui_state.mode = "macro";
      cameraEngine.reset();
      return;
    }

    selectionController.select(uuid);
    ui_state.mode = "micro";
    microVisualController.enter(uuid);
    cameraEngine.focusOn(uuid);
  }

  function onSelectionChanged(uuid) {
    if (!uuid) return;
    if (ui_state.mode === "micro" || ui_state.mode === "meso") {
      setMode(ui_state.mode, uuid);
    }
  }

  return { setMode, focusOn, onSelectionChanged };
}
