// ui/controllers/uiFileController.js
// File/title/dirty/beforeunload (UI layer only).
//
// Phase 3 (production-grade File I/O):
// - Save / Save As: keep handle when possible, overwrite on Save
// - Export: does NOT update Save destination; can mark clean (policy)
// - Strict validation gate: Save/SaveAs/Export require schema-OK; otherwise show errors
// - Failures: keep dirty, notify, provide retry paths
// - Fallback: download when FSA is unavailable or fails

function dl(name, text) {
  const payload = String(text ?? "");
  if (!payload) throw new Error("dl: empty payload");
  const fn = String(name || "untitled.3dss.json");
  const url =
    "data:application/json;charset=utf-8," +
    encodeURIComponent(payload);
  const a = document.createElement("a");
  a.href = url;
  a.download = fn;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    try { a.remove(); } catch {}
  }
}

function reportErr(prefix, err) {
  try {
    const name = err && err.name ? String(err.name) : "";
    const msg = err && err.message ? String(err.message) : String(err);
    console.error(`${prefix}${name ? " [" + name + "]" : ""}: ${msg}`, err);
  } catch {}
}
function ensureExt(name, ext) {
  const s = String(name || "").trim();
  if (!s) return "model" + ext;
  const low = s.toLowerCase();
  return low.endsWith(ext) ? s : s + ext;
}

function basenameLike(name) {
  const s = String(name || "").trim();
  if (!s) return "";
  return s.split(/[/\\]+/).pop() || "";
}

function sanitizeFileStem(name) {
  // Keep it filesystem-agnostic and safe for downloads on major OSes.
  // - Remove path components
  // - Replace Windows forbidden chars + control chars
  // - Trim dots/spaces
  const raw = basenameLike(name);
  if (!raw) return "";
  const noCtl = raw.replace(/[\u0000-\u001F\u007F]/g, "_");
  const noBad = noCtl.replace(/[<>:"|?*]/g, "_");
  const noSep = noBad.replace(/[\/\\]/g, "_");
  return noSep.replace(/[\s.]+$/g, "").replace(/^[\s.]+/g, "");
}

function buildSuggestedName({ base, kind }) {
  const stem0 = sanitizeFileStem(base) || "model";
  const stem = stem0.replace(/\.json$/i, "");
  if (kind === "export") {
    // Avoid double-suffixing.
    const b = stem.replace(/\.export$/i, "");
    return `${b || "model"}.export.json`;
  }
  return `${stem || "model"}.json`;
}

function isAbortError(err) {
  const name = err && typeof err === "object" ? err.name : "";
  return name === "AbortError";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderIssuesToQuickCheck({ issues, qcPanel, qcSummary, qcList, onSelectIssue }) {
  if (qcSummary) qcSummary.textContent = `${issues.length} issues`;
  if (!qcList) return;
  qcList.textContent = "";
  for (const it of issues) {
    const item = document.createElement("div");
    item.className = "qc-item";
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.style.cursor = "pointer";
    if (onSelectIssue) {
      item.addEventListener("click", () => onSelectIssue(it));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectIssue(it);
        }
      });
    }

    const sev = it?.severity || "error";
    const sevClass = sev === "error" ? "qc-sev-error" : sev === "warn" ? "qc-sev-warn" : "qc-sev-info";

    const line1 = document.createElement("div");
    line1.className = "qc-line1";
    line1.innerHTML = `<span class="${sevClass}">${escapeHtml(sev)}</span><code>${escapeHtml(it?.uuid || "schema")}</code><code>${escapeHtml(it?.path || "/")}</code>`;
    item.appendChild(line1);

    const msg = document.createElement("div");
    msg.className = "qc-msg";
    msg.textContent = it?.message || "(no message)";
    item.appendChild(msg);

    qcList.appendChild(item);
  }
  if (qcPanel) qcPanel.hidden = false;
}

/**
 * @param {{
 *  core: any,
 *  elements: {
 *    fileLabel: HTMLElement|null,
 *    btnSave: HTMLButtonElement|null,
 *    btnSaveAs: HTMLButtonElement|null,
 *    btnExport: HTMLButtonElement|null,
 *    qcPanel?: HTMLElement|null,
 *    qcSummary?: HTMLElement|null,
 *    qcList?: HTMLElement|null,
 *  },
 *  appTitle: string,
 *  setHud: (msg: string) => void,
 * }} deps
 */
