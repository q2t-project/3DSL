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
  const b = new Blob([text], { type: "application/json" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);

  // NOTE: Some environments can produce a 0-byte download if we revoke the
  // object URL too early. Do not revoke immediately; delay cleanup.
  // (A tiny leak is preferable to corrupting the user's file.)
  try {
    // Prefer a trusted click path.
    a.click();
  } catch {
    // Fallback for some browsers.
    try { a.dispatchEvent(new MouseEvent("click")); } catch {}
  }

  // Cleanup: wait long enough for the browser to fully consume the blob.
  // 60s is conservative but still bounded.
  setTimeout(() => {
    try { URL.revokeObjectURL(u); } catch {}
    try { a.remove(); } catch {}
  }, 60_000);
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
  // UI policy:
  // - When validator is ready: strictly gate Save/SaveAs/Export.
  // - When validator is NOT ready (vendor missing): DO NOT block persistence.
  //   Blocking after the user already picked a file can leave a 0-byte file behind.
  const ready = !!core?.isValidatorReady?.();
  if (!ready) {
    // Best-effort init (don't await here; keep UX responsive).
    try { core.ensureValidatorInitialized?.(); } catch {}
    setHud("Validation unavailable (AJV not loaded): saving/exporting anyway");
    return true;
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

    // Prefer a Blob write. Some environments have shown silent 0-byte results with
    // certain write forms; we therefore verify and retry with alternative forms.
    const blob = new Blob([text], { type: "application/json" });
    console.log("[file] write blob bytes=", blob.size, "name=", handle?.name || "(no name)");

    async function writeOnce(mode) {
      // keepExistingData:false is the safest for overwrites when supported.
      // @ts-ignore
      const writable = await handle.createWritable({ keepExistingData: false });
      if (mode === "blob") {
        await writable.write(blob);
      } else {
        await writable.write(text);
      }
      await writable.close();
    }

    async function readSize() {
      try {
        const f = await handle.getFile();
        return { size: (f?.size ?? 0), name: (f?.name || handle?.name || "(no name)") };
      } catch {
        return { size: 0, name: (handle?.name || "(no name)") };
      }
    }

    // 1st attempt: blob
    await writeOnce("blob");
    let s1 = await readSize();
    console.log("[file] wrote bytes=", s1.size, "name=", s1.name);
    if (s1.size > 0) return;

    // 2nd attempt: string (some FS backends behave better with text)
    console.warn("[file] wrote 0 bytes; retrying with string write");
    await writeOnce("text");
    let s2 = await readSize();
    console.log("[file] wrote bytes=", s2.size, "name=", s2.name);
    if (s2.size > 0) return;

    throw new Error("writeToHandle: wrote 0 bytes (after retry)");
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
      // Export: prefer File System Access API when available; otherwise download.
      if (!doc) throw new Error("No document");
      const suggestedName = `${(core.getSuggestedSaveName?.() || "export")}.3dss.export.json`;

      const canFsa = canUseSaveFsa();
      let handle = null;

      // IMPORTANT: showSaveFilePicker must be invoked under user activation.
      await core.ensureValidatorInitialized?.();
      if (!ensureStrictOk(doc)) {
        setHud("Export blocked: schema invalid");
        return;
      }

      if (canFsa) {
        try {
          handle = await withFocusRestore(() => pickSaveHandle({ suggestedName }));
        } catch (e) {
          if (e && (e.name === "AbortError" || e.code === 20)) {
            setHud("Export cancelled");
            return;
          }
          throw e;
        }
      }

      if (!canFsa || !handle) {
        const fn = suggestedName;
        dl(fn, jsonText);
        setHud(`Exported (download): ${fn}`);
        return;
      }

      try {
        await writeToHandle(handle, jsonText);
        setHud(`Exported: ${handle?.name || suggestedName}`);
      } catch (e) {
        // File System Access can occasionally produce a 0-byte file depending on
        // backend / permissions. Fall back to download so the user isn't left
        // with an empty file.
        console.error("[file] export write failed; fallback to download", e);
        const fn = suggestedName;
        dl(fn, jsonText);
        setHud(`Exported (download fallback): ${fn}`);
      }
      return;
    }

    // --- Save / SaveAs ---
    if (act === "save" || act === "saveas") {
      if (!doc) throw new Error("No document");
      const suggestedName = `${core.getSuggestedSaveName?.() || "untitled"}.3dss.json`;
      const canFsa = canUseSaveFsa();

      let handle = core.getSaveHandle?.() || null;

      // Save As (or first Save) needs a picker. Do it BEFORE any awaited work so user activation is preserved.
      if (act === "saveas" || (act === "save" && !handle)) {      await core.ensureValidatorInitialized?.();
      if (!ensureStrictOk(doc)) {
        setHud(act === "saveas" ? "Save As blocked: schema invalid" : "Save blocked: schema invalid");
        return;
      }


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
          // Fallback: download
          const fn = suggestedName;
          dl(fn, jsonText);
          if (act === "saveas") core.clearSaveHandle?.();
          setHud(act === "saveas" ? `Saved As (download): ${fn}` : `Saved (download): ${fn}`);
          core.setDirty?.(false);
          return;
        }
      }


      if (canFsa && handle) {
        try {
          await writeToHandle(handle, jsonText);
          if (act === "saveas") core.setSaveHandle?.(handle);
          setHud(act === "saveas" ? `Saved As: ${handle?.name || suggestedName}` : `Saved: ${handle?.name || suggestedName}`);
          core.setDirty?.(false);
          return;
        } catch (e) {
          console.error("[file] save write failed; fallback to download", e);
          const fn = suggestedName;
          dl(fn, jsonText);
          // If Save As failed via FSA, do not keep the handle.
          if (act === "saveas") core.clearSaveHandle?.();
          setHud(act === "saveas" ? `Saved As (download fallback): ${fn}` : `Saved (download fallback): ${fn}`);
          core.setDirty?.(false);
          return;
        }
      }

      // Safe fallback
      const fn = suggestedName;
      dl(fn, jsonText);
      if (act === "saveas") core.clearSaveHandle?.();
      setHud(act === "saveas" ? `Saved As (download): ${fn}` : `Saved (download): ${fn}`);
      core.setDirty?.(false);
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
