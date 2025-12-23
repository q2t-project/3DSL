// core.camera façade
// - uiState.runtime.isCameraAuto はここだけが書く
// - 手動操作が入ったら autoOrbit を止める
// - startAutoOrbit は必ず macro に戻す（micro 中 auto 禁止）
export function createCameraController(uiState, cameraEngine, modeControllerOrOpts) {
  const rt = uiState.runtime || (uiState.runtime = {});
  if (typeof rt.isCameraAuto !== "boolean") rt.isCameraAuto = false;

  const forceMacro =
    (modeControllerOrOpts && typeof modeControllerOrOpts.forceMacro === "function")
      ? modeControllerOrOpts.forceMacro
      : (modeControllerOrOpts && typeof modeControllerOrOpts.set === "function")
        ? () => modeControllerOrOpts.set("macro")
        : null;

  const setAuto = (v) => { rt.isCameraAuto = !!v; };

  const stopAutoIfRunning = () => {
    if (!rt.isCameraAuto) return;
    try { cameraEngine.stopAutoOrbit?.(); } catch (_e) {}
    setAuto(false);
  };

  return {
    // viewerHub loop 用
    update: (dtSeconds) => cameraEngine.update?.(dtSeconds),

    // 手動操作は auto を止める
    rotate: (dTheta, dPhi) => (stopAutoIfRunning(), cameraEngine.rotate(dTheta, dPhi)),
    pan:    (dx, dy)       => (stopAutoIfRunning(), cameraEngine.pan(dx, dy)),
    zoom:   (delta)        => (stopAutoIfRunning(), cameraEngine.zoom(delta)),
    setState: (partial)    => (stopAutoIfRunning(), cameraEngine.setState(partial)),
    reset: ()              => (stopAutoIfRunning(), cameraEngine.reset()),

    snapToAxis:    (axis) => (stopAutoIfRunning(), cameraEngine.snapToAxis(axis)),
    setViewByName: (name) => (stopAutoIfRunning(), cameraEngine.setViewByName(name)),
    setViewPreset: (i, o) => (stopAutoIfRunning(), cameraEngine.setViewPreset(i, o)),

    startAutoOrbit: (opts = {}) => {
      try { forceMacro?.(); } catch (_e) {}
      if (typeof cameraEngine.startAutoOrbit !== "function") return;
      try {
        const st = cameraEngine.startAutoOrbit(opts);
        setAuto(true);
        return st;
      } catch (_e) {
        // 開始失敗なら auto 扱いにしない
        setAuto(false);
        throw _e;
      }
    },
    updateAutoOrbitSettings: (opts = {}) => cameraEngine.updateAutoOrbitSettings?.(opts),
    stopAutoOrbit: () => {
      setAuto(false);
      return cameraEngine.stopAutoOrbit?.();
    },

    // state
    getState: () => cameraEngine.getState(),
    getViewPresetIndex: () => cameraEngine.getViewPresetIndex?.(),
    getViewDefs: () => cameraEngine.getViewDefs?.(),
  };
}