// viewer/ui/inputDefaults.js
// UI-facing re-export of input defaults.
//
// SSOT lives in runtime/core/inputDefaults.js.
// UI layer must not import core directly; use runtime/entry exit.

export {
  DEFAULT_INPUT_POINTER,
  DEFAULT_INPUT_KEYBOARD,
  INPUT_PRESETS,
  normalizeInputPresetName,
  resolveInputDefaults,
  listInputPresetNames,
} from '../runtime/entry/inputDefaults.js';
