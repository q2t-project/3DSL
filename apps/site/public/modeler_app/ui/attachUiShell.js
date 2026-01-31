// Selection / Focus Contract:
// See packages/docs/docs/modeler/selection-focus-contract.md

// ui/attachUiShell.js
// Modeler UI shell: DOM gather + controller instantiation + hub wiring only.

import { resizeHub, startHub } from "./hubOps.js";
import { createHubCoreControllers } from "./hubFacade.js";

import { createUiFileController } from "./controllers/uiFileController.js";
import { createUiPropertyController } from "./controllers/uiPropertyController.js";
import { createUiSelectionController } from "./controllers/uiSelectionController.js";
import { createUiToolbarController } from "./controllers/uiToolbarController.js";
import { UiOutlinerController } from "./controllers/uiOutlinerController.js";

import { attachUiShortcutController } from "./controllers/uiShortcutController.js";
import { attachUiCanvasController } from "./controllers/uiCanvasController.js";

function getRoleEl(root, role) {
  const el = root.querySelector(`[data-role="${role}"]`);
  return el || null;
}

// NOTE: shortcut handling and canvas wiring moved into controllers.

export function attachUiShell({ root, hub, modelUrl }) {
  const ac = new AbortController();
  const sig = ac.signal;
  const unsubs = [];
  let cleaned = false;
  let canvasCtl = null;

  const core = createHubCoreControllers(hub);

  // --- UI sidecar persistence (localStorage) ---
  const getDocUuid = () => {
    try {
      const d = core.getDocument?.();
      const u = d?.document_meta?.document_uuid;
      return (typeof u === "string" && u) ? u : null;
    } catch {
      return null;
    }
  };

  const sidecarKeyFor = (docUuid) => `modeler.sidecar.${docUuid}`;

  const loadSidecar = () => {
    const docUuid = getDocUuid();
    if (!docUuid) return;
    try {
      const raw = localStorage.getItem(sidecarKeyFor(docUuid));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      core.applyUiSidecar?.(parsed);
    } catch {}
  };

  const saveSidecar = (() => {
    let t = 0;
    return () => {
      const docUuid = getDocUuid();
      if (!docUuid) return;
      if (t) return;
      t = window.setTimeout(() => {
        t = 0;
        try {
          const payload = core.getUiSidecar?.();
          if (!payload) return;
          localStorage.setItem(sidecarKeyFor(docUuid), JSON.stringify(payload));
        } catch {}
      }, 150);
    };
  })();

  // --- Preview render throttling ---
  // When Preview Out is used with Focus Mode, the embedded preview pane is hidden.
  // In that case, stop the main renderer loop to reduce GPU load.
  let mainPreviewRunning = false;
  const ensureMainPreview = (shouldRun) => {
    const run = !!shouldRun;
    if (run === mainPreviewRunning) return;
    mainPreviewRunning = run;
    try {
      if (run) hub.start?.();
      else hub.stop?.();
    } catch {}
  };

  function cleanupUiShell() {
    if (cleaned) return;
    cleaned = true;
    try { ac.abort(); } catch {}
    try { canvasCtl && canvasCtl.detach && canvasCtl.detach(); } catch {}
    for (const off of unsubs) {
      try { typeof off === "function" && off(); } catch {}
    }
  }

  // --- DOM gather ---
  const canvas = /** @type {HTMLCanvasElement|null} */ (getRoleEl(root, "modeler-canvas"));
  const tbody = getRoleEl(root, "outliner-tbody");
  const fileLabel = getRoleEl(root, "file-label");
  const hud = getRoleEl(root, "hud");
  const previewSelectionEl = getRoleEl(root, "preview-selection");

  const paneOutliner = getRoleEl(root, "pane-outliner");
  const paneProp = getRoleEl(root, "pane-prop");
  const splitterLeft = getRoleEl(root, "splitter-left");
  const splitterRight = getRoleEl(root, "splitter-right");

  const btnSave = /** @type {HTMLButtonElement|null} */ (root.querySelector('[data-action="save"]'));
  const btnSaveAs = /** @type {HTMLButtonElement|null} */ (root.querySelector('[data-action="saveas"]'));
  const btnExport = /** @type {HTMLButtonElement|null} */ (root.querySelector('[data-action="export"]'));
  const fileInput = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "file-input"));

  const qcPanel = getRoleEl(root, "qc-panel");
  const qcSummary = getRoleEl(root, "qc-summary");
  const qcList = getRoleEl(root, "qc-list");

  const APP_TITLE = "3DSD Modeler";
  const setHud = (msg) => { if (hud) hud.textContent = String(msg ?? ""); };

  // --- Preview label: show the current single-selection name/caption in the viewport ---
  const pickText = (v) => {
    if (typeof v === 'string') return v.trim();
    if (v && typeof v === 'object') {
      if (typeof v.ja === 'string' && v.ja.trim()) return v.ja.trim();
      if (typeof v.en === 'string' && v.en.trim()) return v.en.trim();
      if (typeof v.default === 'string' && v.default.trim()) return v.default.trim();
    }
    return '';
  };

  const findByUuid = (doc, uuid) => {
    const u = String(uuid || '');
    if (!doc || !u) return { kind: null, node: null };
    const has = (arr) => Array.isArray(arr) ? arr.find((it) => String(it?.meta?.uuid || it?.uuid || '') === u) : null;
    const p = has(doc.points); if (p) return { kind: 'point', node: p };
    const l = has(doc.lines);  if (l) return { kind: 'line', node: l };
    const a = has(doc.aux);    if (a) return { kind: 'aux', node: a };
    return { kind: null, node: null };
  };

  const updatePreviewSelectionLabel = () => {
    if (!previewSelectionEl) return;
    const sel = core.getSelection?.() || [];
    if (!Array.isArray(sel) || sel.length !== 1) {
      previewSelectionEl.hidden = true;
      previewSelectionEl.textContent = '';
      return;
    }

    const uuid = String(sel[0] || '');
    const doc = core.getDocument?.();
    const { kind, node } = findByUuid(doc, uuid);

    let label = '';
    if (kind === 'point') {
      const name = pickText(node?.signification?.name ?? node?.meta?.name ?? node?.name);
      const text = pickText(node?.marker?.text?.content ?? node?.appearance?.marker?.text?.content);
      if (name && text && name !== text) label = `${name} / ${text}`;
      else label = name || text;
    }
    else if (kind === 'line') {
      const cap = pickText(node?.signification?.caption ?? node?.signification?.name ?? node?.caption ?? node?.name);
      label = cap ? `line: ${cap}` : '';
    }
    else if (kind === 'aux') {
      const mod = node?.appearance?.module;
      const key = (mod && typeof mod === 'object') ? (Object.keys(mod)[0] || '') : '';
      const nm = pickText(node?.meta?.name ?? node?.name);
      const v = key || nm;
      label = v ? `aux: ${v}` : '';
    }

    if (!label) label = uuid ? uuid.slice(0, 8) : '';

    previewSelectionEl.textContent = label;
    previewSelectionEl.hidden = !label;
  };

  // Observe layout class toggles to stop/start the main renderer when the preview pane is hidden.
  (function attachPreviewOutFocusObserver() {
    if (!root || !hub) return;
    const isFocusHidden = () => {
      try { return root.classList.contains("is-previewout-active"); } catch { return false; }
    };
    // Start running by default.
    ensureMainPreview(true);
    const mo = new MutationObserver(() => {
      // If the embedded preview is hidden, stop the loop; otherwise run.
      ensureMainPreview(!isFocusHidden());
      // When re-enabled, make sure we resize once so the canvas catches up.
      if (!isFocusHidden()) {
        try { canvasCtl?.resize?.(); } catch {}
      }
    });
    try { mo.observe(root, { attributes: true, attributeFilter: ["class"] }); } catch {}
    unsubs.push(() => { try { mo.disconnect(); } catch {} });
  })();


  // --- Pane splitters (UI-only): make Outliner / Property widths adjustable ---
  (function attachSplitters() {
    if (!root || !(root instanceof HTMLElement)) return;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const readPx = (k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw == null) return null;
        const n = Number(raw);
        if (!Number.isFinite(n)) return null;
        if (n <= 0) return null;
        return n;
      } catch { return null; }
    };
    const writePx = (k, n) => {
      try { localStorage.setItem(k, String(Math.round(n))); } catch {}
    };

    const KEY_L = "modeler.paneOutlinerW";
    const KEY_R = "modeler.panePropW";

    const initL = readPx(KEY_L);
    const initR = readPx(KEY_R);
    if (typeof initL === "number") root.style.setProperty("--pane-outliner-w", `${clamp(initL, 260, 780)}px`);
    if (typeof initR === "number") root.style.setProperty("--pane-prop-w", `${clamp(initR, 260, 780)}px`);

    const startDrag = (which, ev) => {
      const target = ev?.target;
      if (!(target instanceof HTMLElement)) return;
      const startX = ev.clientX;
      const startOutW = paneOutliner?.getBoundingClientRect?.().width ?? 0;
      const startPropW = paneProp?.getBoundingClientRect?.().width ?? 0;

      target.classList.add("is-dragging");
      try { target.setPointerCapture(ev.pointerId); } catch {}

      const onMove = (e) => {
        const dx = e.clientX - startX;
        if (which === "left") {
          const next = clamp(startOutW + dx, 260, 780);
          root.style.setProperty("--pane-outliner-w", `${next}px`);
          writePx(KEY_L, next);
        } else {
          // right splitter: moving right shrinks property pane
          const next = clamp(startPropW - dx, 260, 780);
          root.style.setProperty("--pane-prop-w", `${next}px`);
          writePx(KEY_R, next);
        }
      };

      const onUp = () => {
        target.classList.remove("is-dragging");
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
      };

      target.addEventListener("pointermove", onMove, { signal: sig });
      target.addEventListener("pointerup", onUp, { signal: sig, once: true });
      target.addEventListener("pointercancel", onUp, { signal: sig, once: true });
    };

    if (splitterLeft) splitterLeft.addEventListener("pointerdown", (ev) => startDrag("left", ev), { signal: sig });
    if (splitterRight) splitterRight.addEventListener("pointerdown", (ev) => startDrag("right", ev), { signal: sig });
  })();


  // --- Controllers ---
  /** @type {ReturnType<typeof createUiToolbarController> | null} */
  let toolbarController = null;

  /** @type {ReturnType<typeof createUiFileController> | null} */
  let fileController = null;

  /** @type {ReturnType<typeof createUiSelectionController> | null} */
  let selectionController = null;

  // Single synchronization point for toolbar enable/disable.
  // Any path that changes document/dirty/selection/history should call this.
  const requestToolbarSync = (() => {
    let pending = false;
    return () => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        toolbarController?.syncActionState?.();
      });
    };
  })();

  // Bridge: route selection changes through uiSelectionController when available
  // so dirty-guards + focus behavior stay consistent.
  const setSelectionUuids = (uuids, issueLike, reason) => {
    try {
      if (selectionController && typeof selectionController.setSelectionUuids === "function") {
        selectionController.setSelectionUuids(uuids, issueLike, reason);
        return;
      }
    } catch {}
    try { core.setSelection?.(Array.isArray(uuids) ? uuids : []); } catch {}
  };

  const propertyController = createUiPropertyController({
    root,
    core,
    // Preview-only helpers (do not mutate core document)
    previewSetPosition: (uuid, pos) => hub.previewSetPosition?.(uuid, pos),
    previewSetLineEnds: (uuid, endA, endB) => hub.previewSetLineEnds?.(uuid, endA, endB),
    previewSetCaptionText: (uuid, captionText, fallbackText) => hub.previewSetCaptionText?.(uuid, captionText, fallbackText),
    setSelectionUuids,
    signal: sig,
    setHud,
    onDirtyChange: () => {
      fileController?.syncTitle?.();
      requestToolbarSync();
    },
  });

  fileController = createUiFileController({
    core,
    elements: { fileLabel, btnSave, btnSaveAs, btnExport, qcPanel, qcSummary, qcList },
    selectionController,
    appTitle: APP_TITLE,
    setHud,
  });

  function getSelectedSet() {
    return new Set(core.getSelection?.() || []);
  }

  const outlinerController = new UiOutlinerController({
    root,
    tbody,
    core,
    signal: sig,
    syncTabButtons: () => toolbarController?.syncTabs?.(),
    getSelectedSet,
    // Selection/Focus contract: packages/docs/docs/modeler/selection-contract.md
    onRowSelect: (issueLike, ev) => selectionController?.selectFromOutliner?.(issueLike, ev),
    ensureEditsAppliedOrConfirm: () => propertyController.ensureEditsAppliedOrConfirm(),
    requestToolbarSync,
    setHud,
    setSelectionUuids,
  });

  selectionController = createUiSelectionController({
    core,
    // Preflight selection guard (drafting -> confirm apply/discard/cancel)
    requestSelectionChange: (nextUuids, { reason = "selection" } = {}) =>
      propertyController.requestSelectionChange
        ? propertyController.requestSelectionChange(nextUuids, { reason })
        : propertyController.ensureEditsAppliedOrConfirm({ reason }),
    // Back-compat / non-selection usages
    ensureEditsAppliedOrConfirm: (args) => propertyController.ensureEditsAppliedOrConfirm(args),
    setHud,
    getOutlinerRowOrder: () => outlinerController.getRowOrder?.() || [],
  });

  toolbarController = createUiToolbarController({
    root,
    core,
    signal: sig,
    hub,
    fileController,
    propertyController,
    selectionController,
    fileInput,
    qcPanel,
    qcSummary,
    qcList,
    renderOutliner: (doc) => outlinerController.render(doc),
    setHud,
    requestToolbarSync,
  });

  // --- Cross-controller wiring ---

  fileController?.setExtraDirtyProvider?.(() => !!propertyController?.isDirty?.());
  fileController?.setInvoker?.((a) => toolbarController?.invoke?.(a));
  fileController?.attachBeforeUnload?.({ signal: sig });

  // --- Input wiring ---
  attachUiShortcutController({ signal: sig, core, invoke: (a) => toolbarController?.invoke?.(a) });
  canvasCtl = attachUiCanvasController({
    canvas,
    core,
    hub,
    signal: sig,
    // NOTE: do not use `||` fallback here: selectionController methods intentionally return void.
    onPick: (issueLike, ev) => {
      // Property controller can temporarily intercept preview picks (e.g., line endpoint pick mode).
      try {
        if (typeof propertyController?.handlePreviewPickOverride === "function") {
          const handled = propertyController.handlePreviewPickOverride(issueLike, ev);
          if (handled) return;
        }
      } catch {}
      // Selection/Focus contract: packages/docs/docs/modeler/selection-contract.md
      if (typeof selectionController.selectFromPick === "function") selectionController.selectFromPick(issueLike, ev);
      else selectionController.selectIssue(issueLike);
    },
    onResize: (args) => resizeHub(hub, args.width, args.height, args.dpr),
    // Needed for Move tool helpers (e.g., wheel-based axis nudges / dimension overlay).
    ensureEditsAppliedOrConfirm: () => {
      try {
        return (typeof fileController?.ensureEditsAppliedOrConfirm === "function")
          ? fileController.ensureEditsAppliedOrConfirm()
          : true;
      } catch {
        return true;
      }
    },
    setHud,
  });
  // --- Host bridge (for /app/modeler quick actions) ---
  // Parent can postMessage({ type: "3DSL_MODELER_CMD", action }) to control a few safe operations.
  try {
    window.addEventListener("message", (ev) => {
      const data = ev?.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "3DSL_MODELER_CMD") return;
      // Accept only parent frame as sender (defensive; same-origin not assumed in dev)
      if (ev.source !== window.parent) return;

      const action = String(data.action || "").toLowerCase();
      if (!action) return;

      if (action === "reload") {
        try { window.location.reload(); } catch {}
        return;
      }
      if (action === "export") {
        try { toolbarController?.invoke?.("export"); } catch {}
        return;
      }
      if (action === "discard") {
        // Discard buffered (unapplied) property edits.
        try { toolbarController?.invoke?.("prop-discard"); } catch {}
        return;
      }
    }, { signal: sig });
  } catch {}


  // --- hub events ---
  if (typeof hub?.on === "function") {
    unsubs.push(hub.on("document", (doc) => {
      // Restore UI-only state per document_uuid.
      // Must run before render so locks/visibility/groups are reflected.
      loadSidecar();
      // Document updates (including undo/redo) can invalidate the current selection.
      // Prune selection to existing items to avoid property panel pointing at stale UUIDs.
      try {
        const curSel = Array.isArray(core.getSelection?.()) ? core.getSelection?.().filter(Boolean).map(String) : [];
        if (curSel.length > 0 && doc && typeof doc === "object") {
          const alive = new Set();
          const add = (arr) => {
            if (!Array.isArray(arr)) return;
            for (const it of arr) {
              const u = it?.meta?.uuid || it?.uuid;
              if (u) alive.add(String(u));
            }
          };
          add(doc.points);
          add(doc.lines);
          add(doc.aux);
          const nextSel = curSel.filter((u) => alive.has(u));
          if (nextSel.length !== curSel.length) {
            // Route through uiSelectionController when possible so dirty guards and downstream sync stay consistent.
            try {
              if (typeof selectionController?.setSelectionUuids === "function") {
                selectionController.setSelectionUuids(nextSel, null, "doc-prune");
              } else {
                core.setSelection?.(nextSel);
              }
            } catch {
              core.setSelection?.(nextSel);
            }
          }
        }
      } catch {}

      outlinerController.render(doc);
      toolbarController?.syncTabs?.();
      requestToolbarSync();
      fileController?.syncTitle?.();
      propertyController?.refreshActiveFromDoc?.();
      updatePreviewSelectionLabel();
      saveSidecar();
    }));

    unsubs.push(hub.on("dirty", () => {
      toolbarController?.syncTabs?.();
      requestToolbarSync();
      fileController?.syncTitle?.();
    }));

    unsubs.push(hub.on("title", () => {
      fileController?.syncTitle?.();
      requestToolbarSync();
    }));

    unsubs.push(hub.on("lock", () => {
      outlinerController.render(core.getDocument?.());
      propertyController?.refreshLockState?.();
      requestToolbarSync();
      saveSidecar();
    }));

    unsubs.push(hub.on("visibility", () => {
      outlinerController.render(core.getDocument?.());
      saveSidecar();
    }));

    unsubs.push(hub.on("outliner", () => {
      outlinerController.render(core.getDocument?.());
      saveSidecar();
    }));

    unsubs.push(hub.on("uistate", () => {
      try { toolbarController?.syncTabs?.(); } catch {}
      requestToolbarSync();
      saveSidecar();
    }));

    // selection -> property sync is intentionally unified here.
    // Re-entrancy is guarded because propertyController may revert selection synchronously.
    let handlingSelection = false;
    let pendingSelection = false;

    const inferTabForUuid = (doc, uuid) => {
      const u = String(uuid || "");
      if (!u || !doc) return null;
      const has = (arr) => Array.isArray(arr) && arr.some((it) => String(it?.meta?.uuid || it?.uuid || "") === u);
      if (has(doc.points)) return "points";
      if (has(doc.lines)) return "lines";
      if (has(doc.aux)) return "aux";
      return null;
    };

    const handleSelection = () => {
      if (handlingSelection) {
        pendingSelection = true;
        return;
      }
      handlingSelection = true;
      try {
        do {
          pendingSelection = false;
          const doc = core.getDocument?.();
          outlinerController.render(doc);
          propertyController?.syncFromSelection?.();
          updatePreviewSelectionLabel();

          // If a single item is selected, auto-switch activeTab so the Outliner stays consistent
          // with the selection source (Preview pick / QuickCheck jump / etc.).
          try {
            const sel = core.getSelection?.() || [];
            if (Array.isArray(sel) && sel.length === 1) {
              const want = inferTabForUuid(doc, sel[0]);
              const cur = core.getUiState?.().activeTab || "points";
              if (want && want !== cur) {
                core.setUiState?.({ activeTab: want });
                toolbarController?.syncTabs?.();
                outlinerController.render(doc);
              }
            }
          } catch {}

          // Ensure the selected row is visible (QuickCheck jump / Preview pick).
          try {
            const sel = core.getSelection?.() || [];
            if (Array.isArray(sel) && sel.length === 1) outlinerController.revealUuid?.(sel[0]);
          } catch {}

          try {
            const sel = core.getSelection?.() || [];
            const tool = String(core.getUiState?.().activeTool || "select").toLowerCase();
            if (tool === "move" && (!Array.isArray(sel) || sel.length !== 1)) {
              core.setUiState?.({ activeTool: "select" });
            }
          } catch {}

          requestToolbarSync();
        } while (pendingSelection);
      } finally {
        handlingSelection = false;
      }
    };

    unsubs.push(hub.on("selection", handleSelection));

  // --- focus (QuickCheck / error jump) ---
  // Ensure outliner row is visible even when selection is unchanged.
  {
    const handleFocus = (issue) => {
      try {
        const uuid = issue && typeof issue === "object" ? issue.uuid : null;
        const kind = issue && typeof issue === "object" ? issue.kind : null;
        if (uuid) outlinerController?.revealFlash?.(uuid, kind);
      } catch {}
    };
    // Focus event contract: packages/docs/docs/modeler/selection-contract.md
    unsubs.push(hub.on("focus", handleFocus));
  }


  }


  // --- boot ---
  startHub(hub);
  // The hub is started by default; reflect that in our throttling state.
  mainPreviewRunning = true;

  // Stop rendering when the embedded preview pane is collapsed (Focus Mode).
  // This reduces GPU usage while keeping the editor UI responsive.
  const syncPreviewRunState = () => {
    const collapsed = !!(root && root.classList && root.classList.contains("is-previewout-active"));
    ensureMainPreview(!collapsed);
  };

  try {
    const mo = new MutationObserver(() => syncPreviewRunState());
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    unsubs.push(() => { try { mo.disconnect(); } catch {} });
  } catch {}

  // Apply once on boot.
  syncPreviewRunState();
  toolbarController?.syncTabs?.();
  fileController?.syncTitle?.();
  outlinerController.render(core.getDocument?.());
  updatePreviewSelectionLabel();
  if (modelUrl) fileController.syncTitle?.();

  return { detach: cleanupUiShell };
}
