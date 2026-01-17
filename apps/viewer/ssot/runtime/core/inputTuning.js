// runtime/core/inputTuning.js
// Shared tuning constants for input behavior.
//
// This file is intentionally dependency-free.
// IMPORTANT: Do not import this module directly from host/ui layers.
// Use runtime/entry/inputTuning.js as the single public exit for non-core layers.

export const INPUT_TUNING = {
  // pointer tuning (mouse)
  pointerRotateMul: 0.55,
  pointerPanMul: 0.55,
  pointerWheelMul: 0.9,

  // touch tuning (mobile)
  touchRotateMul: 0.75,
  touchPanMul: 0.75,
  touchPinchMul: 1.0,

  // peek host tuning (minimal host)
  peekPointerRotateMul: 0.32,
  peekPointerPanMul: 0.32,
  peekTouchRotateMul: 0.55,
  peekTouchPanMul: 0.55,
};
