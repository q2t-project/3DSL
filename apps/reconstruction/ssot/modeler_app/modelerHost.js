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

  // Observations only: load checks still time navigation through settled paint.
  const startup = { mountStartMs: performance.now(), phases: [] };
  root.__ownedStartup = startup;
  const onStartupPhase = (phase, ms) => startup.phases.push({ phase, ms });

  // teardown previous ui + hub if any (idempotent)
  teardownPrev(root, "__ownedUi");
  teardownPrev(root, "__ownedHub");

  // entry.bootstrapModeler (manifest port)
  const hub = modelUrl
    ? await bootstrapModelerFromUrl(root, modelUrl, { devBootLog, onStartupPhase })
    : bootstrapModeler(root, { devBootLog });

  setOwnedHandle(root, "__ownedHub", hub);
  let phaseStart = performance.now();

  // initial resize and start (P0)
  const canvas = root.querySelector('[data-role="modeler-canvas"]');
  if (canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = clampDpr(window.devicePixelRatio || 1);
    resizeHub(hub, Math.floor(r.width), Math.floor(r.height), dpr);
  }
  startHub(hub);
  onStartupPhase("resize-start", performance.now() - phaseStart);

  // attach shell UI (tabs, outliner rendering, quickcheck panel)
  phaseStart = performance.now();
  const uiHandle = attachUiShell({ root, hub, modelUrl });
  setOwnedHandle(root, "__ownedUi", uiHandle);
  onStartupPhase("attach-ui", performance.now() - phaseStart);
  startup.mountEndMs = performance.now();

  return hub;
}
