// runtime/entry/inputDefaults.js
// Public exit for input defaults (non-core layers).
//
// UI/host layers must not import runtime/core directly.

export {
  DEFAULT_INPUT_POINTER,
  DEFAULT_INPUT_KEYBOARD,
  INPUT_PRESETS,
  normalizeInputPresetName,
  resolveInputDefaults,
  listInputPresetNames,
} from '../core/inputDefaults.js';
