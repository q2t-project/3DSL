// previewOutBoot.js
// External-display preview window.
//
// Strategy:
// - Start a local fallback renderer immediately (so this window is never blank).
// - Attempt to mirror the main preview canvas via canvas.captureStream().
//   Autoplay can be blocked in a newly opened popup window; if mirroring cannot
//   start, we keep the fallback visible and retry when the user interacts.

import { createRenderer } from "./runtime/renderer/modelerRenderer.js";

const video = /** @type {HTMLVideoElement|null} */ (document.getElementById("previewout-video"));
const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById("previewout-canvas"));

const titleEl = document.getElementById("previewout-title");
const labelEl = document.getElementById("previewout-label");
const modeEl = document.getElementById("previewout-mode");

const followBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("previewout-follow"));
const frameBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("previewout-frame"));
const pickBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("previewout-pick"));
const axisBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("previewout-axis"));
const playBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("previewout-play"));
const frameIndexInput = /** @type {HTMLInputElement|null} */ (document.getElementById("previewout-frame-index"));
const frameMinEl = document.getElementById("previewout-frame-min");
const frameMaxEl = document.getElementById("previewout-frame-max");

const origin = String(window.location.origin || "");

/** @type {any} */
let doc = null;
/** @type {string[]} */
let selection = [];
/** @type {{ hidden: string[], solo: string|null }} */
let visibility = { hidden: [], solo: null };

/** @type {ReturnType<typeof createRenderer> | null} */
let renderer = null;

const STORAGE_FOLLOW = "3dsl.modeler.previewout.follow";
const STORAGE_PICK = "3dsl.modeler.previewout.pick";
const STORAGE_AXIS = "3dsl.modeler.preview.axisMode";

let followSelection = false;
let pickEnabled = false;
/** @type {"off"|"fixed"|"full_view"} */
let worldAxisMode = "fixed";

let frameIndex = 0;
let frameMin = 0;
let frameMax = 0;
let framePlaying = false;

// Display stability defaults for external window.
const PREVIEWOUT_MAX_DPR = 1;
const PREVIEWOUT_MAX_FPS = 30;

// For follow debouncing (avoid camera jitter when selection changes rapidly).
let followTimer = 0;
let lastFollowUuid = "";

function loadFollowFlag() {
  try {
    const v = window.localStorage.getItem(STORAGE_FOLLOW);
    followSelection = v === "1";
  } catch {
    followSelection = false;
  }
}

function loadPickFlag() {
  try {
    const v = window.localStorage.getItem(STORAGE_PICK);
    pickEnabled = v === "1";
  } catch {
    pickEnabled = false;
  }
}

function syncFrameUi() {
  try {
    if (frameIndexInput) frameIndexInput.value = String(frameIndex);
    if (frameMinEl) frameMinEl.textContent = String(frameMin);
    if (frameMaxEl) frameMaxEl.textContent = String(frameMax);
    if (playBtn) playBtn.textContent = framePlaying ? "Pause" : "Play";
  } catch {}
}

function loadAxisMode() {
  try {
    const v = String(window.localStorage.getItem(STORAGE_AXIS) || "").toLowerCase();
    worldAxisMode = (v === "off" || v === "fixed" || v === "full_view") ? /** @type any */ (v) : "fixed";
  } catch {
    worldAxisMode = "fixed";
  }
}

function syncFollowBtn() {
  if (!followBtn) return;
  followBtn.classList.toggle("is-on", !!followSelection);
  followBtn.textContent = followSelection ? "Follow: ON" : "Follow: OFF";
}

function syncPickBtn() {
  if (!pickBtn) return;
  pickBtn.classList.toggle("is-on", !!pickEnabled);
  pickBtn.textContent = pickEnabled ? "Pick: ON" : "Pick: OFF";
}

function syncAxisBtn() {
  if (!axisBtn) return;
  const label = (worldAxisMode === "full_view") ? "Full" : (worldAxisMode === "fixed" ? "Fixed" : "Off");
  axisBtn.textContent = `Axis: ${label}`;
  axisBtn.classList.toggle("is-on", worldAxisMode !== "off");
}

function setFollowFlag(on) {
  followSelection = !!on;
  // Reset follow guard so the next selection change can trigger a frame.
  lastFollowUuid = "";
  try { window.localStorage.setItem(STORAGE_FOLLOW, followSelection ? "1" : "0"); } catch {}
  syncFollowBtn();
}

