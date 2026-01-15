// ui/hubOps.js
// UI layer: the only place that is allowed to directly operate the hub.
// Host must call these helpers instead of touching hub.*.

export function resizeHub(hub, width, height, dpr) {
  if (!hub || typeof hub.resize !== 'function') return;
  hub.resize(width, height, dpr);
}

export function startHub(hub) {
  if (!hub || typeof hub.start !== 'function') return;
  hub.start();
}

export function stopHub(hub) {
  if (!hub || typeof hub.stop !== 'function') return;
  hub.stop();
}

export function disposeHub(hub) {
  if (!hub || typeof hub.dispose !== 'function') return;
  hub.dispose();
}
