// viewerBridgeV1.js
// Stable same-origin application bridge between /app/viewer and /viewer runtime.
// Does not expose renderer/core internals to the Product host.

export const VIEWER_BRIDGE_V1_COMMAND = "3dsl.viewer.bridge.v1.command";
export const VIEWER_BRIDGE_V1_EVENT = "3dsl.viewer.bridge.v1.event";

function sameOrigin(ev) {
  try { return ev.origin === globalThis.location?.origin; } catch { return false; }
}
function messageTarget(ev) {
  return ev?.source || globalThis.parent || null;
}
function post(target, origin, event, payload = {}, requestId = null) {
  if (!target || typeof target.postMessage !== "function") return;
  target.postMessage({
    type: VIEWER_BRIDGE_V1_EVENT,
    version: "1.0",
    event,
    request_id: requestId || undefined,
    payload,
  }, origin);
}
function errorMessage(e) {
  return e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
}
function readState(host) {
  const hub = host?.hub;
  if (!hub) return null;
  let selection = null;
  let mode = null;
  let frame = null;
  try { selection = hub.core?.selection?.get?.() ?? null; } catch {}
  try { mode = hub.core?.mode?.get?.() ?? null; } catch {}
  try { frame = hub.core?.frame?.getActive?.() ?? null; } catch {}
  return {
    selection: selection && typeof selection === "object"
      ? { uuid: selection.uuid ?? null, kind: selection.kind ?? null }
      : null,
    mode,
    frame,
  };
}
function stateKey(v) {
  try { return JSON.stringify(v); } catch { return ""; }
}

export function createViewerBridgeV1({ getHost, remount, isProbablyUrlish }) {
  let installed = false;
  let monitorId = 0;
  let last = { selection: "", mode: "", frame: "", focus: "" };

  const emitToParent = (event, payload = {}, requestId = null) => {
    try {
      const target = globalThis.parent;
      if (!target || target === globalThis) return;
      post(target, globalThis.location.origin, event, payload, requestId);
    } catch {}
  };

  function monitor() {
    const s = readState(getHost?.());
    if (!s) return;
    const sk = stateKey(s.selection);
    const mk = String(s.mode ?? "");
    const fk = String(s.frame ?? "");
    const focus = stateKey({ mode: s.mode, selection: s.selection });

    if (sk !== last.selection) {
      last.selection = sk;
      emitToParent("selectionChanged", { selection: s.selection });
    }
    if (mk !== last.mode) {
      last.mode = mk;
      emitToParent("modeChanged", { mode: s.mode });
    }
    if (fk !== last.frame) {
      last.frame = fk;
      emitToParent("frameChanged", { frame: s.frame });
    }
    if (focus !== last.focus) {
      last.focus = focus;
      emitToParent("focusChanged", { mode: s.mode, selection: s.selection });
    }
  }

  async function runCommand(command, payload = {}) {
    const host = getHost?.();
    const hub = host?.hub;

    switch (command) {
      case "loadDocument": {
        const doc = payload?.document3dss;
        if (!doc || typeof doc !== "object") throw new Error("loadDocument requires document3dss object");
        await remount({
          document3dss: doc,
          modelLabel: typeof payload?.label === "string" ? payload.label : "(local file)",
        });
        return { loaded: true, source: "document" };
      }
      case "loadUrl": {
        const u = typeof payload?.modelUrl === "string" ? payload.modelUrl.trim() : "";
        if (!u || !isProbablyUrlish?.(u)) throw new Error("loadUrl requires a valid modelUrl");
        await remount({ modelUrl: u });
        return { loaded: true, source: "url", modelUrl: u };
      }
      case "focus": {
        if (!hub) throw new Error("viewer not ready");
        const uuid = typeof payload?.uuid === "string" ? payload.uuid.trim() : "";
        if (!uuid) throw new Error("focus requires uuid");
        const kind = typeof payload?.kind === "string" ? payload.kind : undefined;
        hub.core?.mode?.focus?.(uuid, kind);
        return { focused: true, uuid, kind: kind ?? null };
      }
      case "exitFocus": {
        if (!hub) throw new Error("viewer not ready");
        hub.core?.mode?.exit?.();
        return { focused: false };
      }
      case "setFrame": {
        if (!hub) throw new Error("viewer not ready");
        const frame = Number(payload?.frame);
        if (!Number.isInteger(frame)) throw new Error("setFrame requires integer frame");
        hub.core?.frame?.setActive?.(frame);
        return { frame };
      }
      case "setViewPreset": {
        if (!hub) throw new Error("viewer not ready");
        if (typeof payload?.name === "string" && payload.name.trim()) {
          hub.core?.camera?.setViewByName?.(payload.name.trim());
          return { name: payload.name.trim() };
        }
        const index = Number(payload?.index);
        if (!Number.isInteger(index)) throw new Error("setViewPreset requires name or integer index");
        hub.core?.camera?.setViewPreset?.(index, payload?.opts ?? {});
        return { index };
      }
      case "snapshot": {
        const cap = globalThis.__3dslSnapshot?.captureBlob;
        if (typeof cap !== "function") throw new Error("snapshot capture is not available in this runtime mode");
        const blob = await cap(payload?.minDim);
        return { blob };
      }
      case "setViewScope":
      case "clearViewScope":
        throw new Error(`${command} is not introduced in Viewer Bridge v1 runtime yet`);
      default:
        throw new Error(`unknown Viewer Bridge v1 command: ${String(command)}`);
    }
  }

  async function onMessage(ev) {
    if (!sameOrigin(ev)) return;
    const m = ev?.data;
    if (!m || typeof m !== "object" || m.type !== VIEWER_BRIDGE_V1_COMMAND || m.version !== "1.0") return;
    const target = messageTarget(ev);
    const requestId = typeof m.request_id === "string" ? m.request_id : null;
    try {
      const result = await runCommand(m.command, m.payload ?? {});
      post(target, ev.origin, "commandResult", { ok: true, command: m.command, result }, requestId);
      monitor();
    } catch (e) {
      const message = errorMessage(e);
      post(target, ev.origin, "commandResult", { ok: false, command: m.command, message }, requestId);
      post(target, ev.origin, "error", { command: m.command, message }, requestId);
    }
  }

  function start() {
    if (installed) return;
    installed = true;
    globalThis.addEventListener("message", onMessage);
    monitorId = globalThis.setInterval?.(monitor, 100) || 0;
    emitToParent("ready", { bridge: "1.0" });
    monitor();
  }

  function notifyLoaded(payload = {}) {
    emitToParent("loaded", payload);
    monitor();
  }

  function dispose() {
    if (!installed) return;
    installed = false;
    globalThis.removeEventListener("message", onMessage);
    if (monitorId) globalThis.clearInterval?.(monitorId);
    monitorId = 0;
  }

  return { start, dispose, notifyLoaded, monitor };
}
