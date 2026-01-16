// viewer/ui/inputDefaults.js
// SSOT: input defaults live here (import from uiState + input adapters)
// NOTE: Base tuning values are centralized in runtime/core/inputTuning.js

import { INPUT_TUNING } from '../runtime/core/inputTuning.js';

export const DEFAULT_INPUT_POINTER = Object.freeze({
  ...INPUT_TUNING.pointer,
});

export const DEFAULT_INPUT_KEYBOARD = Object.freeze({
  ...INPUT_TUNING.keyboard,
});

// ------------------------------------------------------------
// Presets
//   - Enable with: ?preset=<name>
//   - These are *delta overrides* over DEFAULT_INPUT_*.
//   - SSOT: preset defs are also kept here.
// ------------------------------------------------------------

export const INPUT_PRESETS = Object.freeze({
  // baseline (no override)
  default: Object.freeze({
    label: 'Default',
    pointer: Object.freeze({}),
    keyboard: Object.freeze({}),
  }),

  // lower sensitivity / smaller step
  precise: Object.freeze({
    label: 'Precise',
    pointer: Object.freeze({
      rotateSpeed: 0.00075,
      rotateSpeedFast: 0.0015,
      wheelZoomSpeed: 0.00025,
      wheelZoomSpeedFast: 0.0005,
      dampingFactor: 0.08,
    }),
    keyboard: Object.freeze({
      orbitStep: Math.PI / 120,
      orbitStepFast: Math.PI / 60,
      zoomStep: 0.08,
    }),
  }),

  // higher sensitivity / larger step
  fast: Object.freeze({
    label: 'Fast',
    pointer: Object.freeze({
      rotateSpeed: 0.0014,
      rotateSpeedFast: 0.0028,
      wheelZoomSpeed: 0.00055,
      wheelZoomSpeedFast: 0.0011,
      dampingFactor: 0.12,
    }),
    keyboard: Object.freeze({
      orbitStep: Math.PI / 70,
      orbitStepFast: Math.PI / 35,
      zoomStep: 0.12,
    }),
  }),

  // larger damping + slightly calmer
  cinematic: Object.freeze({
    label: 'Cinematic',
    pointer: Object.freeze({
      rotateSpeed: 0.0009,
      rotateSpeedFast: 0.0018,
      wheelZoomSpeed: 0.0003,
      wheelZoomSpeedFast: 0.0006,
      dampingFactor: 0.18,
    }),
    keyboard: Object.freeze({
      zoomStep: 0.09,
    }),
  }),
});

const _resolvedCache = new Map();

export function normalizeInputPresetName(raw) {
  if (typeof raw !== 'string') return 'default';
  const t = raw.trim();
  if (!t) return 'default';
  // keep common separators, drop other symbols
  const key = t
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return INPUT_PRESETS[key] ? key : 'default';
}

export function resolveInputDefaults(presetName) {
  const key = normalizeInputPresetName(presetName);
  const cached = _resolvedCache.get(key);
  if (cached) return cached;

  const preset = INPUT_PRESETS[key] || INPUT_PRESETS.default;
  const pointer = Object.freeze({
    ...DEFAULT_INPUT_POINTER,
    ...(preset.pointer || {}),
  });
  const keyboard = Object.freeze({
    ...DEFAULT_INPUT_KEYBOARD,
    ...(preset.keyboard || {}),
  });

  const resolved = Object.freeze({
    name: key,
    label: preset.label || key,
    pointer,
    keyboard,
  });

  _resolvedCache.set(key, resolved);
  return resolved;
}

export function listInputPresetNames() {
  return Object.keys(INPUT_PRESETS);
}
