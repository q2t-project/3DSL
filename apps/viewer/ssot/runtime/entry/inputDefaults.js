// runtime/entry/inputDefaults.js
// Public exit for resolved input defaults + presets.
//
// Policy:
// - Only entry layer knows about core.
// - ui/host layers should import from this module (NOT from runtime/core/*).

import {
  DEFAULT_INPUT_POINTER,
  DEFAULT_INPUT_KEYBOARD,
  INPUT_PRESETS,
  normalizeInputPresetName,
  resolveInputDefaults,
  listInputPresetNames,
} from '../core/inputDefaults.js';

export {
  DEFAULT_INPUT_POINTER,
  DEFAULT_INPUT_KEYBOARD,
  INPUT_PRESETS,
  normalizeInputPresetName,
  resolveInputDefaults,
  listInputPresetNames,
};
