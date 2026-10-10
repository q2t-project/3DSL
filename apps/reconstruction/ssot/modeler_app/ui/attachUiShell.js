// ui/attachUiShell.js
// Modeler UI shell: DOM gather + controller instantiation + hub wiring only.

import { resizeHub, startHub } from "./hubOps.js";
import { createHubCoreControllers } from "./hubFacade.js";

import { createUiImportReviewController } from "./controllers/uiImportReviewController.js";
import { createUiFileController } from "./controllers/uiFileController.js";
import { createUiPropertyController } from "./controllers/uiPropertyController.js";
import { createUiContractPropertyController } from "./controllers/uiContractPropertyController.js";
import { createUiSelectionController } from "./controllers/uiSelectionController.js";
import { createUiToolbarController } from "./controllers/uiToolbarController.js";
import { UiOutlinerController } from "./controllers/uiOutlinerController.js";
import { createUiExplorationController } from "./controllers/uiExplorationController.js";

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
  let explorationController = null;

  const core = createHubCoreControllers(hub);
  const modelFirst = root.classList.contains("model-first-ui");

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
        if (cleaned || getDocUuid() !== docUuid) return;
        try {
          const payload = core.getUiSidecar?.();
          if (!payload) return;
          // Exploration is session state, not a persistent classification.
          if (payload.uiState) {
            payload.uiState = { ...payload.uiState, framePlaying: false };
            delete payload.uiState.explorationScope;
          }
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
  const pointsTbody = getRoleEl(root, "outliner-points-tbody");
  const linesTbody = getRoleEl(root, "outliner-lines-tbody");
  const pointsScroll = getRoleEl(root, "outliner-points-scroll");
  const linesScroll = getRoleEl(root, "outliner-lines-scroll");
  const fileLabel = getRoleEl(root, "file-label");
  const fileStatus = getRoleEl(root, "file-status");
  const hud = getRoleEl(root, "hud");
  const previewSelectionEl = getRoleEl(root, "preview-selection");

  const paneOutliner = getRoleEl(root, "pane-outliner");
  const paneProp = getRoleEl(root, "pane-prop");
  const paneQc = getRoleEl(root, "pane-qc");
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
  const setHud = (msg) => { if (hud) { hud.textContent = String(msg ?? ""); hud.hidden = false; } };
  const workStatus = getRoleEl(root, "work-status");
  const workSummary = getRoleEl(root, "work-summary");
  const workDetails = getRoleEl(root, "work-details");
  const updateWorkStatus = () => {
    const work = hub.getWorkPackage?.();
    if (workStatus) {
      workStatus.hidden = !work;
      if (!work) { workStatus.open = false; root.classList.remove("is-comparison-open"); }
    }
    const comparisonButton = root.querySelector('[data-ui-action="toggle-comparison"]');
    if (comparisonButton) comparisonButton.disabled = !work;
    syncModelFirstControls();
    if (btnSave) btnSave.textContent = work ? "保存 一式" : "保存";
    if (btnSaveAs) btnSaveAs.textContent = work ? "別名保存 一式…" : "別名保存…";
    if (workDetails) workDetails.textContent = "";
    if (!work) return;
    const result = hub.getWorkComparison?.();
    const counts = result?.counts || {};
    if (workSummary) workSummary.textContent = `編集前と比較 — 変更 ${counts.changed || 0} 要素・追加 ${counts.added || 0}・削除 ${counts.removed || 0}・作品情報 ${counts.metadataChanged || 0} 項目`;
    if (!workDetails) return;
    const append = (parent, tag, text, className) => {
      const el = document.createElement(tag);
      if (className) el.className = className;
      el.textContent = text;
      parent.appendChild(el);
      return el;
    };
    append(workDetails, "p", result?.notice || "元の原文・対応記録は編集前の図に対応しています。変更は意味の改訂として未採用です。", "work-notice");
    if (!result) {
      append(workDetails, "p", "比較情報を取得できませんでした。", "work-notice");
      return;
    }
    const beforeScene = work.baselineScene;
    const afterScene = core.getDocument?.() || work.scene;
    const index = (scene) => new Map(["points", "lines", "aux"].flatMap(kind => (scene?.[kind] || []).map(element => [element.meta?.uuid || element.uuid, { kind, element }])));
    const before = index(beforeScene), after = index(afterScene);
    const plainLabel = value => typeof value === "string" ? value : value?.ja || value?.en || value?.default || "";
    const label = element => plainLabel(element?.appearance?.marker?.text?.content)
      || plainLabel(element?.signification?.caption) || plainLabel(element?.signification?.name) || "（ラベルなし）";
    const at = (value, path) => path ? path.split(".").reduce((item, key) => item != null && Object.prototype.hasOwnProperty.call(item, key) ? item[key] : undefined, value) : value;
    const display = value => {
      if (value === undefined) return "（なし）";
      const text = typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value, null, 2);
      return text.length > 1200 ? `${text.slice(0, 1200)}…（あと ${text.length - 1200} 文字は省略）` : text;
    };
    const rows = [];
    let total = 0;
    const addRow = row => { total++; if (rows.length < 20) rows.push(row); };
    for (const item of result.changed || []) for (const path of item.fields || []) {
      const oldEntry = before.get(item.id), newEntry = after.get(item.id);
      addRow({ type: "変更", id: item.id, label: label(newEntry?.element || oldEntry?.element), path,
        before: path === "element-kind" ? oldEntry?.kind : at(oldEntry?.element, path),
        after: path === "element-kind" ? newEntry?.kind : at(newEntry?.element, path), sourceBound: item.sourceBound });
    }
    for (const item of result.added || []) addRow({ type: "追加", id: item.id, label: label(after.get(item.id)?.element), path: item.kind,
      before: undefined, after: after.get(item.id)?.element, sourceBound: item.sourceBound });
    for (const item of result.removed || []) addRow({ type: "削除", id: item.id, label: label(before.get(item.id)?.element), path: item.kind,
      before: before.get(item.id)?.element, after: undefined, sourceBound: item.sourceBound });
    for (const path of result.metadataFields || []) addRow({ type: "作品情報", id: beforeScene?.document_meta?.document_uuid || "", label: "作品情報", path,
      before: at(beforeScene, path), after: at(afterScene, path), sourceBound: false });
    if (!total) {
      append(workDetails, "p", "編集前との差分はありません。", "work-count");
      return;
    }
    append(workDetails, "p", `差分 ${total} 項目のうち ${rows.length} 項目を表示${total > rows.length ? `（あと ${total - rows.length} 項目は省略）` : ""}。出典との対応がある変更: ${counts.sourceBoundChanged || 0} 要素。`, "work-count");
    const list = append(workDetails, "div", "", "work-change-list");
    for (const row of rows) {
      const item = append(list, "details", "", "work-change");
      const name = row.label.length > 120 ? `${row.label.slice(0, 120)}…` : row.label;
      append(item, "summary", `${row.type}：${name} — ${row.path}${row.sourceBound ? " — 意味未採用" : ""}`);
      append(item, "div", `UUID: ${row.id}`, "work-change-id");
      append(item, "div", `${row.path}${row.sourceBound ? "（原記録との対応あり・意味未採用）" : ""}`, "work-change-path");
      const values = append(item, "div", "", "work-change-values");
      const oldValue = append(values, "div", "", "work-value");
      append(oldValue, "strong", "編集前");
      append(oldValue, "pre", display(row.before));
      append(values, "span", "→", "work-change-arrow");
      const newValue = append(values, "div", "", "work-value");
      append(newValue, "strong", "現在");
      append(newValue, "pre", display(row.after));
    }
  };

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

  let inspectorKind = null;
  const updateInspectorTarget = (kind, label) => {
    if (!modelFirst) return;
    const target = root.querySelector('[data-ui-role="prop-target-label"]');
    if (target) target.textContent = label ? `${kind === "point" ? "点" : kind === "line" ? "線" : "補助"}：${label}` : "モデル上の要素を選択";
    const details = root.querySelector('[data-ui-role="prop-name-details"]');
    if (details && kind !== inspectorKind) details.open = kind === "line";
    const nameLabel = getRoleEl(root, "prop-name-label");
    if (nameLabel && kind) nameLabel.textContent = kind === "line" ? "表示文字" : "管理上の名前";
    inspectorKind = kind;
  };

  const updatePreviewSelectionLabel = () => {
    if (!previewSelectionEl) return;
    const sel = core.getSelection?.() || [];
    if (!Array.isArray(sel) || sel.length !== 1) {
      previewSelectionEl.hidden = true;
      previewSelectionEl.textContent = '';
      updateInspectorTarget(null, '');
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

    updateInspectorTarget(kind, label);
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


  // Model-first layout is UI state only: never change the document or fit the camera.
  function syncModelFirstControls() {
    if (!modelFirst) return;
    const listOpen = root.classList.contains("is-outliner-open");
    const comparisonOpen = root.classList.contains("is-comparison-open") && !!workStatus && !workStatus.hidden;
    if (paneOutliner) paneOutliner.hidden = !listOpen;
    if (splitterLeft) splitterLeft.hidden = !listOpen;
    for (const [action, open] of [["toggle-outliner", listOpen], ["toggle-check", qcPanel && !qcPanel.hidden], ["toggle-comparison", comparisonOpen]]) {
      for (const button of root.querySelectorAll(`[data-ui-action="${action}"]`)) {
        button.setAttribute("aria-expanded", String(!!open));
        button.classList.toggle("is-active", !!open);
      }
    }
    const tab = core.getUiState?.().activeTab === "lines" ? "lines" : "points";
    root.dataset.outlinerTab = tab;
    for (const kind of ["points", "lines"]) {
      const button = root.querySelector(`[data-ui-action="tab-${kind}"]`);
      if (button) {
        button.setAttribute("aria-selected", String(tab === kind));
        button.classList.toggle("is-active", tab === kind);
        button.tabIndex = tab === kind ? 0 : -1;
      }
    }
  }

  if (modelFirst) {
    root.classList.remove("is-outliner-open", "is-comparison-open");
    if (qcPanel) qcPanel.hidden = true;
    if (workStatus) workStatus.open = false;
    syncModelFirstControls();
    root.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-ui-action]");
      if (!button || button.disabled || !root.contains(button)) return;
      const action = button.dataset.uiAction;
      if (action === "toggle-outliner") {
        root.classList.toggle("is-outliner-open");
        if (root.classList.contains("is-outliner-open")) {
          root.querySelector('[data-role="exploration-query"]')?.focus?.();
        }
      } else if (action === "toggle-check") {
        if (qcPanel) qcPanel.hidden = !qcPanel.hidden;
        root.classList.remove("is-comparison-open");
        if (workStatus) workStatus.open = false;
      } else if (action === "toggle-comparison") {
        if (!workStatus || workStatus.hidden) return;
        const open = !root.classList.contains("is-comparison-open");
        root.classList.toggle("is-comparison-open", open);
        workStatus.open = open;
        if (qcPanel) qcPanel.hidden = true;
      } else if (action === "tab-points" || action === "tab-lines") {
        core.setUiState?.({ activeTab: action.slice(4) });
      }
      syncModelFirstControls();
    }, { signal: sig });
    root.addEventListener("keydown", (event) => {
      const tab = event.target.closest?.('[data-ui-action^="tab-"]');
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const kind = event.key === "Home" ? "points" : event.key === "End" ? "lines" : root.dataset.outlinerTab === "points" ? "lines" : "points";
      core.setUiState?.({ activeTab: kind });
      syncModelFirstControls();
      root.querySelector(`[data-ui-action="tab-${kind}"]`)?.focus?.();
    }, { signal: sig });
    // Validation and QuickCheck may open this panel through their existing paths.
    const panelObserver = new MutationObserver(() => {
      if (qcPanel && !qcPanel.hidden) {
        root.classList.remove("is-comparison-open");
        if (workStatus) workStatus.open = false;
      }
      syncModelFirstControls();
    });
    if (qcPanel) panelObserver.observe(qcPanel, { attributes: true, attributeFilter: ["hidden"] });
    unsubs.push(() => panelObserver.disconnect());
    workStatus?.addEventListener("toggle", () => {
      root.classList.toggle("is-comparison-open", !!workStatus.open && !workStatus.hidden);
      syncModelFirstControls();
    }, { signal: sig });
  }

  // Versioned width preferences intentionally ignore the old 580/430px layout.
  (function attachSplitters() {
    if (!root || !(root instanceof HTMLElement)) return;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const KEY_L = modelFirst ? "modeler.modelFirst.v1.outlinerW" : "modeler.paneOutlinerW";
    const KEY_R = modelFirst ? "modeler.modelFirst.v1.propertyW" : "modeler.paneQcW";
    const rightPane = modelFirst ? paneProp : paneQc;
    const rightVar = modelFirst ? "--pane-prop-w" : "--pane-qc-w";
    const leftRange = modelFirst ? [240, 360] : [260, 780];
    const rightRange = modelFirst ? [288, 400] : [260, 780];
    const readPx = (key, range) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw == null) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? clamp(n, ...range) : null;
      } catch { return null; }
    };
    const writePx = (key, n) => { try { localStorage.setItem(key, String(Math.round(n))); } catch {} };
    const initL = readPx(KEY_L, leftRange);
    const initR = readPx(KEY_R, rightRange);
    if (initL != null) root.style.setProperty("--pane-outliner-w", `${initL}px`);
    if (initR != null) root.style.setProperty(rightVar, `${initR}px`);
    let stopDrag = () => {};
    unsubs.push(() => stopDrag());
    const startDrag = (which, ev) => {
      if (ev.button !== 0) return;
      const target = ev.currentTarget || ev.target;
      if (!(target instanceof HTMLElement)) return;
      ev.preventDefault();
      stopDrag();
      const startX = ev.clientX;
      const startWidth = (which === "left" ? paneOutliner : rightPane)?.getBoundingClientRect?.().width || (which === "left" ? 280 : 320);
      const range = which === "left" ? leftRange : rightRange;
      const variable = which === "left" ? "--pane-outliner-w" : rightVar;
      const key = which === "left" ? KEY_L : KEY_R;
      target.classList.add("is-dragging");
      try { target.setPointerCapture(ev.pointerId); } catch {}
      const onMove = (e) => {
        const next = clamp(startWidth + (e.clientX - startX) * (which === "left" ? 1 : -1), ...range);
        root.style.setProperty(variable, `${next}px`);
        writePx(key, next);
      };
      const onUp = () => {
        target.classList.remove("is-dragging");
        target.removeEventListener("pointermove", onMove);
        for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) target.removeEventListener(name, onUp);
        try { if (target.hasPointerCapture?.(ev.pointerId)) target.releasePointerCapture(ev.pointerId); } catch {}
        stopDrag = () => {};
      };
      stopDrag = onUp;
      target.addEventListener("pointermove", onMove, { signal: sig });
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) target.addEventListener(name, onUp, { signal: sig });
    };
    splitterLeft?.addEventListener("pointerdown", (ev) => startDrag("left", ev), { signal: sig });
    splitterRight?.addEventListener("pointerdown", (ev) => startDrag("right", ev), { signal: sig });
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

  /** @type {ReturnType<typeof createUiPropertyController> | null} */
  let propertyController = null;

  propertyController = createUiPropertyController({
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

  propertyController = createUiContractPropertyController({
    root, hub, core, legacy: propertyController, signal: sig, setHud,
    onDirtyChange: () => { fileController?.syncTitle?.(); requestToolbarSync(); },
  });

  const importReviewMount = document.createElement('section');
  importReviewMount.setAttribute('data-role', 'import-review');
  importReviewMount.style.cssText = 'padding:10px;border:1px solid #65809b;border-radius:6px;margin:8px;';
  const propertyPanel = root.querySelector('[data-role="pane-prop"] .pane-body');
  (propertyPanel || root).prepend(importReviewMount);
  const importReviewController = createUiImportReviewController({core,hub,mountEl:importReviewMount,setHud});
  unsubs.push(() => { importReviewController.dispose(); importReviewMount.remove(); });

  const renderStatus = document.createElement('details');
  renderStatus.hidden = true;
  renderStatus.style.cssText = 'padding:6px 10px;color:#ffd79c;';
  renderStatus.setAttribute('data-role', 'render-capability');
  root.querySelector('.model-head')?.append(renderStatus);
  const syncRenderStatus = () => {
    const warnings = hub.getRenderDiagnostics?.()?.unsupported || [];
    renderStatus.hidden = !warnings.length;
    renderStatus.replaceChildren();
    if (!warnings.length) return;
    const summary = document.createElement('summary');
    summary.textContent = `簡略表示 ${warnings.length}件 — 表示形状の一致は未対応`;
    renderStatus.append(summary);
    const items = document.createElement('ul');
    for (const warning of warnings) {
      const item = document.createElement('li');
      item.textContent = `${warning.uuid || ''}: ${warning.feature}${warning.value ? ' / ' + warning.value : ''}`;
      items.append(item);
    }
    renderStatus.append(items);
  };
  unsubs.push(hub.on('document', syncRenderStatus));
  unsubs.push(() => renderStatus.remove());
  syncRenderStatus();

  function getSelectedSet() {
    return new Set(core.getSelection?.() || []);
  }

  const outlinerController = new UiOutlinerController({
    root,
    pointsTbody,
    linesTbody,
    pointsScroll,
    linesScroll,
    core,
    signal: sig,
    getExploration: () => explorationController,
    syncTabButtons: () => toolbarController?.syncTabs?.(),
    getSelectedSet,
    onRowSelect: (issueLike, ev) => explorationController
      ? explorationController.navigateSelection(issueLike, ev, () => selectionController?.selectFromOutliner?.(issueLike, ev))
      : selectionController?.selectFromOutliner?.(issueLike, ev),
    ensureEditsAppliedOrConfirm: () => propertyController.ensureEditsAppliedOrConfirm(),
    requestToolbarSync,
    setHud,
    setSelectionUuids,
  });

  selectionController = createUiSelectionController({
    core,
    ensureEditsAppliedOrConfirm: () => propertyController.ensureEditsAppliedOrConfirm(),
    setHud,
    getOutlinerRowOrder: () => outlinerController.getRowOrder?.() || [],
    flashOutlinerRow: (args) => {
      try { return outlinerController.revealUuid?.(args?.uuid, args?.tab === "lines" ? "lines" : args?.tab === "points" ? "points" : ""); } catch {}
      return false;
    },
    focusFieldByIssue: (issueLike) => {
      try { propertyController.focusFieldByIssue?.(issueLike); } catch {}
    },
  });

  fileController = createUiFileController({
    core,
    elements: { fileLabel, fileStatus, btnSave, btnSaveAs, btnExport, qcPanel, qcSummary, qcList },
    onStateChange: requestToolbarSync,
    appTitle: APP_TITLE,
    setHud,
    getWorkPackage: () => hub.getWorkPackage?.() || null,
    prepareWorkPackage: (scene, work) => hub.prepareWorkPackage(scene, work),
    validateWorkPackage: (work) => hub.validateWorkPackage(work),
    onQuickCheckPick: (issueLike) => {
      // QuickCheck click: always go through selection SSOT (flash + focus).
      try { selectionController?.selectIssue?.(issueLike); } catch {}
    },
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
    prepareOpenedDocument: (raw) => hub.prepareOpenedDocument(raw),
    onDocumentOpened: (result) => hub.acceptOpenedDocument(result),
    onNewDocument: () => hub.clearWorkPackage(),
  });

  explorationController = createUiExplorationController({
    root, core, signal: sig, setHud,
    ensureEditsAppliedOrConfirm: () => propertyController.ensureEditsAppliedOrConfirm({ reason: "explore" }),
    renderOutliner: () => outlinerController.render(core.getDocument?.()),
    getViewState: async () => ({ main: hub.getViewState?.(), external: await toolbarController.capturePreviewOutView?.() }),
    setViewState: async (state) => {
      if (state?.main) hub.setViewState?.(state.main);
      if (state?.external) toolbarController.restorePreviewOutView?.(state.external);
    },
    applyScope: (ids) => core.setUiState?.({ explorationScope: ids }),
    setSelectionUuids,
    unplacedRecords: () => hub.getUnplacedSourceRecords?.() || [],
    getCorrespondingUuids: (uuid) => hub.getCorrespondingUuids?.(uuid) || [uuid],
  });
  unsubs.push(() => explorationController?.detach?.());

  const fitButton = root.querySelector('[data-action="fit-document"]');
  fitButton?.addEventListener("click", () => {
    hub.fitDocument?.();
    toolbarController.fitPreviewOut?.();
  }, { signal: sig });

  // --- Cross-controller wiring ---

  // Draft (unapplied) edits should only block Save/Export when there is an active item being edited.
  // Guard against edge cases where the property panel is not active but a stale dirty flag remains.
  fileController?.setExtraDirtyProvider?.(() => {
    try {
      const active = propertyController?.getActiveUuid?.();
      if (!active) return false;
      return !!propertyController?.isDirty?.();
    } catch {
      return false;
    }
  });
  fileController?.setInvoker?.((a) => toolbarController?.invoke?.(a));
  fileController?.attachBeforeUnload?.({ signal: sig });

  // --- Input wiring ---
  attachUiShortcutController({
    signal: sig,
    core,
    invoke: (a) => toolbarController?.invoke?.(a),
    deleteSelection: () => {
      if (!propertyController.handleDelete?.()) outlinerController.deleteSelection();
    },
    // Dispatch through the existing buttons: disabled state and the Outliner's
    // Property draft guard are identical for keyboard and pointer authoring.
    addPoint: () => root.querySelector('[data-action="add-point"]')?.click(),
    addLine: () => root.querySelector('[data-action="add-line"]')?.click(),
  });
  canvasCtl = canvas ? attachUiCanvasController({
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
      if (typeof selectionController.selectFromPick === "function") selectionController.selectFromPick(issueLike, ev);
      else selectionController.selectIssue(issueLike);
    },
    onResize: (args) => resizeHub(hub, args.width, args.height, args.dpr),
    hasPendingPropertyEdits: () => !!propertyController?.isDirty?.(),
    // Needed for Move tool helpers (e.g., wheel-based axis nudges / dimension overlay).
    ensureEditsAppliedOrConfirm: () => {
      try {
        return propertyController.ensureEditsAppliedOrConfirm({ reason: "move" });
      } catch {
        return false;
      }
    },
    setHud,
  }) : null;

  // --- hub events ---
  if (typeof hub?.on === "function") {
    unsubs.push(hub.on("document", (doc) => {
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
            // Route through unified selection bridge so dirty guards and downstream sync stay consistent.
            try { setSelectionUuids(nextSel, null, "doc-prune"); } catch {}
          }
        }
      } catch {}

      explorationController?.render?.(doc);
      outlinerController.render(doc);
      toolbarController?.syncTabs?.();
      requestToolbarSync();
      fileController?.syncTitle?.();
      propertyController?.refreshActiveFromDoc?.();
      updatePreviewSelectionLabel();
      updateWorkStatus();
      saveSidecar();
    }));

    // Restore local view preferences only when opening/replacing a document.
    // Edits/Undo must not replay old persisted visibility or selection state.
    unsubs.push(hub.on("document-replaced", ({ doc }) => {
      loadSidecar();
      core.setUiState?.({ framePlaying: false, explorationScope: null });
      explorationController?.render?.(doc, { reset: true });
      outlinerController.render(doc);
      updateWorkStatus();
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
      explorationController?.render?.(core.getDocument?.());
      outlinerController.render(core.getDocument?.());
      saveSidecar();
    }));

    unsubs.push(hub.on("uistate", () => {
      explorationController?.render?.(core.getDocument?.());
      syncModelFirstControls();
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
          explorationController?.render?.(doc);
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

    // Focus events are emitted by core (e.g. QuickCheck / Fix broken lines).
    unsubs.push(hub.on("focus", (issue) => {
      try {
        const uuid = String(issue?.uuid || "");
        const kind = String(issue?.kind || "");
        if (!uuid) return;
        outlinerController.revealUuid?.(uuid, kind === "line" ? "lines" : kind === "point" ? "points" : "");
      } catch {}
    }));

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
  loadSidecar();
  explorationController?.render?.(core.getDocument?.(), { reset: true });
  outlinerController.render(core.getDocument?.());
  updatePreviewSelectionLabel();
  updateWorkStatus();
  propertyController?.syncFromSelection?.();
  syncModelFirstControls();
  if (modelUrl) fileController.syncTitle?.();

  return { detach: cleanupUiShell };
}
