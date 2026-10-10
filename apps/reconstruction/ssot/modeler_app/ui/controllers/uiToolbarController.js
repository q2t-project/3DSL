// ui/controllers/uiToolbarController.js
// UI-only controller for toolbar / tabs / quickcheck panel.
import { openViewerSnapshot } from "../../../shared/viewerHandoff.js";

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
 *  | "viewer-read"
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
  "viewer-read",
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
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const r = Math.floor(Math.random() * 16);
    return (token === "x" ? r : (r & 3) | 8).toString(16);
  });
}

function createEmptyDoc() {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    document_meta: {
      document_title: "Untitled",
      document_summary: "",
      document_uuid: newUuid(),
      created_at: now,
      revised_at: now,
      // Keep aligned with current release fixtures. This is a reasonable default for authoring.
      schema_uri: "https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4",
      author: "anonymous",
      version: "1.1.4",
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
    invoke: invokeExternal,
    propertyController,
    selectionController,
    fileInput,
    qcPanel,
    qcSummary,
    qcList,
    renderOutliner,
    setHud,
    requestToolbarSync,
    prepareOpenedDocument,
    onDocumentOpened,
    onNewDocument,
  } = deps;

  // Cache action buttons (used by invoke() and for state sync)
  const btnByAction = new Map();
  root.querySelectorAll('[data-action]').forEach((el) => {
    if (el instanceof HTMLButtonElement) btnByAction.set(el.getAttribute('data-action'), el);
  });

  // Bind direct handlers for toolbar action buttons.
  // Event delegation via `root` can miss clicks when nested elements (icons/spans)
  // are inside the button, or when other controllers attach handlers on ancestors.
  for (const a of TOOLBAR_ACTIONS) {
    const b = btnByAction.get(a);
    if (!b) continue;
    b.addEventListener(
      "click",
      (ev) => {
        try {
          ev.preventDefault();
          ev.stopPropagation();
        } catch {}
        if (b.disabled) return;
        void invoke(a);
      },
      { signal }
    );
  }

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
    const values = new Set();
    const push = (v) => {
      const n = (typeof v === 'number' && Number.isFinite(v)) ? Math.trunc(v)
        : (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) ? Math.trunc(Number(v))
        : null;
      if (n === null || n < -64 || n > 63) return;
      values.add(n);
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
    if (min === null || max === null) return { min: 0, max: 0, hasAny: false, values: [0] };
    return { min, max, hasAny: true, values: [...values].sort((a, b) => a - b) };
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
      const next = range.values.find((value) => value > cur) ?? range.values[0];
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
    const frames = getFrameRangeFromDoc(core.getDocument?.()).values;
    v = frames.reduce((best, value) => Math.abs(value - v) < Math.abs(best - v) ? value : best, frames[0]);
    stopPlayback();
    try { core.setUiState?.({ frameIndex: v, framePlaying: false }); } catch {}
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
  let viewRequestId = 0;
  const pendingViews = new Map();

  const previewUiState = () => {
    const state = core.getUiState?.() || {};
    return { frameIndex: state.frameIndex ?? 0, worldAxisMode: state.worldAxisMode ?? "fixed", explorationScope: state.explorationScope ?? null };
  };

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
            if (c && typeof c.captureStream === "function") {
              const stream = c.captureStream(30);
              // An idle canvas needs a new paint after capture begins.
              try { hub.start?.(); } catch {}
              return stream;
            }
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
    for (const request of pendingViews.values()) { clearTimeout(request.timer); request.resolve(null); }
    pendingViews.clear();
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
      ...previewUiState(),
    });
  };

  const capturePreviewOutView = () => new Promise((resolve) => {
    if (!previewOutReady || !previewOutWin || previewOutWin.closed || mirrorMode) { resolve(null); return; }
    const requestId = String(++viewRequestId);
    const timer = setTimeout(() => { pendingViews.delete(requestId); resolve(null); }, 350);
    pendingViews.set(requestId, { resolve, timer });
    if (!postToPreviewOut("modeler-previewout:capture-view", { requestId })) {
      clearTimeout(timer); pendingViews.delete(requestId); resolve(null);
    }
  });
  const restorePreviewOutView = (view) => !!view && postToPreviewOut("modeler-previewout:restore-view", { view });
  const focusPreviewOut = (uuid) => postToPreviewOut("modeler-previewout:focus", { uuid: String(uuid || "") });
  const fitPreviewOut = () => postToPreviewOut("modeler-previewout:fit", {});

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
      // D8: avoid "stuck" state when popups are blocked (iOS Safari etc.)
      try {
        const ok = window.confirm("Preview Out: popup blocked. Open it in this tab instead?");
        if (ok) {
          window.location.href = url;
        }
      } catch {}

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
      hub.on("uistate", () => {
        if (previewOutReady) postToPreviewOut("modeler-previewout:uistate", previewUiState());
      });
      hub.on("title", () => {
        if (previewOutReady) postToPreviewOut("modeler-previewout:title", {
          title: String(core?.getSaveLabel?.() || core?.getDocument?.()?.document_meta?.document_title || core?.getDocument?.()?.document_meta?.title || ""),
        });
      });
    } catch {}
  }

  // Messages from preview-out window.
  window.addEventListener(
    "message",
    (ev) => {
      if (!previewOutWin || ev.source !== previewOutWin) return;
      if (ev.origin !== origin) return;
      const data = ev.data || {};
      const type = String(data.type || "");

      if (type === "modeler-previewout:view-state") {
        const requestId = String(data.payload?.requestId || "");
        const request = pendingViews.get(requestId);
        if (request) {
          clearTimeout(request.timer); pendingViews.delete(requestId);
          request.resolve(data.payload?.view || null);
        }
        return;
      }

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
    // Prefer core document; fall back to last hub-emitted doc.
    // This keeps toolbar state usable even if UI rendering is currently driven by hub events.
    return !!(core?.getDocument?.() || lastDoc);
  }

  function syncActionState() {
    const doc = hasDoc();
    const writing = !!fileController?.isWriting?.();
    const coreDirty = !!fileController?.isCoreDirty?.();
    const dirty = coreDirty; // 'Save' reflects core-applied edits only
    const propDirty = !!propertyController?.isDirty?.();
    const propLocked = !!propertyController?.isActiveLocked?.();

    const canUndo = !!core?.canUndo?.();
    const canRedo = !!core?.canRedo?.();

    /** @type {Record<string, boolean>} */
    const enabled = {
      new: !writing,
      open: !writing,
      save: doc && dirty && !propDirty && !writing,
      saveas: doc && !propDirty && !writing,
      export: doc && !propDirty && !writing,
      undo: doc && canUndo,
      redo: doc && canRedo,
      play: doc,
      "tool-move": doc,
      "world-axis": true,
      "orbit-mode": true,
      quickcheck: true,
      "preview-out": doc,
      "viewer-read": doc && !writing,
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
      frameInput.min = "-64";
      frameInput.max = "63";
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
          ? (hasXYMoveSelection() ? "XY移動中：点・ラベルをドラッグ ／ Escで取消 ／ Mで視点操作へ" : "位置微調整中：軸を選んでホイール ／ Mで視点操作へ")
          : (eff ? "選択：クリック ／ 視点：ドラッグ ／ 拡大：ホイール ／ Mで移動" : "選択：クリック ／ 視点操作は停止中");
      } catch {}
    }

    // Move tool toggle
    const bMove = btnByAction.get("tool-move");
    if (bMove) {
      const tool = String(core.getUiState?.().activeTool || "select").toLowerCase();
      const on = (tool === "move");
      bMove.classList.toggle("is-active", on);
      bMove.setAttribute("aria-pressed", String(on));
      root.dataset.moveMode = on ? "move" : "select";
      try { bMove.textContent = hasXYMoveSelection() ? (on ? "XY移動中 (M)" : "XY移動 (M)") : (on ? "微調整中 (M)" : "位置微調整 (M)"); } catch {}
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
    try { console.debug('[toolbar] action', act); } catch {}
    if (!act) return;
    if (act === "viewer-read") {
      try {
        const snapshot = fileController.createReadingSnapshot();
        const transfer = openViewerSnapshot({ ...snapshot, onStatus: setHud });
        const abort = () => transfer.dispose();
        signal?.addEventListener("abort", abort, { once: true });
        try { await transfer.ready; }
        finally { signal?.removeEventListener("abort", abort); }
      } catch (error) {
        setHud(`Viewerを開けません: ${error?.message || error}`);
      }
      return;
    }
    if (["new", "open", "save", "saveas", "export"].includes(act) && fileController?.isWriting?.()) {
      setHud("保存処理中です。完了してからファイル操作を続けてください。");
      return;
    }
    if (propertyController.handleToolbarAction?.(act)) return;

    // Toolbars are synced from a single place (attachUiShell).
    // This controller only *requests* a sync when it mutates state.
    const requestSync = () => {
      if (typeof requestToolbarSync === "function") requestToolbarSync();
      else syncActionState(); // fallback (legacy)
    };

    if (act === 'quickcheck') {
      const issues = core.runQuickCheck?.() || [];
      // Selection/Focus contract: packages/docs/docs/modeler/selection-contract.md
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
      // Selection/Focus contract: packages/docs/docs/modeler/selection-contract.md
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
      if (!hub.isContractWork?.() && (!Array.isArray(sel) || sel.length !== 1)) {
        try { setHud && setHud("Select 1 item to use Move tool"); } catch {}
        return;
      }
      try { core.setUiState?.({ activeTool: "move" }); } catch {}
      try { setHud && setHud(hasXYMoveSelection() ? "移動する出現の点かラベルをドラッグしてな。Z固定、Escで取消。数値はプロパティで編集できるで。" : "位置微調整：X・Y・Zの軸を選び、ホイールで調整します。"); } catch {}
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
      await fileController.handleFileAction?.(act, {
        ensureEditsApplied: () => propertyController.ensureEditsAppliedOrConfirm?.({ reason: "file" }),
        getFallbackDocument: () => lastDoc,
      });
      requestSync();
      return;
    }

    setHud(`Unknown action: ${act}`);
  }

  async function handleNewAction() {
    const ok = propertyController.ensureEditsAppliedOrConfirm?.({ reason: "new" });
    if (!ok) return;
    if (!fileController.confirmDiscardIfDirty("New")) return;

    if (typeof hub.newContractWork === "function") {
      hub.newContractWork();
      core.markDirty?.();
      selectionController?.setSelectionUuids?.([], null, "toolbar-clear");
      fileController.syncTitle?.();
      setHud("新しい作品一式。Pで点、Lで関係を追加。作業途中も保存できるで。");
      return;
    }

    const doc = createEmptyDoc();
    onNewDocument?.();
    core.setDocument(doc, { source: "memory", intent: "new", label: "(new)", saveLabel: null, saveHandle: null });
    // New document should not have a save handle. Mark dirty so user can save immediately.
    core.markDirty?.();
    try { selectionController?.setSelectionUuids?.([], null, "toolbar-clear"); } catch {}
    fileController.syncTitle?.();
  }

  function hasXYMoveSelection() {
    return !!hub.isContractWork?.() || (core.getSelection?.() || []).some(uuid => hub.getLegacyDisplayGroup?.(uuid));
  }

  async function openDocumentCandidate(raw, meta, prepared = null) {
    let candidate;
    if (prepared) {
      candidate = prepared;
    } else if (typeof prepareOpenedDocument === "function") {
      candidate = await prepareOpenedDocument(raw, meta);
    } else {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.document_meta) {
        throw new Error("対応する3DSS作品ではありません。");
      }
      const normalized = await core.importNormalize?.(raw);
      candidate = { doc: normalized?.strictDoc || raw, extras: normalized?.extras || null };
    }
    if (!candidate?.doc || typeof candidate.doc !== "object") throw new Error("読み込む作品がありません。");
    // Parsing/validation must finish before switching the active work package.
    await onDocumentOpened?.(candidate, meta);
    core.setDocument(candidate.doc, { ...meta, extras: candidate.extras || null, workContext: candidate.workContext || null });
    if (candidate.recoveredImport) core.markDirty?.();
    fileController.syncTitle?.();
  }

  async function openFile(file, meta) {
    // Decode strictly and preserve a BOM in the source attachment. JSON parsing
    // strips only that leading BOM; the retained source is never rewritten.
    const text = file.arrayBuffer
      ? new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await file.arrayBuffer())
      : await file.text();
    let candidate;
    try {
      const raw = JSON.parse(text.replace(/^\uFEFF/, ''));
      candidate = typeof prepareOpenedDocument === 'function' ? await prepareOpenedDocument(raw, meta) : null;
      if (!candidate) return await openDocumentCandidate(raw, meta);
    } catch (error) {
      if (typeof hub.prepareUninterpretedImport !== 'function') throw error;
      const retain = window.confirm('このファイルは現在の形式として開けません。\n' + String(error?.message || error)
        + '\n\n原文と診断を保持した別の作品として開きますか？ 内容の解釈と図への変換は行いません。');
      if (!retain) { setHud('取込みを取り消しました。現在の作品と元ファイルは保持されています。'); return; }
      candidate = await hub.prepareUninterpretedImport(text, meta, error);
      const label = String(file.name || 'import').replace(/\.json$/i, '') + '.review.3dsl-work.json';
      meta = {source: 'memory', intent: 'new', label, saveLabel: null, saveHandle: null};
    }
    await openDocumentCandidate(null, meta, candidate);
    if (candidate.recoveredImport) setHud('原文を未解釈の資料として保持しました。別名で作品一式を保存できます。');
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
            description: "3DSS / 制作一式 JSON",
            accept: { "application/json": [".json"] },
          }],
        }));
        if (handle) {
          const file = await handle.getFile();
          await openFile(file, { source: "file", intent: "open", label: file.name, saveLabel: file.name, saveHandle: handle });
          return;
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        setHud(`Open failed (picker): ${String(e?.message || e)}`);
      }
      // Failed/cancelled FSA opens must not launch a second picker.
      return;
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
      await openFile(f, { source: "file", intent: "open", label: f.name, saveLabel: f.name, saveHandle: null });
    } catch (e) {
      setHud(`Open failed: ${String(e?.message || e)}`);
    } finally {
      fileInput.value = "";
    }
  }

  root.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const el = t.closest("[data-action],[data-tab]");
    if (!el || !root.contains(el)) return;

    const act = el.getAttribute("data-action");
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
    capturePreviewOutView,
    restorePreviewOutView,
    focusPreviewOut,
    fitPreviewOut,
    syncTabs,
    syncActionState,
    invoke,
    renderQuickCheck: (issues) => renderQuickCheckImpl({
      issues,
      qcSummary,
      qcList,
      // Selection/Focus contract: packages/docs/docs/modeler/selection-contract.md
      onSelectIssue: (issueLike) => selectionController.selectIssue?.(issueLike),
    }),
  };
}
