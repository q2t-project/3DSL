// viewer/runtime/core/viewerSettingsController.js
// Phase2: viewerSettings の正規ルート（描画層には触らない）

const ALLOWED_MICROFX = new Set(["weak", "normal", "strong"]);
const FOV_MIN = 1;
const FOV_MAX = 179;

function normalizeMicroFXProfile(v) {
  if (typeof v !== "string") return null;
  const p = v.trim().toLowerCase();
  return ALLOWED_MICROFX.has(p) ? p : null;
}

// 無効なら null、有効なら [1..179] にクランプした数値
function parseFov(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(FOV_MAX, Math.max(FOV_MIN, n));
}

function safeCall(fn, arg) {
  try {
    fn(arg);
  } catch (e) {
    console.warn("[viewerSettingsController] listener error", e);
  }
}

export function createViewerSettingsController(uiState, defaults = {}) {
  if (!uiState || typeof uiState !== "object") {
    throw new Error("createViewerSettingsController: uiState is required");
  }

  let disposed = false;

  const vs = uiState.viewerSettings;
  if (!vs || typeof vs !== "object") throw new Error("viewerSettings missing (uiState contract)");
  const render = vs.render;
  const fx = vs.fx;
  const micro = fx?.micro;
  const camera = vs.camera;
  if (!render || typeof render !== "object") throw new Error("viewerSettings.render missing");
  if (!fx || typeof fx !== "object") throw new Error("viewerSettings.fx missing");
  if (!micro || typeof micro !== "object") throw new Error("viewerSettings.fx.micro missing");
  if (!camera || typeof camera !== "object") throw new Error("viewerSettings.camera missing");

  // microFX profile（defaults → uiState 既存 → fallback）
  let microFXProfile =
    normalizeMicroFXProfile(defaults?.microFXProfile) ??
    normalizeMicroFXProfile(micro.profile) ??
    "normal";

  // uiState に正規化して書き戻し（“正”の形を固定）
  micro.profile = microFXProfile;

  // fov（A案: viewerSettings.camera.fov が正）
  let fov =
    parseFov(defaults.fov) ??
    parseFov(camera.fov) ??
    parseFov(uiState.cameraState?.fov) ??
    50;

  camera.fov = fov;
  if (uiState.cameraState && typeof uiState.cameraState === "object") {
    uiState.cameraState.fov = fov; // mirror
  }

  const microListeners = new Set();
  const fovListeners = new Set();

  function setMicroFXProfile(profile) {
    if (disposed) return microFXProfile;
    const next = normalizeMicroFXProfile(profile);
    if (!next) {
      console.warn("[viewerSettingsController] invalid microFXProfile:", profile);
      return microFXProfile;
    }
    if (next === microFXProfile) return microFXProfile;
    microFXProfile = next;
    micro.profile = next;
    microListeners.forEach((fn) => safeCall(fn, next));
    return microFXProfile;
  }

  function getMicroFXProfile() {
    return microFXProfile;
  }

  function onMicroFXProfileChanged(listener) {
    if (disposed) return () => {};
    if (typeof listener !== "function") return () => {};
    microListeners.add(listener);
    safeCall(listener, microFXProfile);
    return () => microListeners.delete(listener);
  }

  function setFov(next) {
    if (disposed) return fov;

    const v = parseFov(next);
    if (v == null) return fov; // ← 無効入力は無視（50へ強制リセットしない）
    if (v === fov) return fov;

    fov = v;
    camera.fov = v;
    if (uiState.cameraState && typeof uiState.cameraState === "object") {
      uiState.cameraState.fov = v; // mirror
    }
    fovListeners.forEach((fn) => safeCall(fn, v));
    return fov;
  }

  function getFov() {
    return fov;
  }

  function onFovChanged(listener) {
    if (disposed) return () => {};
    if (typeof listener !== "function") return () => {};
    fovListeners.add(listener);
    safeCall(listener, fov);
    return () => fovListeners.delete(listener);
  }

  return {
    setMicroFXProfile,
    getMicroFXProfile,
    onMicroFXProfileChanged,
    setFov,
    getFov,
    onFovChanged,
    dispose() {
      if (disposed) return;
      disposed = true;
      microListeners.clear();
      fovListeners.clear();
    },
  };
}
