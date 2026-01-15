// viewer/ui/inputDefaultsFallback.js
// UI-local fallback for input defaults.
//
// NOTE:
// - The SSOT for input defaults lives in ui/inputDefaults.js.
// - UI layer must not import core directly (dependency rules).
// - These values are a compatibility fallback for cases where uiState is not yet ready.

export const DEFAULT_INPUT_POINTER = Object.freeze({
  // pointer drag threshold (px)
  minDragPx: 2,
  clickMovePx: 2,

  // orbit sensitivity (unit: per px)
  // NOTE: tuned to avoid "too sensitive" default.
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
});

export const DEFAULT_INPUT_KEYBOARD = Object.freeze({
  orbitStep: Math.PI / 90,
  orbitStepFast: Math.PI / 45,
  panFactor: 0.02,
  zoomStep: 0.1,
});

// ------------------------------------------------------------
// Presets (fallback)
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
