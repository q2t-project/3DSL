// viewer/runtime/core/inputTuning.js
// SSOT: input tuning values shared by viewer UI + peek boot.
//
// Units:
// - rotateSpeed: rad / px
// - panSpeed: coefficient / px  (caller multiplies by distance * panFactor)
// - wheelZoomSpeed: zoomDelta / deltaY  (cameraEngine.zoom uses factor = 1 + zoomDelta)
// - pinchZoomSpeed: zoomDelta / px      (pinch dist delta in px)
//
// NOTE:
// - Keep this file dependency-free so both runtime + ui can import it.

export const INPUT_TUNING = Object.freeze({
  // Pointer/touch settings
  pointer: Object.freeze({
    // pointer drag threshold (px)
    minDragPx: 2,
    clickMovePx: 2,

    // orbit sensitivity (rad / px)
    // Default aims to avoid "too sensitive" on trackpads/mice.
    rotateSpeed: 0.001,
    rotateSpeedFast: 0.002,

    // damping factor (0..1)
    dampingFactor: 0.10,

    // pan (px -> world)
    panSpeed: 0.002,
    panSpeedFast: 0.004,
    panFactor: 0.02,

    // wheel zoom (deltaY -> zoomDelta)
    wheelZoomSpeed: 0.00035,
    wheelZoomSpeedFast: 0.0007,

    // pinch zoom (pinchDistDeltaPx -> zoomDelta)
    pinchZoomSpeed: 0.0007,
    pinchZoomSpeedFast: 0.0014,

    // peek-only multipliers (keep 1 by default; can be tuned centrally)
    // - touch tends to feel more sensitive due to smaller movement range.
    peekTouchRotateMul:0.8,
    peekTouchPanMul: 1,
  }),

  // Keyboard settings
  keyboard: Object.freeze({
    orbitStep: Math.PI / 90,
    orbitStepFast: Math.PI / 45,
    panFactor: 0.02,
    zoomStep: 0.1,
  }),
});
