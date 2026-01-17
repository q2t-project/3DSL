// viewer/ui/inputDefaults.js
//
// UI-facing input defaults + presets.
//
// Policy:
// - SSOT lives in runtime/core/inputDefaults.js
// - UI must not import core directly; use runtime/entry/* exits.

export {
  DEFAULT_INPUT_POINTER,
  DEFAULT_INPUT_KEYBOARD,
  INPUT_PRESETS,
  normalizeInputPresetName,
  resolveInputDefaults,
  listInputPresetNames,
} from '../runtime/entry/inputDefaults.js';
