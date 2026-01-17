// runtime/core/inputTuning.js
// Shared tuning constants for input behavior.
//
// Policy:
// - This file is intentionally dependency-free.
// - Non-core layers must NOT import this module directly.
//   Use runtime/entry/inputTuning.js as the single public exit.

export const INPUT_TUNING = Object.freeze({
  // ------------------------------------------------------------
  // Core input defaults (pointer / keyboard)
  // These are the SSOT values consumed by both:
  // - runtime/core/uiState.js
  // - ui/inputDefaults.js (via runtime/entry/*)
  // ------------------------------------------------------------

  pointer: Object.freeze({
    // pointer drag threshold (px)
    minDragPx: 2,
    clickMovePx: 2,

    // orbit sensitivity (unit: per px)
    rotateSpeed: 0.001,
    rotateSpeedFast: 0.002,

    // orbit damping factor (0..1). OrbitControls enableDamping compatible.
    dampingFactor: 0.10,

    // pan sensitivity (unit: per px) + distance factor
    panSpeed: 0.002,
    panSpeedFast: 0.004,
    panFactor: 0.02,

    // wheel zoom sensitivity (unit: per deltaY)
    wheelZoomSpeed: 0.00035,
    wheelZoomSpeedFast: 0.0007,

    // touch gestures (unit: per px)
    // pinchZoomSpeed: pinch distance delta (px) -> zoomDelta
    pinchZoomSpeed: 0.0007,
    pinchZoomSpeedFast: 0.0014,
  }),

  keyboard: Object.freeze({
    orbitStep: Math.PI / 90,
    orbitStepFast: Math.PI / 45,
    panFactor: 0.02,
    zoomStep: 0.1,
  }),

  // ------------------------------------------------------------
  // Host-specific multipliers (peek host)
  // NOTE: keep as flat keys for backward compatibility.
  // ------------------------------------------------------------

  // peek host tuning (minimal host)
  peekPointerRotateMul: 0.32,
  peekPointerPanMul: 0.32,
  peekTouchRotateMul: 0.55,
  peekTouchPanMul: 0.55,
});
