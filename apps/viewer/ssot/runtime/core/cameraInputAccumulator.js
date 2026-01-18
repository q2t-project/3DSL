// runtime/core/cameraInputAccumulator.js
// Pure helpers for accumulating high-frequency camera input deltas and applying damping/inertia.
// NOTE: Intentionally no imports (hub/core safe).

function _reset(v) {
  v.dTheta = 0;
  v.dPhi = 0;
  v.panX = 0;
  v.panY = 0;
  v.zoom = 0;
}

function _sumAbs(v) {
  return Math.abs(v.dTheta) + Math.abs(v.dPhi) + Math.abs(v.panX) + Math.abs(v.panY) + Math.abs(v.zoom);
}

function _isFiniteNonZero(n) {
  return Number.isFinite(n) && n != 0;
}

export function createCameraInputState() {
  return {
    delta: { dTheta: 0, dPhi: 0, panX: 0, panY: 0, zoom: 0 },
    inertia: { dTheta: 0, dPhi: 0, panX: 0, panY: 0, zoom: 0 },
    inertiaActive: false,
  };
}

export function addCameraDelta(state, cmd) {
  if (!state || !cmd || typeof cmd !== 'object') return;
  const a = state.delta;
  const add = (k) => {
    const v = Number(cmd[k]);
    if (!_isFiniteNonZero(v)) return;
    a[k] += v;
  };
  add('dTheta');
  add('dPhi');
  add('panX');
  add('panY');
  add('zoom');
}

export function discardCameraMotion(state) {
  if (!state) return;
  _reset(state.delta);
  _reset(state.inertia);
  state.inertiaActive = false;
}

export function consumeCameraDelta(state, dampingFactor, applyRotate, applyPan, applyZoom) {
  if (!state) return;
  const a = state.delta;
  try {
    const damp = Number(dampingFactor);
    const useInertia = Number.isFinite(damp) && damp > 0 && damp < 1;

    if (useInertia) {
      if (a.dTheta || a.dPhi || a.panX || a.panY || a.zoom) {
        const i = state.inertia;
        i.dTheta += a.dTheta;
        i.dPhi += a.dPhi;
        i.panX += a.panX;
        i.panY += a.panY;
        i.zoom += a.zoom;
        state.inertiaActive = true;
      }
    } else {
      if ((a.dTheta || a.dPhi) && typeof applyRotate === 'function') applyRotate(a.dTheta, a.dPhi);
      if ((a.panX || a.panY) && typeof applyPan === 'function') applyPan(a.panX, a.panY);
      if (a.zoom && typeof applyZoom === 'function') applyZoom(a.zoom);
    }
  } finally {
    _reset(a);
  }
}

export function applyCameraInertia(state, dt, dampingFactor, applyRotate, applyPan, applyZoom) {
  if (!state || !state.inertiaActive) return;

  const a = state.inertia;
  const sum0 = _sumAbs(a);
  if (sum0 < 1e-10) {
    _reset(a);
    state.inertiaActive = false;
    return;
  }

  let damp = Number(dampingFactor);
  if (!(Number.isFinite(damp) && damp >= 0 && damp < 1)) damp = 0.10;

  // dt を考慮して 60fps 相当の damping をスケール
  let f = damp;
  if (typeof dt === 'number' && Number.isFinite(dt) && dt > 0) {
    const frames = Math.max(1, Math.min(120, dt * 60));
    f = 1 - Math.pow(1 - damp, frames);
  }

  const dTheta = a.dTheta;
  const dPhi = a.dPhi;
  const panX = a.panX;
  const panY = a.panY;
  const zoom = a.zoom;

  if ((dTheta || dPhi) && typeof applyRotate === 'function') applyRotate(dTheta, dPhi);
  if ((panX || panY) && typeof applyPan === 'function') applyPan(panX, panY);
  if (zoom && typeof applyZoom === 'function') applyZoom(zoom);

  // 慣性OFFなら即停止
  if (!(f > 0)) {
    _reset(a);
    state.inertiaActive = false;
    return;
  }

  const m = 1 - f;
  a.dTheta *= m;
  a.dPhi *= m;
  a.panX *= m;
  a.panY *= m;
  a.zoom *= m;

  const sum = _sumAbs(a);
  if (sum < 1e-10) {
    _reset(a);
    state.inertiaActive = false;
  }
}
