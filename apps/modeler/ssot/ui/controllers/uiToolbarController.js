// ui/controllers/uiToolbarController.js
// UI-only controller for toolbar / tabs / quickcheck panel.

/**
 * @typedef {(
 *  | "new"
 *  | "open"
 *  | "save"
 *  | "saveas"
 *  | "export"
 *  | "undo"
 *  | "redo"
 *  | "play"
 *  | "tool-move"
 *  | "world-axis"
 *  | "orbit-mode"
 *  | "quickcheck"
 *  | "preview-out"
 *  | "mirror-mode"
 *  | "focus-mode"
 *  | "qc-fix-lines"
 *  | "qc-close"
 *  | "prop-save"      // Apply buffered property edits
 *  | "prop-discard"   // Discard buffered property edits
 *  | "prop-close"     // Close property panel
 )} ToolbarAction
 */

/** @type {ToolbarAction[]} */
const TOOLBAR_ACTIONS = [
  "new",
  "open",
  "save",
  "saveas",
  "export",
  "undo",
  "redo",
  "play",
  "tool-move",
  "world-axis",
  "orbit-mode",
  "quickcheck",
  "preview-out",
  "mirror-mode",
  "focus-mode",
  "qc-fix-lines",
  "qc-close",
  "prop-save",
  "prop-discard",
  "prop-close",
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderQuickCheckImpl({ issues, qcSummary, qcList, onSelectIssue }) {
  if (qcSummary) qcSummary.textContent = `${issues.length} issues`;
  if (!qcList) return;

  qcList.textContent = "";
  for (const it of issues) {
    const item = document.createElement("div");
    item.className = "qc-item";
    const sev = it?.severity || "info";
    const sevClass = sev === "error" ? "qc-sev-error" : sev === "warn" ? "qc-sev-warn" : "qc-sev-info";

    const line1 = document.createElement("div");
    line1.className = "qc-line1";
    line1.innerHTML = `<span class="${sevClass}">${escapeHtml(sev)}</span><code>${escapeHtml(it?.uuid || "doc")}</code><code>${escapeHtml(it?.path || "/")}</code>`;
    item.appendChild(line1);

    const msg = document.createElement("div");
    msg.className = "qc-msg";
    msg.textContent = it?.message || "(no message)";
    item.appendChild(msg);

    item.addEventListener("click", () => {
      // Allow selection jump even when issue has no uuid.
      // Many AJV / import-extras issues are reported as "doc"-level but include
      // a precise path like: /points/7/appearance/marker/primitive
      const rawUuid = it?.uuid ? String(it.uuid) : "";
      const uuid = rawUuid && rawUuid !== "doc" && rawUuid !== "schema" ? rawUuid : null;
      onSelectIssue?.({
        uuid,
        kind: it?.kind || "unknown",
        path: it?.path || "/",
      });
    });

    qcList.appendChild(item);
  }
}

function newUuid() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  } catch {}
  const r = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${r()}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r()}${r().slice(0, 4)}`;
}

function createEmptyDoc() {
  return {
    document_meta: {
      document_title: "Untitled",
      document_summary: "",
      document_uuid: newUuid(),
      // Keep aligned with current release fixtures. This is a reasonable default for authoring.
      schema_uri: "https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4",
      author: "",
      version: "1.0.0",
      coordinate_system: "Z+up/freeXY",
      units: "non_si:px",
    },
    points: [],
    lines: [],
    aux: [],
  };
}

/**
 * @param {{
 *   root: HTMLElement,
 *   core: any,
 *   signal: AbortSignal,
 *   hub: any,
 *   fileController: any,
 *   propertyController: any,
 *   selectionController: any,
 *   fileInput: HTMLInputElement | null,
 *   qcPanel: HTMLElement | null,
 *   qcSummary: HTMLElement | null,
 *   qcList: HTMLElement | null,
 *   renderOutliner: (doc: any) => void,
 *   setHud: (msg: string) => void,
 *   requestToolbarSync?: () => void,
 * }} deps
 */
export function createUiToolbarController(deps) {
  const {
    root,
    core,
    signal,
    hub,
    fileController,
    propertyController,
    selectionController,
    fileInput,
    qcPanel,
    qcSummary,
    qcList,
    renderOutliner,
    setHud,
    requestToolbarSync,
  } = deps;

  // Cache action buttons (used by invoke() and for state sync)
  const btnByAction = new Map();
  root.querySelectorAll('[data-action]').forEach((el) => {
    if (el instanceof HTMLButtonElement) btnByAction.set(el.getAttribute('data-action'), el);
  });

  const frameInput = (() => {
    try {
      const el = root.querySelector('[data-role="frame-index"]');
      return (el instanceof HTMLInputElement) ? el : null;
    } catch {
      return null;
    }
  })();

  const frameMinEl = (() => {
    try {
      const el = root.querySelector('[data-role="frame-min"]');
      return (el instanceof HTMLElement) ? el : null;
    } catch { return null; }
  })();

  const frameMaxEl = (() => {
    try {
      const el = root.querySelector('[data-role="frame-max"]');
      return (el instanceof HTMLElement) ? el : null;
    } catch { return null; }
  })();

  const previewHintEl = (() => {
    try {
      const el = root.querySelector('[data-role="preview-hint"]');
      return (el instanceof HTMLElement) ? el : null;
    } catch { return null; }
  })();


  const getFrameRangeFromDoc = (doc) => {
    let min = null;
    let max = null;
    const push = (v) => {
      const n = (typeof v === 'number' && Number.isFinite(v)) ? Math.trunc(v)
        : (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) ? Math.trunc(Number(v))
        : null;
      if (n === null) return;
      if (min === null || n < min) min = n;
      if (max === null || n > max) max = n;
    };
    const scanNode = (node) => {
      const fr = node?.appearance?.frames;
      if (Array.isArray(fr)) {
        for (const it of fr) push(it);
      } else {
        push(fr);
      }
    };
    const scanList = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const it of arr) scanNode(it);
    };
    if (doc && typeof doc === 'object') {
      scanList(doc.points);
      scanList(doc.lines);
      scanList(doc.aux);
    }
    if (min === null || max === null) return { min: 0, max: 0, hasAny: false };
    return { min, max, hasAny: true };
  };

  // Playback loop (UI-only): advances core.uiState.frameIndex.
  let playTimer = /** @type {any} */ (null);
  let lastTickMs = 0;
  const stopPlayback = () => {
    if (!playTimer) return;
    try { clearInterval(playTimer); } catch {}
    playTimer = null;
    lastTickMs = 0;
  };

  const ensurePlayback = () => {
    const st = core.getUiState?.() || {};
    if (!st.framePlaying) {
      stopPlayback();
      return;
    }
    const fps = (typeof st.frameFps === 'number' && Number.isFinite(st.frameFps)) ? Math.max(1, Math.min(60, Math.trunc(st.frameFps))) : 6;
    const dtMs = Math.max(10, Math.trunc(1000 / fps));
    if (playTimer) return;
    playTimer = setInterval(() => {
      const now = Date.now();
      if (lastTickMs && (now - lastTickMs) < (dtMs - 2)) return;
      lastTickMs = now;
      const doc = core.getDocument?.();
      const range = getFrameRangeFromDoc(doc);
      const cur = core.getUiState?.().frameIndex ?? 0;
      let next = Math.trunc(cur) + 1;
      if (range.hasAny) {
        if (next > range.max) next = range.min;
        if (next < range.min) next = range.min;
      }
      try { core.setUiState?.({ frameIndex: next }); } catch {}
    }, dtMs);
  };

  try {
    signal.addEventListener("abort", () => stopPlayback());
  } catch {}

  const onFrameInputCommit = () => {
    if (!frameInput) return;
    const raw = frameInput.value;
    let v = 0;
    if (raw && Number.isFinite(Number(raw))) v = Math.trunc(Number(raw));
    if (v < -9999) v = -9999;
    if (v > 9999) v = 9999;
    try { core.setUiState?.({ frameIndex: v }); } catch {}
    try { requestToolbarSync && requestToolbarSync(); } catch {}
  };

  if (frameInput) {
    frameInput.addEventListener('change', onFrameInputCommit, { signal });
    frameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        onFrameInputCommit();
        try { frameInput.blur(); } catch {}
      }
    }, { signal });
  }

  // --- Preview-out (external window output) ---
  const origin = String(window.location.origin || "");
  let previewOutWin = /** @type {Window|null} */ (null);
  let previewOutReady = false;
  let lastDoc = null;
  let lastVisibility = { hidden: [], solo: null };

  // Optional layout mode: when preview-out is active, collapse the embedded preview pane.
  // Default OFF (two views are useful). Persisted per-browser.
  let focusMode = false;
  try {
    focusMode = (localStorage.getItem("modeler.previewOut.focusMode") === "1");
  } catch {}

  // Optional mirror mode: preview-out streams the main preview canvas via captureStream().
  // Opt-in and persisted per-browser.
  let mirrorMode = false;
  try {
    mirrorMode = (localStorage.getItem("modeler.previewOut.mirrorMode") === "1");
  } catch {}

  const getCanvas = () => {
    try {
      const el = root.querySelector('[data-role="modeler-canvas"]');
      return el instanceof HTMLCanvasElement ? el : null;
    } catch {
      return null;
    }
  };

  const ensurePreviewOutProvider = () => {
    try {
      const g = /** @type {any} */ (globalThis);
      if (!g.__modelerPreviewOut || typeof g.__modelerPreviewOut !== "object") g.__modelerPreviewOut = {};
      if (typeof g.__modelerPreviewOut.getStream !== "function") {
        g.__modelerPreviewOut.getStream = () => {
          const c = getCanvas();
          try {
            if (c && typeof c.captureStream === "function") return c.captureStream(30);
          } catch {}
          return null;
        };
      }
    } catch {}
  };

  const postToPreviewOut = (type, payload) => {
    if (!previewOutWin || previewOutWin.closed) return false;
    try {
      previewOutWin.postMessage({ type, payload }, origin);
      return true;
    } catch {
      return false;
    }
  };

  const clearPreviewOutWantedSize = () => {
    try { delete globalThis.__modelerPreviewOutWantedSize; } catch {}
    try { window.dispatchEvent(new Event("modeler-previewout-resize")); } catch {}
  };

  const setPreviewOutLayoutActive = (on) => {
    try {
      if (!root) return;
      // Only collapse the main preview pane when focusMode is enabled.
      root.classList.toggle("is-previewout-active", !!on && !!focusMode);
    } catch {}
  };

  const closePreviewOut = () => {
    previewOutReady = false;
    try { previewOutWin && !previewOutWin.closed && previewOutWin.close(); } catch {}
    previewOutWin = null;
    clearPreviewOutWantedSize();
    // Restore the main layout.
    setPreviewOutLayoutActive(false);
  };

  const sendPreviewOutInit = () => {
    lastDoc = core?.getDocument?.() || null;
    const selection = Array.isArray(core?.getSelection?.()) ? core.getSelection().map(String).filter(Boolean) : [];
    postToPreviewOut("modeler-previewout:init", {
      doc: lastDoc,
      visibility: lastVisibility,
      selection,
    });
  };

  const openPreviewOut = () => {
    if (!hasDoc()) {
      try { setHud && setHud("No document loaded"); } catch {}
      return;
    }

    ensurePreviewOutProvider();

    if (previewOutWin && !previewOutWin.closed) {
      try { previewOutWin.focus(); } catch {}
      if (previewOutReady) sendPreviewOutInit();
      setPreviewOutLayoutActive(true);
      return;
    }

    previewOutReady = false;
    const u = new URL("./preview_out.html", window.location.href);
    if (mirrorMode) u.searchParams.set("mirror", "1");
    else u.searchParams.delete("mirror");
    const url = u.toString();
    // Minimal chrome; user can move this to an external display.
    const features = "popup=yes,resizable=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no,width=1280,height=720";
    previewOutWin = window.open(url, "3dsl-modeler-previewout", features);
    if (!previewOutWin) {
      try { setHud && setHud("Preview Out: popup blocked"); } catch {}
      return;
    }
    try { previewOutWin.focus(); } catch {}

    // When preview-out is active, simplify the main window by hiding the embedded preview pane.
    setPreviewOutLayoutActive(true);
  };

  // Relay hub state into the preview-out window (for overlays and fallback renderer).
  if (typeof hub?.on === "function") {
    try {
      hub.on("document", (doc) => {
        lastDoc = doc;
        if (previewOutReady) postToPreviewOut("modeler-previewout:doc", { doc });
      });
      hub.on("visibility", (v) => {
        lastVisibility = v || { hidden: [], solo: null };
        if (previewOutReady) postToPreviewOut("modeler-previewout:visibility", { visibility: lastVisibility });
      });
      hub.on("selection", () => {
        const selection = Array.isArray(core?.getSelection?.()) ? core.getSelection().map(String).filter(Boolean) : [];
        if (previewOutReady) postToPreviewOut("modeler-previewout:selection", { selection });
      });
      hub.on("title", () => {
        if (previewOutReady) postToPreviewOut("modeler-previewout:title", {
          title: String(core?.getSaveLabel?.() || core?.getDocument?.()?.document_meta?.document_title || ""),
        });
      });
    } catch {}
  }

  // Messages from preview-out window.
  window.addEventListener(
    "message",
    (ev) => {
      if (!previewOutWin || ev.source !== previewOutWin) return;
      if (origin && ev.origin && ev.origin !== origin) return;
      const data = ev.data || {};
      const type = String(data.type || "");

      if (type === "modeler-previewout:ready") {
        previewOutReady = true;
        sendPreviewOutInit();
        return;
      }

      if (type === "modeler-previewout:resize") {
        const p = data.payload || {};
        const w = Number(p.width);
        const h = Number(p.height);
        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
          globalThis.__modelerPreviewOutWantedSize = { width: Math.floor(w), height: Math.floor(h) };
          try { window.dispatchEvent(new Event("modeler-previewout-resize")); } catch {}
        }
        return;
      }

      if (type === "modeler-previewout:pick") {
        const p = data.payload || {};
        const uuid = String(p.uuid || "");
        if (uuid) {
          // External preview window can drive selection.
          // Keep selection SSOT in core; property/outliner follow via the usual sync path.
          selectionController?.setSelectionUuids?.([uuid], null, "toolbar-add");
          try { requestToolbarSync?.(); } catch {}
        }
        return;
      }

      if (type === "modeler-previewout:closed") {
        closePreviewOut();
      }
    },
    { signal }
  );

  function hasDoc() {
    return !!core?.getDocument?.();
  }

  function syncActionState() {
    const doc = hasDoc();
    const coreDirty = !!fileController?.isCoreDirty?.();
    const dirty = coreDirty; // 'Save' reflects core-applied edits only
    const propDirty = !!propertyController?.isDirty?.();
    const propLocked = !!propertyController?.isActiveLocked?.();

    const canUndo = !!core?.canUndo?.();
    const canRedo = !!core?.canRedo?.();

    /** @type {Record<string, boolean>} */
    const enabled = {
      new: true,
      open: true,
      save: doc && dirty && !propDirty,
      saveas: doc && !propDirty,
      export: doc && !propDirty,
      undo: doc && canUndo,
      redo: doc && canRedo,
      play: doc,
      "tool-move": doc,
      "world-axis": true,
      "orbit-mode": true,
      quickcheck: true,
      "preview-out": doc,
      "focus-mode": true,
      "qc-fix-lines": true,
      "qc-close": true,
      "prop-save": propDirty && !propLocked,
      "prop-discard": propDirty,
      "prop-close": true,
    };

    for (const a of TOOLBAR_ACTIONS) {
      const b = btnByAction.get(a);
      if (!b) continue;
      const on = enabled[a];
      if (typeof on === "boolean") b.disabled = !on;
    }


    // Frame index input
    if (frameInput) {
      const fi = (core.getUiState?.().frameIndex ?? 0);
      frameInput.disabled = !doc;
      try { frameInput.value = String(fi); } catch {}
    }

    // Frame range (min/max) display
    if (frameMinEl || frameMaxEl) {
      const range = getFrameRangeFromDoc(core.getDocument?.());
      if (frameMinEl) frameMinEl.textContent = String(range.min ?? 0);
      if (frameMaxEl) frameMaxEl.textContent = String(range.max ?? 0);
    }

    // Playback toggle visual + loop
    const playing = !!(core.getUiState?.().framePlaying);
    const bPlay = btnByAction.get("play");
    if (bPlay) {
      bPlay.classList.toggle("is-active", playing);
      try { bPlay.textContent = playing ? "Pause" : "Play"; } catch {}
    }
    try { ensurePlayback(); } catch {}

    // World axis mode toggle
    const bAxis = btnByAction.get("world-axis");
    if (bAxis) {
      const mode = String(core.getUiState?.().worldAxisMode || "fixed").toLowerCase();
      bAxis.classList.toggle("is-active", mode !== "off");
      const label = mode === "off" ? "Axis: Off" : mode === "full_view" ? "Axis: Full" : "Axis: Fixed";
      try { bAxis.textContent = label; } catch {}
    }

    // Orbit enable toggle (Move tool forces orbit off while active)
    const bOrbit = btnByAction.get("orbit-mode");
    if (bOrbit) {
      const st = core.getUiState?.() || {};
      const userOrbit = (st.orbitEnabled !== false);
      const tool = String(st.activeTool || "select").toLowerCase();
      const eff = userOrbit && tool !== "move";
      bOrbit.classList.toggle("is-active", eff);
      try { bOrbit.textContent = eff ? "Orbit: ON" : "Orbit: OFF"; } catch {}
    }

    // Preview hint (reflects effective orbit + move constraints)
    if (previewHintEl) {
      const st = core.getUiState?.() || {};
      const tool = String(st.activeTool || "select").toLowerCase();
      const userOrbit = (st.orbitEnabled !== false);
      const eff = userOrbit && tool !== "move";
      try {
        previewHintEl.textContent = (tool === "move")
          ? "move: drag=XY / wheel=Z (orbit off)"
          : (eff ? "orbit: drag / zoom: wheel (O)" : "orbit: off (O)");
      } catch {}
    }

    // Move tool toggle
    const bMove = btnByAction.get("tool-move");
    if (bMove) {
      const tool = String(core.getUiState?.().activeTool || "select").toLowerCase();
      const on = (tool === "move");
      bMove.classList.toggle("is-active", on);
      try { bMove.textContent = on ? "Move: ON" : "Move"; } catch {}
    }
    // Visual toggle state
    const bFocus = btnByAction.get("focus-mode");
    if (bFocus) bFocus.classList.toggle("is-active", !!focusMode);
    const bMirror = btnByAction.get("mirror-mode");
    if (bMirror) bMirror.classList.toggle("is-active", !!mirrorMode);
    const bOut = btnByAction.get("preview-out");
    if (bOut) bOut.classList.toggle("is-active", !!(previewOutWin && !previewOutWin.closed));
  }

  function syncTabs() {
    const cur = (core.getUiState?.().activeTab) || "points";
    root.querySelectorAll("[data-tab]").forEach((b) => {
      if (!(b instanceof HTMLElement)) return;
      b.classList.toggle("tab-active", b.getAttribute("data-tab") === cur);
    });
  }

  /** @param {ToolbarAction} action */
  async function invoke(action) {
    const act = String(action || "").toLowerCase();
    if (!act) return;

    // Toolbars are synced from a single place (attachUiShell).
    // This controller only *requests* a sync when it mutates state.
    const requestSync = () => {
      if (typeof requestToolbarSync === "function") requestToolbarSync();
      else syncActionState(); // fallback (legacy)
    };

    if (act === 'quickcheck') {
      const issues = core.runQuickCheck?.() || [];
      renderQuickCheckImpl({ issues, qcSummary, qcList, onSelectIssue: (issueLike) => selectionController.selectIssue?.(issueLike) });
      if (qcPanel) qcPanel.hidden = false;
      return;
    }
    if (act === 'qc-close') {
      if (qcPanel) qcPanel.hidden = true;
      return;
    }

    if (act === 'qc-fix-lines') {
      const res = core.fixBrokenLineEndpoints?.() || { removed: 0 };
      const issues = core.runQuickCheck?.() || [];
      renderQuickCheckImpl({ issues, qcSummary, qcList, onSelectIssue: (issueLike) => selectionController.selectIssue?.(issueLike) });
      if (qcPanel) qcPanel.hidden = false;
      try { setHud && setHud(`Removed ${res.removed || 0} broken lines`); } catch {}
      requestSync();
      return;
    }

    if (act === "preview-out") {
      openPreviewOut();
      requestSync();
      return;
    }

    if (act === "mirror-mode") {
      mirrorMode = !mirrorMode;
      try { localStorage.setItem("modeler.previewOut.mirrorMode", mirrorMode ? "1" : "0"); } catch {}
      // If the preview-out window is already open, reopen it so query params take effect.
      if (previewOutWin && !previewOutWin.closed) {
        closePreviewOut();
        openPreviewOut();
      }
      try { setHud && setHud(mirrorMode ? "Mirror: ON" : "Mirror: OFF"); } catch {}
      requestSync();
      return;
    }

    if (act === "focus-mode") {
      focusMode = !focusMode;
      try { localStorage.setItem("modeler.previewOut.focusMode", focusMode ? "1" : "0"); } catch {}
      // Apply immediately if preview-out is already open.
      setPreviewOutLayoutActive(!!(previewOutWin && !previewOutWin.closed));
      try { setHud && setHud(focusMode ? "Focus mode: ON" : "Focus mode: OFF"); } catch {}
      requestSync();
      return;
    }

    if (act === "new") {
      await handleNewAction();
      requestSync();
      return;
    }

    if (act === "open") {
      await handleOpenAction();
      requestSync();
      return;
    }

    if (act === "prop-close") {
      // Close acts as deselect. The property controller will resolve unapplied edits.
      selectionController?.setSelectionUuids?.([], null, "toolbar-clear");
      requestSync();
      return;
    }
    if (act === "prop-discard") {
      propertyController.discardEdits?.();
      requestSync();
      return;
    }
    if (act === "prop-save") {
      propertyController.applyActiveEdits?.();
      requestSync();
      return;
    }

    if (act === "undo" || act === "redo") {
      const ok = propertyController.ensureEditsAppliedOrConfirm?.({ reason: "history" });
      if (!ok) return;
      if (act === "undo") core.undo?.();
      else core.redo?.();
      requestSync();
      return;
    }


    if (act === "tool-move") {
      const st = core.getUiState?.() || {};
      const cur = String(st.activeTool || "select").toLowerCase();
      if (cur === "move") {
        try { core.setUiState?.({ activeTool: "select" }); } catch {}
        try { setHud && setHud("Tool: Select"); } catch {}
        requestSync();
        return;
      }
      const sel = core.getSelection?.() || [];
      if (!Array.isArray(sel) || sel.length !== 1) {
        try { setHud && setHud("Select 1 item to use Move tool"); } catch {}
        return;
      }
      try { core.setUiState?.({ activeTool: "move" }); } catch {}
      try { setHud && setHud("Tool: Move (drag in preview)"); } catch {}
      requestSync();
      return;
    }
    if (act === "play") {
      const st = core.getUiState?.() || {};
      const next = !st.framePlaying;
      try { core.setUiState?.({ framePlaying: next }); } catch {}
      try { setHud && setHud(next ? "Playing" : "Paused"); } catch {}
      requestSync();
      return;
    }

    if (act === "world-axis") {
      const st = core.getUiState?.() || {};
      const cur = String(st.worldAxisMode || "fixed").toLowerCase();
      const next = (cur === "off") ? "fixed" : (cur === "fixed") ? "full_view" : "off";
      try { core.setUiState?.({ worldAxisMode: next }); } catch {}
      try { setHud && setHud(`World axis: ${next}`); } catch {}
      requestSync();
      return;
    }

    if (act === "orbit-mode") {
      const st = core.getUiState?.() || {};
      const cur = (st.orbitEnabled !== false);
      const next = !cur;
      try { core.setUiState?.({ orbitEnabled: next }); } catch {}
      try { setHud && setHud(next ? "Orbit: ON" : "Orbit: OFF"); } catch {}
      requestSync();
      return;
    }

    if (act === "save" || act === "saveas" || act === "export") {
      await fileController.handleFileAction?.(act, { ensureEditsApplied: () => propertyController.ensureEditsAppliedOrConfirm?.({ reason: "file" }) });
      requestSync();
      return;
    }

    setHud(`Unknown action: ${act}`);
  }

  async function handleNewAction() {
    const ok = propertyController.ensureEditsAppliedOrConfirm?.({ reason: "new" });
    if (!ok) return;
    if (!fileController.confirmDiscardIfDirty("New")) return;

    const doc = createEmptyDoc();
    core.setDocument(doc, { source: "memory", intent: "new", label: "(new)", saveLabel: null, saveHandle: null });
    // New document should not have a save handle. Mark dirty so user can save immediately.
    core.markDirty?.();
    try { selectionController?.setSelectionUuids?.([], null, "toolbar-clear"); } catch {}
    fileController.syncTitle?.();
  }

  async function handleOpenAction() {
    const ok = propertyController.ensureEditsAppliedOrConfirm?.({ reason: "open" });
    if (!ok) return;
    if (!fileController.confirmDiscardIfDirty("Open")) return;

    // Prefer File System Access API when available.
    if (fileController.canUseOpenFsa?.()) {
      try {
        const [handle] = await fileController.withFocusRestore?.(() => window.showOpenFilePicker({
          multiple: false,
          types: [{
            description: "3DSS JSON",
            accept: { "application/json": [".json"] },
          }],
        }));
        if (handle) {
          const file = await handle.getFile();
          const text = await file.text();
          const raw = JSON.parse(text);
          let doc = raw;
          let extras = null;
          try {
            const res = await core.importNormalize?.(raw);
            if (res && res.strictDoc) {
              doc = res.strictDoc;
              extras = res.extras || null;
            }
          } catch {}
          core.setDocument(doc, { source: "file", intent: "open", label: file.name, saveLabel: file.name, saveHandle: handle, extras });
          fileController.syncTitle?.();
          return;
        }
      } catch (e) {
        setHud(`Open failed (picker): ${String(e?.message || e)}`);
        // fall back to input
      }
    }

    if (fileInput) fileController.withFocusRestore?.(() => fileInput.click());
  }

  async function handleFileInputChange() {
    const f = fileInput?.files && fileInput.files[0];
    if (!f) return;
    const ok = propertyController.ensureEditsAppliedOrConfirm?.({ reason: "open" });
    if (!ok) { fileInput.value = ""; return; }
    if (!fileController.confirmDiscardIfDirty("Open")) {
      fileInput.value = "";
      return;
    }
    try {
      const text = await f.text();
      const raw = JSON.parse(text);
      let doc = raw;
      let extras = null;
      try {
        const res = await core.importNormalize?.(raw);
        if (res && res.strictDoc) {
          doc = res.strictDoc;
          extras = res.extras || null;
        }
      } catch {}
      core.setDocument(doc, { source: "file", intent: "open", label: f.name, saveLabel: f.name, extras });
      fileController.syncTitle?.();
    } catch (e) {
      setHud(`Open failed: ${String(e?.message || e)}`);
    } finally {
      fileInput.value = "";
    }
  }

  root.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const act = t.getAttribute("data-action");
    if (act) {
      /** @type {ToolbarAction} */
      const a = /** @type {any} */ (String(act).toLowerCase());
      // NOTE: many sub-panels (e.g., Outliner) also use data-action attributes.
      // The toolbar controller should only own TOOLBAR_ACTIONS. Unknown actions
      // are ignored here so that dedicated controllers can handle them.
      if (TOOLBAR_ACTIONS.includes(a)) {
        await invoke(a);
      }
      return;
    }

    const tab = t.getAttribute("data-tab");
    if (tab) {
      // Phase2: prevent losing buffered edits while switching contexts.
      const ok = propertyController.ensureEditsAppliedOrConfirm?.({ reason: "tab" });
      if (!ok) return;
      core.setUiState?.({ activeTab: tab });
      syncTabs();
      renderOutliner(core.getDocument?.());
    }
  }, { signal });

  if (fileInput) {
    fileInput.addEventListener("change", () => { void handleFileInputChange(); }, { signal });
  }

  // initialize
  syncTabs();
  syncActionState();

  void hub;

  return {
    syncTabs,
    syncActionState,
    invoke,
    renderQuickCheck: (issues) => renderQuickCheckImpl({
      issues,
      qcSummary,
      qcList,
      onSelectIssue: (issueLike) => selectionController.selectIssue?.(issueLike),
    }),
  };
}
