// runtime/entry/inputTuning.js
// Public exit for input tuning defaults.
//
// Policy:
// - Only entry layer knows about core.
// - host/ui should import tuning from this module (NOT from runtime/core/*).

import { INPUT_TUNING as CORE_INPUT_TUNING } from '../core/inputTuning.js';

/**
 * Returns the default input tuning object.
 * Consumers should treat it as read-only.
 */
export function getInputTuning() {
  return CORE_INPUT_TUNING;
}

// Convenience named export.
export const INPUT_TUNING = CORE_INPUT_TUNING;
