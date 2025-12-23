// public/viewer/ui/hubFacade.js
//
// UI layer の唯一の “hub.core 入口”。
// ここ以外の UI ファイルで hub.core を触ったら ports-conformance で落とす。

export function createHubFacade(hub) {
  if (!hub) throw new Error("[hubFacade] hub is required");
  const core = hub.core;
  if (!core) throw new Error("[hubFacade] hub.core is required");

  // ---- read-only accessors (return stable objects, not core itself)
  function getCamera() {
    return core.camera ?? core.cameraController ?? null;
  }

  function getCameraEngine() {
    return core.cameraEngine ?? null;
  }

  function getSelection() {
    return core.selection ?? null;
  }

  function getMode() {
    return core.mode ?? core.modeController ?? null;
  }

  function getFrameApi() {
    const f = core.frame ?? null;
    if (f && typeof f.next === "function" && typeof f.prev === "function") return f;

    const fc = core.frameController ?? null;
    if (
      fc &&
      (typeof fc.next === "function" ||
        typeof fc.prev === "function" ||
        typeof fc.setActive === "function" ||
        typeof fc.startPlayback === "function")
    ) {
      return fc;
    }
    return f || fc || null;
  }

  function getStructIndex() {
    return core.structIndex ?? null;
  }

  function getUiState() {
    return core.uiState ?? null;
  }

  function getRuntime() {
    return core.runtime ?? core.uiState?.runtime ?? null;
  }

  function getDocumentCaption() {
    return core.documentCaption ?? null;
  }

  function getSceneMeta() {
    return core.sceneMeta ?? null;
  }

  function getViewDefs() {
    return core.cameraEngine?.getViewDefs?.() ?? null;
  }

  function getItemByUuid(uuid) {
    if (typeof uuid !== "string" || uuid === "") return null;
    const idx = getStructIndex();
    const m = idx && idx.uuidToItem;
    if (!m) return null;
    if (typeof m.get === "function") return m.get(uuid) ?? null;
    return m[uuid] ?? null;
  }

  // hub surface (ui -> hub ports)
  function pickObjectAt(...args) {
    if (typeof hub.pickObjectAt === "function") return hub.pickObjectAt(...args);
    return null;
  }

  // write-like operations must be centralized here (optional, expand as needed)
  const commands = Object.freeze({
    stopAutoOrbit() {
      const cam = getCamera();
      cam?.stopAutoOrbit?.();
    },
    startAutoOrbit(opts) {
      const cam = getCamera();
      cam?.startAutoOrbit?.(opts);
    },
    updateAutoOrbitSettings(opts) {
      const cam = getCamera();
      cam?.updateAutoOrbitSettings?.(opts);
    },
    setViewPreset(i) {
      const cam = getCamera();
      if (cam && typeof cam.setViewPreset === "function") cam.setViewPreset(i);
    },
  });

  return Object.freeze({
    getCamera,
    getCameraEngine,
    getSelection,
    getMode,
    getFrameApi,
    getStructIndex,
    getUiState,
    getRuntime,
    getDocumentCaption,
    getSceneMeta,
    getViewDefs,
    getItemByUuid,
    pickObjectAt,
    commands,
  });
}