export function createUiFileController(deps) {
  const { core, elements, selectionController, appTitle, setHud } = deps;
  const { fileLabel, btnSave, btnSaveAs, btnExport, qcPanel, qcSummary, qcList } = elements || {};
  let extraDirty = null;
  let invoker = null;

  function defaultSaveName() {
    // Prefer the last known file label/handle name.
    const base = (
      core?.getSaveLabel?.() ||
      core?.getDocumentLabel?.() ||
      core?.getDisplayLabel?.() ||
      core?.getSaveHandle?.()?.name ||
      core?.getFileHandle?.()?.name ||
      "model.json"
    );
    return buildSuggestedName({ base, kind: "save" });
  }

  function defaultExportName() {
    const base = (
      core?.getSaveLabel?.() ||
      core?.getDocumentLabel?.() ||
      core?.getDisplayLabel?.() ||
      core?.getSaveHandle?.()?.name ||
      core?.getFileHandle?.()?.name ||
      "model.json"
    );
    return buildSuggestedName({ base, kind: "export" });
  }

  function isCoreDirty() {
    return !!core?.isDirty?.();
  }

  function isExtraDirty() {
    return !!(extraDirty && extraDirty());
  }

  function isDirty() {
    return isCoreDirty() || isExtraDirty();
  }

function syncTitle() {
    const baseLabel = core?.getDisplayLabel?.() || core?.getDocumentLabel?.() || "(no file)";
    const hasDoc = !!core?.getDocument?.();
    const coreDirty = hasDoc && isCoreDirty();
    const extra = hasDoc && isExtraDirty();

    const suffix = `${extra ? " (unapplied)" : ""}${coreDirty ? " (unsaved)" : ""}`;
    const label = `${baseLabel}${suffix}`;
    if (fileLabel) fileLabel.textContent = label;
    try { document.title = core?.getWindowTitle?.() || `${baseLabel} - ${appTitle}`; } catch {}

    // Save semantics:
    // - Save/SaveAs should be blocked while there are unapplied (draft) edits.
    // - Save is only meaningful when core (applied) state is dirty.
    const canWrite = hasDoc && !extra;
    if (btnSave) btnSave.disabled = !(canWrite && coreDirty);
    if (btnSaveAs) btnSaveAs.disabled = !canWrite;
    if (btnExport) btnExport.disabled = !canWrite;

    try {
      if (btnSave) {
        btnSave.title = !hasDoc ? "Open a file first" : (extra ? "Apply edits before Save" : (coreDirty ? "Save (overwrite)" : "No changes to save"));
      }
      if (btnSaveAs) {
        btnSaveAs.title = !hasDoc ? "Open a file first" : (extra ? "Apply edits before Save As" : "Save As (choose file)" );
      }
      if (btnExport) {
        // NOTE: Export uses strict normalization and clears dirty (same as Save/SaveAs).
        btnExport.title = !hasDoc ? "Open a file first" : (extra ? "Apply edits before Export" : "Export (marks clean)" );
      }
    } catch {}
  }

  function confirmDiscardIfDirty(reason = "this") {
    if (!isDirty()) return true;
    return window.confirm(`Discard unsaved changes before ${reason}?`);
  }

  function canUseOpenFsa() {
    return typeof window !== "undefined" && typeof window.showOpenFilePicker === "function";
  }

  function canUseSaveFsa() {
    return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
  }

  async function withFocusRestore(fn) {
    const active = document.activeElement;
    try { return await fn(); }
    finally { try { active && active.focus && active.focus(); } catch {} }
  }

  function setExtraDirtyProvider(fn) {
    extraDirty = typeof fn === "function" ? fn : null;
  }

  function setInvoker(fn) {
    invoker = typeof fn === "function" ? fn : null;
  }

  function showStrictErrors(errors) {
    const list = Array.isArray(errors) ? errors : [];
    const issues = list.map((e) => ({
      severity: "error",
      uuid: "schema",
      path: e?.instancePath || e?.schemaPath || "/",
      message: e?.message || String(e || "Schema error"),
      kind: "schema",
    }));
    try {
      if (qcPanel) qcPanel.dataset.source = "schema";
    } catch {}
    renderIssuesToQuickCheck({ issues, qcPanel, qcSummary, qcList, onSelectIssue: (it) => selectionController?.selectIssue?.(it) });
  }

  // IMPORTANT: keep this synchronous.
  // File picker / programmatic download often require a direct user activation.
  // Any `await` before invoking them can break the gesture and make SaveAs/Export
  // appear to do nothing.
  function ensureStrictOk(doc) {
    // UI policy (Modeler Beta I/O): Save/SaveAs/Export are *strictly* gated.
    // core.validateStrict() is best-effort (it returns true when AJV isn't loaded),
    // so we must explicitly require the validator to be ready.
    const ready = !!core?.isValidatorReady?.();
    if (!ready) {
      // Kick off initialization (best-effort), but don't await.
      try { core.ensureValidatorInitialized?.(); } catch {}
      showStrictErrors([{ message: "AJV validator is unavailable (vendor not loaded)." }]);
      setHud("Validation unavailable: cannot save/export");
      return false;
    }

    const ok = !!core.validateStrict?.(doc);
    if (ok) return true;
    showStrictErrors(core.getStrictErrors?.() ?? []);
    setHud("Validation failed: fix issues before saving");
    return false;
  }

  async function writeToHandle(handle, jsonText) {
  const text = String(jsonText ?? "");
  if (!text) throw new Error("writeToHandle: empty jsonText");

  // Non-destructive overwrite:
  // - keepExistingData:true to avoid early truncate-to-zero
  // - write at position 0
  // - truncate to final length (removes tail if shorter than old file)
  // - verify size
  // @ts-ignore
  const writable = await handle.createWritable({ keepExistingData: true });
  try {
    // @ts-ignore
    await writable.write({ type: "write", position: 0, data: text });
    await writable.truncate(text.length);
    await writable.close();
  } catch (e) {
    try { await writable.abort(); } catch {}
    throw e;
  }

  try {
    const f = await handle.getFile();
    if ((f?.size ?? 0) !== text.length) {
      throw new Error(`writeToHandle: size mismatch (got ${f?.size ?? 0}, expected ${text.length})`);
    }
  } catch (e) {
    // If getFile is unavailable or inconsistent, surface as failure so caller can handle.
    throw e;
  }
}

async function pickSaveHandle({ suggestedName }) {
    // @ts-ignore
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        { description: "3DSS JSON", accept: { "application/json": [".json"] } },
      ],
    });
    return handle;
  }

  async function handleFileAction(action, { ensureEditsApplied, getFallbackDocument } = {}) {
    const act = String(action || "").toLowerCase();
    // Prefer core document; fall back to a hub-provided cache when available.
    // This keeps Save/Export usable even if the UI is currently driven by hub events.
    const doc0 = core?.getDocument?.() ?? null;
    const doc = doc0 || (typeof getFallbackDocument === "function" ? (getFallbackDocument() ?? null) : null);
    if (!doc) { setHud("Save blocked: no document"); return; }
    if (ensureEditsApplied && !ensureEditsApplied()) { setHud("Save blocked: apply edits first"); return; }

    let jsonText = JSON.stringify(doc, null, 2);
    if (typeof jsonText !== "string" || jsonText.length === 0) {
      throw new Error("Export produced empty JSON");
    }
    console.log("[file] json chars=", jsonText ? jsonText.length : 0, "act=", act);

    // --- Export ---
    if (act === "export") {
  // Export: download only (does NOT affect Save destination or dirty state).
  if (!doc) throw new Error("No document");
  const suggestedName = `${(core.getSuggestedSaveName?.() || "untitled")}.3dss.json`;

  await core.ensureValidatorInitialized?.();
  if (!ensureStrictOk(doc)) {
    setHud("Export blocked: schema invalid");
    return;
  }

  const fn = suggestedName;
  dl(fn, jsonText);
  setHud(`Exported (download): ${fn}`);
  return;
}

    // --- Save / SaveAs ---
    if (act === "save" || act === "saveas") {
      if (!doc) throw new Error("No document");
      const suggestedName = `${core.getSuggestedSaveName?.() || "untitled"}.3dss.json`;
      const canFsa = canUseSaveFsa();

      let handle = core.getSaveHandle?.() || null;

      // Save As (or first Save) needs a picker. Do it BEFORE any awaited work so user activation is preserved.
      if (act === "saveas" || (act === "save" && !handle)) {
        if (canFsa) {
          try {
            handle = await withFocusRestore(() => pickSaveHandle({ suggestedName }));
          } catch (e) {
            if (e && (e.name === "AbortError" || e.code === 20)) {
              setHud(act === "saveas" ? "Save As cancelled" : "Save cancelled");
              return;
            }
            throw e;
          }
} else {
  // No FSA available: do not attempt download as a substitute for Save/SaveAs.
  // (Export is the only download-based path.)
  setHud(act === "saveas" ? "Save As unavailable (no File System Access)" : "Save unavailable (no File System Access)");
  return;
}
      }

      await core.ensureValidatorInitialized?.();
      if (!ensureStrictOk(doc)) {
        setHud(act === "saveas" ? "Save As blocked: schema invalid" : "Save blocked: schema invalid");
        return;
      }

      if (canFsa && handle) {
        try {
await writeToHandle(handle, jsonText);
// Keep handle for subsequent Save (both SaveAs and first Save that picked a handle).
core.setSaveHandle?.(handle);
          setHud(act === "saveas" ? `Saved As: ${handle?.name || suggestedName}` : `Saved: ${handle?.name || suggestedName}`);
          core.setDirty?.(false);
          return;
} catch (e) {
  console.error("[file] save write failed", e);
  // If Save As failed, do not keep the new handle.
  if (act === "saveas") core.clearSaveHandle?.();
  setHud(act === "saveas" ? "Save As failed" : "Save failed");
  return;
}
      }
// No handle available.
setHud(act === "saveas" ? "Save As unavailable" : "Save unavailable");
return;
    }

    // Unknown action
    setHud(`Unknown file action: ${act}`);
  }

  function attachBeforeUnload({ signal } = {}) {
    const opts = { capture: true };
    if (signal) opts.signal = signal;
    window.addEventListener("beforeunload", (ev) => {
      if (!isDirty()) return;
      ev.preventDefault();
      ev.returnValue = "";
    }, opts);
  }

  return {
    isDirty,
    isCoreDirty,
    isExtraDirty,
    syncTitle,
    confirmDiscardIfDirty,
    canUseOpenFsa,
    canUseSaveFsa,
    // legacy alias used by toolbar open path
    canUseFsa: canUseOpenFsa,
    withFocusRestore,
    handleFileAction,
    attachBeforeUnload,
    setExtraDirtyProvider,
    setInvoker,
  };
}
