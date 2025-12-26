// viewer/runtime/core/cameraTransition.js

// micro / macro のカメラをスムーズに補間するトランジション。
// - CameraEngine にだけ依存し、viewerHub からは update(time) だけ呼ばれる前提。
// - target / distance 以外は極力いじらない。

const DEBUG_TRANSITION = false;
function debugTrans(...args) {
  if (!DEBUG_TRANSITION) return;
  console.log("[cameraTransition]", ...args);
}

const EPS = 1e-5;

function normalizeTarget(raw) {
  if (!raw) {
    return { x: 0, y: 0, z: 0 };
  }

  // [x,y,z] 形式
  if (Array.isArray(raw)) {
    const [x = 0, y = 0, z = 0] = raw;
    return {
      x: Number(x) || 0,
      y: Number(y) || 0,
      z: Number(z) || 0,
    };
  }

  // {x,y,z} 形式
  if (typeof raw === "object") {
    const x = Number(raw.x);
    const y = Number(raw.y);
    const z = Number(raw.z);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      z: Number.isFinite(z) ? z : 0,
    };
  }

  return { x: 0, y: 0, z: 0 };
}

export function createCameraTransition(cameraEngine, options = {}) {
  const durationMs =
    typeof options.durationMs === "number" ? options.durationMs : 220;

  let active = false;
  let startTime = 0;

  /** @type {{ target:{x:number,y:number,z:number}, distance:number } | null} */
  let fromState = null;
  /** @type {{ target:{x:number,y:number,z:number}, distance:number } | null} */
  let toState = null;

  function getCamState() {
    if (!cameraEngine || typeof cameraEngine.getState !== "function") return null;
    try {
      return cameraEngine.getState();
    } catch (e) {
      console.warn("[cameraTransition] getState() failed", e);
      return null;
    }
  }

  function apply(target, distance) {
    if (!cameraEngine) return;

    const current = getCamState() || {};

    const next = {
      ...current,
      target,
      distance:
        typeof distance === "number" && Number.isFinite(distance)
          ? distance
          : current.distance,
    };

    if (typeof cameraEngine.setState === "function") {
      cameraEngine.setState(next);
    } else {
      // 念のため個別 API があればそっちも試す
      if (typeof cameraEngine.setTarget === "function") {
        cameraEngine.setTarget(target);
      }
      if (typeof cameraEngine.setDistance === "function") {
        cameraEngine.setDistance(next.distance);
      }
    }
  }

  // preset: { target: [x,y,z] or {x,y,z}, distance: number }
  function start(preset) {
    const current = getCamState();
    if (!current || !preset) {
      active = false;
      return;
    }

    const fromTarget = normalizeTarget(current.target || current.position);
    const toTarget = normalizeTarget(preset.target || current.target);

    const fromDistance =
      typeof current.distance === "number" && Number.isFinite(current.distance)
        ? current.distance
        : 4;

    const toDistance =
      typeof preset.distance === "number" && Number.isFinite(preset.distance)
        ? preset.distance
        : fromDistance;

    fromState = { target: fromTarget, distance: fromDistance };
    toState = { target: toTarget, distance: toDistance };
    startTime = performance.now();
    active = true;

    debugTrans("start", { fromState, toState, durationMs });
  }

  // viewerHub からは requestAnimationFrame の timestamp が渡ってくる想定
  function update(nowMs) {
    if (!active || !fromState || !toState) return;

    if (typeof nowMs !== "number") {
      nowMs = performance.now();
    }

    const rawT =
      durationMs > 0 ? (nowMs - startTime) / durationMs : 1;

    const t = rawT <= 0 ? 0 : rawT >= 1 ? 1 : rawT;

    const ft = fromState.target;
    const tt = toState.target;

    // どこか欠けてたら安全側で終了
    if (!ft || !tt) {
      debugTrans("abort: invalid state", { fromState, toState });
      active = false;
      return;
    }

    const target = {
      x: ft.x + (tt.x - ft.x) * t,
      y: ft.y + (tt.y - ft.y) * t,
      z: ft.z + (tt.z - ft.z) * t,
    };

    const distance =
      fromState.distance +
      (toState.distance - fromState.distance) * t;

    apply(target, distance);

    if (t >= 1 - EPS) {
      active = false;
      debugTrans("done");
    }
  }

  function isActive() {
    return active;
  }

  return {
    start,
    update,
    isActive,
  };
}
