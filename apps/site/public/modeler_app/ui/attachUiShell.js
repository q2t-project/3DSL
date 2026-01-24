// ui/attachUiShell.js
// Minimal P0 shell wiring for index.html (outliner / preview / quickcheck panel)

import { resizeHub, startHub } from "./hubOps.js";

function getRoleEl(root, role) {
  const el = root.querySelector(`[data-role="${role}"]`);
  return el || null;
}

function clampDpr(dpr) {
  const v = Number(dpr);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.max(1, Math.min(2, v));
}

export function attachUiShell({ root, hub, modelUrl }) {
  const canvas = /** @type {HTMLCanvasElement} */ (getRoleEl(root, "modeler-canvas"));
  const thead = getRoleEl(root, "outliner-thead");
  const tbody = getRoleEl(root, "outliner-tbody");
  const fileLabel = getRoleEl(root, "file-label");
  const btnSave = root.querySelector('[data-action="save"]');
  const btnSaveAs = root.querySelector('[data-action="saveas"]');
  const btnExport = root.querySelector('[data-action="export"]');

function downloadText({ text, filename, mime = "application/octet-stream" }) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalize3dssJsonName(name) {
  const base = name && name !== "(unsaved)" && name !== "(no file)" ? name : "model.3dss.json";
  if (base.endsWith(".3dss.json")) return base;
  if (base.endsWith(".json")) return base.replace(/\.json$/i, ".3dss.json");
  return base + ".3dss.json";
}

function updateToolbar() {
  const doc = hub?.core?.document?.get?.() ?? null;
  const label = hub?.core?.document?.getLabel?.() ?? "";
  const hasDoc = !!doc;

  // For dev ergonomics: enable Save/SaveAs/Export as long as a document is loaded.
  // "Save" will just download with current label (fallback if unknown).
  const canSave = hasDoc;
  const canSaveAs = hasDoc;
  const canExport = hasDoc;

  if (btnSave) btnSave.disabled = !canSave;
  if (btnSaveAs) btnSaveAs.disabled = !canSaveAs;
  if (btnExport) btnExport.disabled = !canExport;

  if (fileLabel) fileLabel.textContent = label || (hasDoc ? "(unsaved)" : "(no file)");
}

  const hud = getRoleEl(root, "hud");
  const fileInput = /** @type {HTMLInputElement} */ (getRoleEl(root, "file-input"));

  const qcPanel = getRoleEl(root, "qc-panel");
  const qcSummary = getRoleEl(root, "qc-summary");
  const qcList = getRoleEl(root, "qc-list");

  // ---- resize ----
  function doResize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const dpr = clampDpr(window.devicePixelRatio || 1);
    resizeHub(hub, Math.floor(r.width), Math.floor(r.height), dpr);
  }

  const ro = new ResizeObserver(() => doResize());
  if (canvas) ro.observe(canvas);
  window.addEventListener("resize", doResize);

  // ---- toolbar ----
  root.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const act = t.getAttribute("data-action");
    if (!act) return;

    if (act === "quickcheck") {
      const issues = hub?.core?.quickcheck?.run?.() || [];
      renderQuickCheck(issues);
      if (qcPanel) qcPanel.hidden = false;
      return;
    }
    if (act === "qc-close") {
      if (qcPanel) qcPanel.hidden = true;
      return;
    }
    if (act === "open") {
      if (fileInput) fileInput.click();
      return;
    }
    if (act === "prop-cancel") {
      const empty = getRoleEl(root, "prop-empty");
      const panel = getRoleEl(root, "prop-panel");
      if (panel) panel.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (act === "save" || act === "saveas" || act === "export" || act === "prop-save") {
  const doc = hub?.core?.document?.get?.();
  if (!doc) {
    hud && (hud.textContent = "No document loaded");
    return;
  }

  // Always run QuickCheck first; block output on errors.
  const issues = hub.core.quickcheck.run();
  renderQuickCheck(issues);
  if (qcPanel) qcPanel.hidden = false;

  const hasError = issues.some((it) => it && it.severity === "error");
  if (hasError) {
    hud && (hud.textContent = "Blocked: fix errors (see QuickCheck)");
    return;
  }

  const label = hub?.core?.document?.getLabel?.() || "(unsaved)";

  let filename = null;
  if (act === "save") {
    filename = normalize3dssJsonName(label);
    if (!filename || filename === "(unsaved)" || filename === "(no file)") {
      hud && (hud.textContent = "Use Save As...");
      return;
    }
  } else if (act === "saveas") {
    const proposed = normalize3dssJsonName(label);
    filename = window.prompt("Save As...", proposed);
    if (!filename) return;
  } else {
    // export / prop-save
    filename = normalize3dssJsonName(label);
  }

  // Ensure reasonable extension
  if (!/\.json$/i.test(filename)) filename += ".json";

  const text = JSON.stringify(doc, null, 2) + "\n";
  downloadText({ text, filename, mime: "application/json" });
  hud && (hud.textContent = `Saved: ${filename}`);
  return;
}
  });

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const doc = JSON.parse(text);
        hub?.core?.document?.set?.(doc, { source: "file", label: f.name });
        if (fileLabel) fileLabel.textContent = f.name;
      } catch (e) {
        hud && (hud.textContent = "Open failed: " + String(e?.message || e));
      } finally {
        fileInput.value = "";
      }
    });
  }

  // ---- outliner (minimal) ----
  function renderOutliner(doc) {
    if (!tbody) return;
    tbody.textContent = "";

    const tab = hub?.core?.uiState?.get?.().activeTab || "points";
    const locked = new Set(hub?.core?.lock?.list?.() || []);

    const rows = [];
    if (tab === "points" && doc && Array.isArray(doc.points)) rows.push(...doc.points.map((x) => ({ kind: "point", node: x })));
    if (tab === "lines" && doc && Array.isArray(doc.lines)) rows.push(...doc.lines.map((x) => ({ kind: "line", node: x })));
    if (tab === "aux" && doc && Array.isArray(doc.aux)) rows.push(...doc.aux.map((x) => ({ kind: "aux", node: x })));

    for (const r of rows) {
      const uuid = r?.node?.meta?.uuid || r?.node?.uuid || "";
      const name = r?.node?.signification?.name || r?.node?.name || "";
      const pos = r?.node?.appearance?.position || r?.node?.position || [0, 0, 0];
      const x = Array.isArray(pos) ? pos[0] : 0;
      const y = Array.isArray(pos) ? pos[1] : 0;
      const z = Array.isArray(pos) ? pos[2] : 0;

      const tr = document.createElement("tr");
      tr.dataset.uuid = uuid;
      tr.dataset.kind = r.kind;
      tr.dataset.locked = locked.has(uuid) ? "true" : "false";

      const tdLock = document.createElement("td");
      tdLock.className = "col-lock";
      tdLock.textContent = locked.has(uuid) ? "🔒" : "";
      tr.appendChild(tdLock);

      const tdName = document.createElement("td");
      tdName.textContent = name;
      tr.appendChild(tdName);

      const tdX = document.createElement("td");
      tdX.className = "col-num";
      tdX.textContent = String(x ?? 0);
      tr.appendChild(tdX);

      const tdY = document.createElement("td");
      tdY.className = "col-num";
      tdY.textContent = String(y ?? 0);
      tr.appendChild(tdY);

      const tdZ = document.createElement("td");
      tdZ.className = "col-num";
      tdZ.textContent = String(z ?? 0);
      tr.appendChild(tdZ);

      const tdUuid = document.createElement("td");
      tdUuid.className = "col-uuid";
      tdUuid.textContent = uuid ? String(uuid).slice(0, 8) : "";
      tr.appendChild(tdUuid);

      tr.addEventListener("click", () => {
        if (!uuid) return;
        hub?.core?.selection?.set?.([uuid]);
        showProperty({ uuid, kind: r.kind, path: "/" });
      });

      tbody.appendChild(tr);
    }
  }

  function showProperty({ uuid, kind, path }) {
    const empty = getRoleEl(root, "prop-empty");
    const panel = getRoleEl(root, "prop-panel");
    const u = getRoleEl(root, "prop-uuid");
    const k = getRoleEl(root, "prop-kind");
    const p = getRoleEl(root, "prop-path");

    if (panel) panel.hidden = false;
    if (empty) empty.hidden = true;
    if (u) u.textContent = String(uuid || "");
    if (k) k.textContent = String(kind || "");
    if (p) p.textContent = String(path || "");
  }

  function renderQuickCheck(issues) {
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
      line1.innerHTML = `<span class="${sevClass}">${sev}</span><code>${escapeHtml(it?.uuid || "doc")}</code><code>${escapeHtml(it?.path || "/")}</code>`;
      item.appendChild(line1);

      const msg = document.createElement("div");
      msg.className = "qc-msg";
      msg.textContent = it?.message || "(no message)";
      item.appendChild(msg);

      item.addEventListener("click", () => {
        if (typeof hub?.core?.focusByIssue === "function") hub.core.focusByIssue(it);
        else if (it?.uuid) showProperty({ uuid: it.uuid, kind: it.kind || "unknown", path: it.path || "/" });
      });

      qcList.appendChild(item);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- tabs ----
  root.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tab = t.getAttribute("data-tab");
    if (!tab) return;
    hub?.core?.uiState?.set?.({ activeTab: tab });
    // update active class
    root.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("tab-active"));
    t.classList.add("tab-active");
    renderOutliner(hub?.core?.document?.get?.());
  });

  // ---- selection sync (preview pick) ----
  if (typeof hub?.on === "function") {
    hub.on("picked", (hit) => {
      if (!hit || !hit.uuid) return;
      showProperty({ uuid: hit.uuid, kind: hit.kind || "unknown", path: "/" });
      renderOutliner(hub?.core?.document?.get?.());
    });
    hub.on("document", (doc) => { renderOutliner(doc); updateToolbar(); });
    hub.on("lock", () => renderOutliner(hub?.core?.document?.get?.()));
    hub.on("selection", () => renderOutliner(hub?.core?.document?.get?.()));
  }

  // ---- boot ----
  doResize();
  startHub(hub);
  updateToolbar();
  renderOutliner(hub?.core?.document?.get?.());

  if (modelUrl && fileLabel) fileLabel.textContent = modelUrl;
}
