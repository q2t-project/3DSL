// viewer/runtime/core/viewerSettingsController.js
// Phase2: viewerSettings の正規ルート（描画層には触らない）

const ALLOWED_LINE_WIDTH = new Set(["auto", "fixed", "adaptive"]);
const ALLOWED_MICROFX = new Set(["weak", "normal", "strong"]);
const FOV_MIN = 1;
const FOV_MAX = 179;

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

  // 初期値（defaults → uiState 既存 → fallback）
  let lineWidthMode =
    (typeof defaults.lineWidthMode === "string" &&
      ALLOWED_LINE_WIDTH.has(defaults.lineWidthMode) &&
      defaults.lineWidthMode) ||
    (typeof render.lineWidthMode === "string" &&
      ALLOWED_LINE_WIDTH.has(render.lineWidthMode) &&
      render.lineWidthMode) ||
    "auto";

  let microFXProfile =
    (typeof defaults.microFXProfile === "string" &&
      ALLOWED_MICROFX.has(defaults.microFXProfile) &&
      defaults.microFXProfile) ||
    (typeof micro.profile === "string" &&
      ALLOWED_MICROFX.has(micro.profile) &&
      micro.profile) ||
    "normal";

  // uiState に正規化して書き戻し（“正”の形を固定）
  render.lineWidthMode = lineWidthMode;
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

  const lwListeners = new Set();
  const microListeners = new Set();
  const fovListeners = new Set();

  function setLineWidthMode(mode) {
    if (disposed) return lineWidthMode;
    if (typeof mode !== "string") return lineWidthMode;
    if (mode === lineWidthMode) return lineWidthMode;
    if (!ALLOWED_LINE_WIDTH.has(mode)) {
      console.warn("[viewerSettingsController] invalid lineWidthMode:", mode);
      return lineWidthMode;
    }
    lineWidthMode = mode;
    render.lineWidthMode = mode;
    lwListeners.forEach((fn) => safeCall(fn, mode));
    return lineWidthMode;
  }

  function getLineWidthMode() {
    return lineWidthMode;
  }

  function onLineWidthModeChanged(listener) {
    if (disposed) return () => {};
    if (typeof listener !== "function") return () => {};
    lwListeners.add(listener);
    safeCall(listener, lineWidthMode);
    return () => lwListeners.delete(listener);
  }

  function setMicroFXProfile(profile) {
    if (disposed) return microFXProfile;
    if (typeof profile !== "string") return microFXProfile;
    if (profile === microFXProfile) return microFXProfile;
    if (!ALLOWED_MICROFX.has(profile)) {
      console.warn("[viewerSettingsController] invalid microFXProfile:", profile);
      return microFXProfile;
    }
    microFXProfile = profile;
    micro.profile = profile;
    microListeners.forEach((fn) => safeCall(fn, profile));
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
    setLineWidthMode,
    getLineWidthMode,
    onLineWidthModeChanged,
    setMicroFXProfile,
    getMicroFXProfile,
    onMicroFXProfileChanged,
    setFov,
    getFov,
    onFovChanged,
    dispose() {
      if (disposed) return;
      disposed = true;
      lwListeners.clear();
      microListeners.clear();
      fovListeners.clear();
    },
  };
}
