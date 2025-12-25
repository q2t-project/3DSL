// public/viewer/ui/hubFacade.js
//
// UI layer の唯一の “hub.core 入口”。
// ここ以外の UI ファイルで hub.core を触ったら ports-conformance で落とす。

export function createHubFacade(hub) {
  if (!hub) throw new Error("[hubFacade] hub is required");
  const core = hub.core;
  if (!core) throw new Error("[hubFacade] hub.core is required");


// ------------------------------------------------------------
// enqueue (UI -> hub transaction boundary)
// ------------------------------------------------------------
function enqueue(cmd) {
  if (typeof hub.enqueueCommand === "function") {
    try {
      return !!hub.enqueueCommand(cmd);
    } catch (_e) {
      return false;
    }
  }
  return false;
}

// ------------------------------------------------------------
// Proxies: expose read APIs, but route "stateful" operations through enqueue
// ------------------------------------------------------------
const _cameraProxyCache = new WeakMap();
const _frameProxyCache = new WeakMap();
const _modeProxyCache = new WeakMap();
const _selectionProxyCache = new WeakMap();
const _filtersProxyCache = new WeakMap();

function _bindOrValue(target, prop) {
  const v = target[prop];
  return typeof v === "function" ? v.bind(target) : v;
}

function wrapCamera(cam) {
  if (!cam || typeof cam !== "object") return null;
  const cached = _cameraProxyCache.get(cam);
  if (cached) return cached;

  const proxy = new Proxy(cam, {
    get(target, prop) {
      switch (prop) {
        case "stopAutoOrbit":
          return () => {
            if (enqueue({ type: "camera.stopAutoOrbit" })) return;
            return target.stopAutoOrbit?.();
          };
        case "startAutoOrbit":
          return (opts) => {
            if (enqueue({ type: "camera.startAutoOrbit", opts })) return;
            return target.startAutoOrbit?.(opts);
          };
        case "updateAutoOrbitSettings":
          return (opts) => {
            if (enqueue({ type: "camera.updateAutoOrbitSettings", opts })) return;
            return target.updateAutoOrbitSettings?.(opts);
          };
        case "setViewPreset":
          return (index, opts) => {
            if (enqueue({ type: "camera.setViewPreset", index, opts })) return;
            return target.setViewPreset?.(index, opts);
          };
        case "setViewByName":
          return (name) => {
            if (enqueue({ type: "camera.setViewByName", name })) return;
            return target.setViewByName?.(name);
          };
        case "focusOn":
          return (targetOrUuid, optsOrKind) => {
            // focusOn(target, opts?)
            // - target: uuid:string | position:[x,y,z]
            // Back-compat:
            // - focusOn(uuid, kind) => focusOn(uuid, { kind })
            if (Array.isArray(targetOrUuid)) {
              const position = targetOrUuid;
              const opts =
                optsOrKind &&
                typeof optsOrKind === "object" &&
                !Array.isArray(optsOrKind)
                  ? optsOrKind
                  : {};

              if (
                enqueue({
                  type: "camera.focusOn.position",
                  position,
                  opts,
                })
              )
                return null;

              return target.focusOn?.(position, opts);
            }

            if (typeof targetOrUuid === "string") {
              const uuid = targetOrUuid;
              const opts =
                optsOrKind &&
                typeof optsOrKind === "object" &&
                !Array.isArray(optsOrKind)
                  ? optsOrKind
                  : typeof optsOrKind === "string"
                    ? { kind: optsOrKind }
                    : {};

              const kind =
                opts && typeof opts === "object" ? opts.kind : undefined;

              if (enqueue({ type: "camera.focusOn", uuid, kind })) return { uuid };
              // core.camera.focusOn は (uuid, {kind}) 形式を想定
              return target.focusOn?.(uuid, opts);
            }

            // Unknown shape: try raw call
            return target.focusOn?.(targetOrUuid, optsOrKind);
          };
        case "setState":
          // setState is internal-only (SSOT boundary).
          return () => {
            throw new Error("[hubFacade.camera] setState is internal; use setViewPreset/setViewByName/focusOn");
          };
        default:
          return _bindOrValue(target, prop);
      }
    },
    set(_target, prop, _value) {
      throw new Error("[hubFacade] mutation is prohibited: " + String(prop));
    },
    defineProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
    deleteProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
  });

  _cameraProxyCache.set(cam, proxy);
  return proxy;
}

function wrapFrameApi(f) {
  if (!f || typeof f !== "object") return null;
  const cached = _frameProxyCache.get(f);
  if (cached) return cached;

  const proxy = new Proxy(f, {
    get(target, prop) {
      switch (prop) {
        case "next":
          return () => {
            if (enqueue({ type: "frame.next" })) return null;
            return target.next?.();
          };
        case "prev":
          return () => {
            if (enqueue({ type: "frame.prev" })) return null;
            return target.prev?.();
          };
        case "setActive":
          return (frame) => {
            if (enqueue({ type: "frame.setActive", frame })) return null;
            return target.setActive?.(frame);
          };
        case "startPlayback":
          return () => {
            if (enqueue({ type: "frame.startPlayback" })) return null;
            return target.startPlayback?.();
          };
        case "stopPlayback":
          return () => {
            if (enqueue({ type: "frame.stopPlayback" })) return null;
            return target.stopPlayback?.();
          };
        default:
          return _bindOrValue(target, prop);
      }
    },
    set(_target, prop, _value) {
      throw new Error("[hubFacade] mutation is prohibited: " + String(prop));
    },
    defineProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
    deleteProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
  });

  _frameProxyCache.set(f, proxy);
  return proxy;
}

function wrapMode(m) {
  if (!m || typeof m !== "object") return null;
  const cached = _modeProxyCache.get(m);
  if (cached) return cached;

  const proxy = new Proxy(m, {
    get(target, prop) {
      if (prop === "set") {
        return (mode, focusUuid, kind) => {
          if (enqueue({ type: "mode.set", mode, focusUuid, kind })) return null;
          return target.set?.(mode, focusUuid, kind);
        };
      }
      return _bindOrValue(target, prop);
    },
    set(_target, prop, _value) {
      throw new Error("[hubFacade] mutation is prohibited: " + String(prop));
    },
    defineProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
    deleteProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
  });

  _modeProxyCache.set(m, proxy);
  return proxy;
}

function wrapSelection(s) {
  if (!s || typeof s !== "object") return null;
  const cached = _selectionProxyCache.get(s);
  if (cached) return cached;

  const proxy = new Proxy(s, {
    get(target, prop) {
      switch (prop) {
        case "select":
          return (uuid, kind) => {
            if (enqueue({ type: "selection.select", uuid, kind })) return uuid ? { uuid } : null;
            return target.select?.(uuid, kind);
          };
        case "clear":
          return () => {
            if (enqueue({ type: "selection.clear" })) return null;
            return target.clear?.();
          };
        default:
          return _bindOrValue(target, prop);
      }
    },
    set(_target, prop, _value) {
      throw new Error("[hubFacade] mutation is prohibited: " + String(prop));
    },
    defineProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
    deleteProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
  });

  _selectionProxyCache.set(s, proxy);
  return proxy;
}

function wrapFilters(f) {
  if (!f || typeof f !== "object") return null;
  const cached = _filtersProxyCache.get(f);
  if (cached) return cached;

  const proxy = new Proxy(f, {
    get(target, prop) {
      switch (prop) {
        case "setTypeEnabled":
          return (kind, enabled) => {
            if (enqueue({ type: "filters.setTypeEnabled", kind, enabled: !!enabled })) return null;
            return target.setTypeEnabled?.(kind, !!enabled);
          };
        default:
          return _bindOrValue(target, prop);
      }
    },
    set(_target, prop, _value) {
      throw new Error("[hubFacade] mutation is prohibited: " + String(prop));
    },
    defineProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
    deleteProperty() {
      throw new Error("[hubFacade] mutation is prohibited");
    },
  });

  _filtersProxyCache.set(f, proxy);
  return proxy;
}

// ---- read-only accessors (return stable objects, not core itself)
function getCamera() {
  const cam = core.camera ?? core.cameraController ?? null;
  return wrapCamera(cam);
}

function getCameraEngine() {
  return core.cameraEngine ?? null;
}

function getSelection() {
  const sel = core.selection ?? null;
  return wrapSelection(sel);
}

function getMode() {
  const m = core.mode ?? core.modeController ?? null;
  return wrapMode(m);
}

function getFrameApi() {
  const f = core.frame ?? null;
  const fc = core.frameController ?? null;

  let raw = null;
  if (f && typeof f.next === "function" && typeof f.prev === "function") raw = f;
  else if (fc) raw = fc;
  else raw = f;

  return wrapFrameApi(raw);
}

function getFilters() {
  const f = core.filters ?? null;
  return wrapFilters(f);
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
    return getCamera()?.stopAutoOrbit?.();
  },
  startAutoOrbit(opts) {
    return getCamera()?.startAutoOrbit?.(opts);
  },
  updateAutoOrbitSettings(opts) {
    return getCamera()?.updateAutoOrbitSettings?.(opts);
  },
  setViewPreset(index, opts) {
    return getCamera()?.setViewPreset?.(index, opts);
  },
  setViewByName(name) {
    return getCamera()?.setViewByName?.(name);
  },
  focusOn(target, optsOrKind) {
    return getCamera()?.focusOn?.(target, optsOrKind);
  },
  frameNext() {
    return getFrameApi()?.next?.();
  },
  framePrev() {
    return getFrameApi()?.prev?.();
  },
  frameSetActive(frame) {
    return getFrameApi()?.setActive?.(frame);
  },
  frameStartPlayback() {
    return getFrameApi()?.startPlayback?.();
  },
  frameStopPlayback() {
    return getFrameApi()?.stopPlayback?.();
  },
  setMode(mode, focusUuid, kind) {
    return getMode()?.set?.(mode, focusUuid, kind);
  },
  select(uuid, kind) {
    return getSelection()?.select?.(uuid, kind);
  },
  clearSelection() {
    return getSelection()?.clear?.();
  },
});

  return Object.freeze({
    getCamera,
    getCameraEngine,
    getFilters,
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