function setPickFlag(on) {
  pickEnabled = !!on;
  try { window.localStorage.setItem(STORAGE_PICK, pickEnabled ? "1" : "0"); } catch {}
  syncPickBtn();
}

function setAxisMode(mode) {
  const m = String(mode || "").toLowerCase();
  worldAxisMode = (m === "off" || m === "fixed" || m === "full_view") ? /** @type {any} */ (m) : "fixed";
  try { window.localStorage.setItem(STORAGE_AXIS, worldAxisMode); } catch {}
  try { renderer && renderer.setWorldAxisMode && renderer.setWorldAxisMode(worldAxisMode); } catch {}
  syncAxisBtn();
}

let mirrorActive = false;
let mirrorTrying = false;
let retryTimer = 0;

// Default behavior: independent view (separate camera).
// Mirror mode (streaming the main preview) is opt-in via ?mirror=1.
const allowMirror = (() => {
  try {
    const q = new URLSearchParams(String(window.location.search || ""));
    return q.get("mirror") === "1";
  } catch {
    return false;
  }
})();

function postToOpener(type, payload) {
  try {
    if (!window.opener) return;
    window.opener.postMessage({ type, payload }, origin);
  } catch {}
}

function setTitle(t) {
  if (titleEl) titleEl.textContent = t || "(preview)";
}

function findNodeNameByUuid(docLike, uuid) {
  if (!docLike || !uuid) return "";
  const lists = [docLike.points, docLike.lines, docLike.aux];
  for (const arr of lists) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      if (!it) continue;
      if (it.uuid === uuid || it?.document_meta?.document_uuid === uuid) {
        const sigName = (() => {
          const v = it?.signification?.name ?? it?.meta?.name ?? it?.name;
          if (typeof v === "string") return v.trim();
          if (v && typeof v === "object") {
            if (typeof v.ja === "string" && v.ja.trim()) return v.ja.trim();
            if (typeof v.en === "string" && v.en.trim()) return v.en.trim();
            if (typeof v.default === "string" && v.default.trim()) return v.default.trim();
          }
          return "";
        })();

        const caption = (() => {
          const v = it?.signification?.caption;
          if (typeof v === "string") return v.trim();
          if (v && typeof v === "object") {
            if (typeof v.ja === "string" && v.ja.trim()) return v.ja.trim();
            if (typeof v.en === "string" && v.en.trim()) return v.en.trim();
            if (typeof v.default === "string" && v.default.trim()) return v.default.trim();
          }
          return "";
        })();

        const text = String(it?.marker?.text?.content || it?.appearance?.marker?.text?.content || "").trim();
        const label = sigName || caption || text;
        return label || uuid;
      }
    }
  }
  return uuid;
}

function updateOverlay() {
  const uu = selection && selection[0] ? String(selection[0]) : "";
  const label = uu ? findNodeNameByUuid(doc, uu) : "";
  if (labelEl) labelEl.textContent = label || "(no selection)";

  const docTitle = String(doc?.document_meta?.document_title || "").trim();
  setTitle(docTitle ? docTitle : "(preview out)");

  // Keep selection highlight in sync in fallback renderer.
  try { renderer?.setSelection?.(selection || []); } catch {}
}

function frameSelectionOnce() {
  try {
    const uu = selection && selection[0] ? String(selection[0]) : "";
    if (!uu) return;
    renderer?.focusOnUuid?.(uu, { smooth: true, durationMs: 300 });
  } catch {}
}

function scheduleFollowFrame() {
  if (followTimer) window.clearTimeout(followTimer);
  followTimer = window.setTimeout(() => {
    followTimer = 0;
    if (!followSelection || mirrorActive) return;
    const uu = selection && selection[0] ? String(selection[0]) : "";
    if (!uu) return;
    if (uu === lastFollowUuid) return;
    lastFollowUuid = uu;
    frameSelectionOnce();
  }, 150);
}

function ensureFallbackRenderer() {
  if (renderer || !canvas) return;
  renderer = createRenderer(canvas);

  // Preview Out is a display surface; cap DPR/FPS to avoid unnecessary load.
  // (Main window remains uncapped.)
  try {
    renderer.setPerformanceOptions?.({ maxFps: PREVIEWOUT_MAX_FPS, maxDpr: PREVIEWOUT_MAX_DPR });
  } catch {}

  try {
    renderer.setWorldAxisMode?.(worldAxisMode);
  } catch {}

  renderer.start?.();

  const doResize = () => {
    try {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      // Force a stable DPR for external display.
      renderer.resize?.(w, h, PREVIEWOUT_MAX_DPR);
    } catch {}
  };

  const ro = new ResizeObserver(() => doResize());
  try { ro.observe(canvas); } catch {}
  window.addEventListener("resize", () => doResize());
  doResize();
}

