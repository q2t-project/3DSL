// runtime/core/inputTuning.js
// Shared tuning constants for input behavior.
//
// This file is intentionally dependency-free.
// IMPORTANT: Do not import this module directly from host/ui layers.
// Use runtime/entry/inputTuning.js as the single public exit for non-core layers.

// NOTE:
// Many parts of the viewer assume INPUT_TUNING has the shape:
//   { pointer: {...}, keyboard: {...} }
// where `pointer` contains both base speeds and optional host multipliers.
//
// Keeping this contract stable prevents runtime crashes like:
//   TypeError: Cannot convert undefined or null to object
// when spreading INPUT_TUNING.pointer.

export const INPUT_TUNING = Object.freeze({
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
    pinchZoomSpeed: 0.0007,
    pinchZoomSpeedFast: 0.0014,

    // ------------------------------------------------------------
    // Peek host tuning (minimal host)
    // These multipliers allow the top page demo to feel calmer
    // without forking the rest of the input stack.
    // ------------------------------------------------------------
    peekPointerRotateMul: 0.32,
    peekPointerPanMul: 0.32,
    peekTouchRotateMul: 0.55,
    peekTouchPanMul: 0.55,
  }),

  keyboard: Object.freeze({
    orbitStep: Math.PI / 90,
    orbitStepFast: Math.PI / 45,
    panFactor: 0.02,
    zoomStep: 0.1,
  }),
});
