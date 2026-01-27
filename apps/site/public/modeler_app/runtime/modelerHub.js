// modeler/runtime/modelerHub.js
// Hub layer (transaction orchestrator).
// - provides start/stop/dispose/resize
// - provides pickObjectAt (raycast)
// - exposes core controllers to UI (via ui/hubFacade.js only)

import { createCoreControllers } from "./core/coreControllers.js";
import { createRenderer } from "./renderer/modelerRenderer.js";

function asEl(elOrId) {
  if (!elOrId) return null;
  if (typeof elOrId === "string") return document.getElementById(elOrId);
  return elOrId;
}

function getCanvasFromRoot(root) {
  if (!root) return null;
  const byRole = root.querySelector('[data-role="modeler-canvas"]');
  if (byRole && byRole instanceof HTMLCanvasElement) return byRole;
  const byId = root.querySelector("#modeler-canvas");
  if (byId && byId instanceof HTMLCanvasElement) return byId;
  return null;
}

function makeEmitter() {
  const map = new Map();
  return {
    on(type, fn) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(fn);
      return () => map.get(type)?.delete(fn);
    },
    emit(type, payload) {
      const set = map.get(type);
      if (!set) return;
      for (const fn of [...set]) {
        try {
          fn(payload);
        } catch (_e) {}
      }
    }
  };
}

function findPathByUuid(doc, uuid, kindHint) {
  if (!doc || !uuid) return null;
  const u = String(uuid);
  const kind = kindHint ? String(kindHint) : null;
  const tryList = (arr, base) => {
    if (!Array.isArray(arr)) return null;
    for (let i = 0; i < arr.length; i += 1) {
      const it = arr[i];
      const id = it?.meta?.uuid || it?.uuid;
      if (id === u) return `${base}/${i}`;
    }
    return null;
  };
  if (kind === 'point') return tryList(doc.points, '/points');
  if (kind === 'line') return tryList(doc.lines, '/lines');
  if (kind === 'aux') return tryList(doc.aux, '/aux');
  return (
    tryList(doc.points, '/points') ||
    tryList(doc.lines, '/lines') ||
    tryList(doc.aux, '/aux') ||
    null
  );
}

/**
 * Port: entry.bootstrapModeler
 * @param {HTMLElement|string} rootElOrId
 * @param {Object} [options]
 * @returns {any} hub
 */
export function createModelerHub(rootElOrId, options = {}) {
  const root = asEl(rootElOrId);
  if (!root) throw new Error("bootstrapModeler: root element not found");
  const canvas = getCanvasFromRoot(root);
  if (!canvas) throw new Error("bootstrapModeler: canvas not found");

  const emitter = makeEmitter();
  const core = createCoreControllers(emitter);
  const renderer = createRenderer(canvas, emitter);

  // wire: when doc changes -> renderer
  let lastVisibility = { hidden: [], solo: null };
  emitter.on("document", (doc) => {
    renderer.setDocument(doc);
    // Re-apply UI-only visibility after rebuild.
    renderer.applyVisibility(lastVisibility);
  });

  // wire: UI-only visibility -> renderer
  emitter.on("visibility", (payload) => {
    lastVisibility = payload || { hidden: [], solo: null };
    renderer.applyVisibility(lastVisibility);
  });

  // wire: UI state (frameIndex) -> renderer
  emitter.on("uistate", (st) => {
    try { renderer.setFrameIndex?.(st?.frameIndex ?? 0); } catch {}
    try { renderer.setWorldAxisMode?.(st?.worldAxisMode ?? "fixed"); } catch {}
  });


  let disposed = false;

  const hub = {
    core,

    on: emitter.on,

    start() {
      if (disposed) return;
      renderer.start();
    },

    stop() {
      if (disposed) return;
      renderer.stop();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.dispose();
    },

    resize(width, height, dpr) {
      if (disposed) return;
      renderer.resize(width, height, dpr);
    },

    pickObjectAt(ndcX, ndcY) {
      if (disposed) return null;
      return renderer.pickObjectAt(ndcX, ndcY);
    },

    worldPointOnPlaneZ(ndcX, ndcY, planeZ) {
      if (disposed) return null;
      return renderer.worldPointOnPlaneZ?.(Number(ndcX), Number(ndcY), Number(planeZ));
    },

    projectToNdc(pos) {
      if (disposed) return [0,0,0];
      return renderer.projectToNdc?.(pos) || [0,0,0];
    },

    previewSetPosition(uuid, pos) {
      if (disposed) return;
      renderer.previewSetPosition?.(uuid, pos);
    },

    previewSetLineEnds(uuid, endA, endB) {
      if (disposed) return;
      renderer.previewSetLineEnds?.(uuid, endA, endB);
    },

    previewSetCaptionText(uuid, captionText, fallbackText) {
      if (disposed) return;
      renderer.previewSetCaptionText?.(uuid, captionText, fallbackText);
    },

    previewSetOverride(kind, uuid, payload) {
      if (disposed) return;
      renderer.previewSetOverride?.(kind, uuid, payload);
    },

    // UI-oriented pick helper: raycast + resolve into an issue-like selection object
    applyPickAt({ ndcX, ndcY } = {}) {
      if (disposed) return null;
      const hit = renderer.pickObjectAt(Number(ndcX), Number(ndcY));
      if (!hit || !hit.uuid) return null;
      const doc = core.getDocument?.();
      const path = findPathByUuid(doc, hit.uuid, hit.kind) || null;
      return { uuid: hit.uuid, kind: hit.kind, path };
    }
  };

  // dev boot log
  if (options && options.devBootLog) {
    console.log("[BOOT] modeler bootstrap ok");
  }

  return hub;
}

/**
 * Convenience (not in manifest yet):
 * bootstrap + fetch document + set core.document
 */
export async function createModelerHubFromUrl(rootElOrId, url, options = {}) {
  const hub = createModelerHub(rootElOrId, options);
  if (url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`fetch failed ${r.status} ${url}`);
    const doc = await r.json();
    hub.core.document.set(doc, { source: "url", label: url });
  }
  return hub;
}