function applyFallbackState() {
  if (!renderer) return;
  try {
    renderer.setDocument?.(doc || null);
    renderer.applyVisibility?.(visibility || { hidden: [], solo: null });
    renderer.setSelection?.(selection || []);
  } catch {}
}

function showFallback() {
  mirrorActive = false;
  if (video) video.hidden = true;
  if (canvas) canvas.hidden = false;
  try { renderer?.start?.(); } catch {}
  if (modeEl) modeEl.textContent = "Independent view";
}

function showMirror() {
  mirrorActive = true;
  if (video) video.hidden = false;
  if (canvas) canvas.hidden = true;
  // Stop fallback rendering to save GPU; the mirrored stream is authoritative.
  try { renderer?.stop?.(); } catch {}
  if (modeEl) modeEl.textContent = "Mirror view";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForVideoDimensions(timeoutMs) {
  if (!video) return false;
  const startedAt = performance.now();
  // Wait until the video reports a non-zero size.
  while (performance.now() - startedAt < timeoutMs) {
    if ((video.videoWidth || 0) > 0 && (video.videoHeight || 0) > 0) return true;
    await sleep(50);
  }
  return (video.videoWidth || 0) > 0;
}

async function tryAttachStreamOnce() {
  try {
    const op = window.opener;
    if (!op) return false;
    const p = op.__modelerPreviewOut;
    const stream = p && typeof p.getStream === "function" ? p.getStream() : null;
    if (!stream || !video) return false;

    const wasHidden = !!video.hidden;
    // Some browsers may refuse to start playback when the element is hidden.
    video.hidden = false;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    // If autoplay is blocked, play() rejects. Treat that as failure.
    const played = await video.play().then(() => true).catch(() => false);
    if (!played) {
      if (wasHidden) video.hidden = true;
      return false;
    }

    const hasDims = await waitForVideoDimensions(1200);
    if (!hasDims) {
      if (wasHidden) video.hidden = true;
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = window.setTimeout(() => {
    retryTimer = 0;
    void tryUpgradeToMirror();
  }, 250);
}

async function tryUpgradeToMirror() {
  if (mirrorActive || mirrorTrying) return;
  mirrorTrying = true;
  const ok = await tryAttachStreamOnce();
  mirrorTrying = false;

  if (ok) {
    showMirror();
  } else {
    // Keep fallback visible so the window is usable even when autoplay is blocked.
    showFallback();
  }
}

function handleMessage(ev) {
  if (origin && ev.origin && ev.origin !== origin) return;
  const data = ev.data || {};
  const type = String(data.type || "");
  const payload = data.payload || {};

  if (type === "modeler-previewout:init") {
    doc = payload.doc || null;
    selection = Array.isArray(payload.selection) ? payload.selection.map(String) : [];
    visibility = payload.visibility || visibility;
    updateOverlay();
    applyFallbackState();
    return;
  }
  if (type === "modeler-previewout:doc") {
    doc = payload.doc || null;
    updateOverlay();
    applyFallbackState();
    return;
  }
  if (type === "modeler-previewout:frame-state") {
    const st = payload || {};
    try {
      frameIndex = Math.trunc(Number(st.frameIndex || 0));
      frameMin = Math.trunc(Number(st.frameMin || 0));
      frameMax = Math.trunc(Number(st.frameMax || 0));
      framePlaying = !!st.framePlaying;
    } catch {}
    syncFrameUi();
    return;
  }

  if (type === "modeler-previewout:selection") {
    selection = Array.isArray(payload.selection) ? payload.selection.map(String) : [];
    updateOverlay();
    try { renderer?.setSelection?.(selection || []); } catch {}
    if (followSelection && !mirrorActive) scheduleFollowFrame();
    return;
  }

  if (type === "modeler-previewout:focus") {
    // Focus is an explicit "jump + frame" request (e.g. QuickCheck click).
    const issue = payload?.issue || null;
    const uuid = String(issue?.uuid || "");
    if (uuid) {
      selection = [uuid];
      try { renderer?.setSelection?.(selection); } catch {}
      updateOverlay();
    }
    // Frame once regardless of followSelection, unless the user is currently mirroring main view.
    if (!mirrorActive) {
      try { frameSelectionOnce(); } catch {}
    }
    return;
  }

  if (type === "modeler-previewout:visibility") {
    visibility = payload.visibility || visibility;
    applyFallbackState();
    return;
  }
  if (type === "modeler-previewout:title") {
    setTitle(String(payload.title || ""));
    return;
  }
}

function sendResize() {
  postToOpener("modeler-previewout:resize", { width: window.innerWidth, height: window.innerHeight });
}

function main() {
  loadFollowFlag();
  syncFollowBtn();
  loadPickFlag();
  syncPickBtn();
  loadAxisMode();
  syncFrameUi();
  syncAxisBtn();

  // Always bring up fallback immediately.
  ensureFallbackRenderer();
  showFallback();
  applyFallbackState();
  updateOverlay();

  if (followBtn) {
    followBtn.addEventListener(
      "click",
      () => {
        const next = !followSelection;
        setFollowFlag(next);
        if (next) frameSelectionOnce();
      },
      { passive: true }
    );
  }
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      try { postToOpener("modeler-previewout:play-toggle", {}); } catch {}
    });
  }

  if (frameIndexInput) {
    frameIndexInput.addEventListener("change", () => {
      const raw = frameIndexInput.value;
      let v = 0;
      if (raw && Number.isFinite(Number(raw))) v = Math.trunc(Number(raw));
      try { postToOpener("modeler-previewout:frame-set", { frameIndex: v }); } catch {}
    });
    frameIndexInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        try { frameIndexInput.blur(); } catch {}
      }
    });
  }

  if (frameBtn) {
    frameBtn.addEventListener(
      "click",
      () => {
        frameSelectionOnce();
      },
      { passive: true }
    );
  }
  if (pickBtn) {
    pickBtn.addEventListener(
      "click",
      () => {
        setPickFlag(!pickEnabled);
      },
      { passive: true }
    );
  }

  if (axisBtn) {
    axisBtn.addEventListener(
      "click",
      () => {
        const next = (worldAxisMode === "off")
          ? "fixed"
          : (worldAxisMode === "fixed")
            ? "full_view"
            : "off";
        setAxisMode(next);
      },
      { passive: true }
    );
  }

  // Allow picking in this window (independent view) to update selection in the main window.
  // Only works in fallback mode (canvas), not in mirror/video mode.
  if (canvas) {
    canvas.addEventListener(
      "pointerdown",
      (ev) => {
        if (mirrorActive) return;
        if (!pickEnabled) return;
        try {
          const rect = canvas.getBoundingClientRect();
          const x = (ev.clientX - rect.left) / Math.max(1, rect.width);
          const y = (ev.clientY - rect.top) / Math.max(1, rect.height);
          const ndcX = x * 2 - 1;
          const ndcY = -(y * 2 - 1);
          const hit = renderer?.pickObjectAt?.(ndcX, ndcY);
          if (hit && hit.uuid) {
            const u = String(hit.uuid);
            // Update local selection immediately for responsiveness.
            selection = [u];
            try { renderer?.setSelection?.(selection); } catch {}
            updateOverlay();
            // Then notify the main window (selection SSOT).
            postToOpener("modeler-previewout:pick", { uuid: u, kind: String(hit.kind || "unknown") });
          }
        } catch {}
      },
      { passive: true }
    );
  }

  // Avoid accidental shortcuts being handled by this popup.
  window.addEventListener(
    "keydown",
    (ev) => {
      // Allow browser-level shortcuts (Ctrl/Cmd+R etc.).
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      ev.preventDefault();
      ev.stopPropagation();
    },
    { capture: true }
  );

  // Pause rendering when hidden (external display window minimized / not visible).
  document.addEventListener("visibilitychange", () => {
    try {
      if (document.visibilityState === "hidden") renderer?.stop?.();
      else if (!mirrorActive) renderer?.start?.();
    } catch {}
  });

  window.addEventListener("message", handleMessage);
  window.addEventListener("resize", () => sendResize());

  // Handshake
  postToOpener("modeler-previewout:ready", {});
  sendResize();

  // Try to upgrade to mirror mode only when explicitly enabled.
  if (allowMirror) {
    void tryUpgradeToMirror();

    // If autoplay was blocked, retry mirroring on user interaction.
    document.addEventListener(
      "pointerdown",
      () => {
        if (!mirrorActive) scheduleRetry();
      },
      { passive: true }
    );
    document.addEventListener("keydown", () => {
      if (!mirrorActive) scheduleRetry();
    });
  }

  window.addEventListener("beforeunload", () => {
    postToOpener("modeler-previewout:closed", {});
  });
}

main();
