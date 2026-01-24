// modelerHost.js
// Host-side mounting for /modeler/index.html

import { bootstrapModeler, bootstrapModelerFromUrl } from "./runtime/bootstrapModeler.js";
import { attachUiShell } from "./ui/attachUiShell.js";
import { resizeHub, startHub } from "./ui/hubOps.js";
import { teardownPrev, setOwnedHandle } from "./ui/ownedHandle.js";

function asEl(elOrId) {
  if (!elOrId) return null;
  if (typeof elOrId === "string") return document.getElementById(elOrId);
  return elOrId;
}

function clampDpr(dpr) {
  const v = Number(dpr);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.max(1, Math.min(2, v));
}

export async function mountModelerHost(opts = {}) {
  const {
    rootId = "modeler-root",
    modelUrl = null,
    devBootLog = false
  } = opts;

  const root = asEl(rootId);
  if (!root) throw new Error("mountModelerHost: root not found");

  // teardown previous hub if any (idempotent)
  teardownPrev(root, "__ownedHub");

  // entry.bootstrapModeler (manifest port)
  const hub = modelUrl
    ? await bootstrapModelerFromUrl(root, modelUrl, { devBootLog })
    : bootstrapModeler(root, { devBootLog });

  setOwnedHandle(root, "__ownedHub", hub);

  // initial resize and start (P0)
  const canvas = root.querySelector('[data-role="modeler-canvas"]');
  if (canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = clampDpr(window.devicePixelRatio || 1);
    resizeHub(hub, Math.floor(r.width), Math.floor(r.height), dpr);
  }
  startHub(hub);

  // attach shell UI (tabs, outliner rendering, quickcheck panel)
  attachUiShell({ root, hub, modelUrl });

  return hub;
}
