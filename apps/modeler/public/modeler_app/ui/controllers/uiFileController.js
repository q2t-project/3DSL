// ui/controllers/uiFileController.js
// File/title/dirty/beforeunload (UI layer only).
//
// Phase 3 (production-grade File I/O):
// - Save / Save As: keep handle when possible, overwrite on Save
// - Export: does NOT update Save destination; can mark clean (policy)
// - Strict validation gate: Save/SaveAs/Export require schema-OK; otherwise show errors
// - Failures: keep dirty, notify, provide retry paths
// - Fallback: download when FSA is unavailable or fails

function dl(name, text, opts = {}) {
  const b = new Blob([text], { type: "application/json" });
  const u = URL.createObjectURL(b);

  const win = opts && opts.preopenedWindow;
  if (win && !win.closed) {
    try {
      win.document.title = String(name || "model.json");
      win.document.body.innerHTML = `<p style="font-family:system-ui; padding:12px;">Preparing <b>${escapeHtml(name || "model.json")}</b>…</p>`;
    } catch {}
    try { win.location.href = u; } catch {}
    // Keep URL alive long enough for iOS Safari to load/share.
    setTimeout(() => {
      try { URL.revokeObjectURL(u); } catch {}
    }, 60_000);
    return;
  }

  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { URL.revokeObjectURL(u); } catch {}
    try { a.remove(); } catch {}
  }, 0);
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

function renderIssuesToQuickCheck({ issues, qcPanel, qcSummary, qcList }) {
  if (qcSummary) qcSummary.textContent = `${issues.length} issues`;
  if (!qcList) return;
  qcList.textContent = "";
  for (const it of issues) {
    const item = document.createElement("div");
    item.className = "qc-item";
    try {
      item.dataset.uuid = String(it?.uuid || "");
      item.dataset.kind = String(it?.kind || it?.nodeKind || "");
      item.dataset.path = String(it?.path || "");
    } catch {}
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
 *  onQuickCheckPick?: (info: { uuid: string, kind: string, path: string }) => void,
 * }} deps
 */
export function createUiFileController(deps) {
  const { core, elements, appTitle, setHud, onQuickCheckPick } = deps;
  const { fileLabel, btnSave, btnSaveAs, btnExport, qcPanel, qcSummary, qcList } = elements || {};
  let extraDirty = null;
  let invoker = null;
  const inFlight = { save: false, saveas: false, export: false };
  // QuickCheck: click an issue to select+focus in the main app.
  if (qcList instanceof HTMLElement) {
    qcList.addEventListener(
      "click",
      (ev) => {
        const t = ev.target instanceof Element ? ev.target : null;
        const item = t?.closest?.(".qc-item");
        if (!(item instanceof HTMLElement)) return;
        const uuid = String(item.dataset.uuid || "");
        const kind = String(item.dataset.kind || "");
        const path = String(item.dataset.path || "");
        if (!uuid && !path) return;
        try { onQuickCheckPick && onQuickCheckPick({ uuid, kind, path }); } catch {}
      },
      { passive: true }
    );
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
        btnExport.title = !hasDoc ? "Open a file first" : (extra ? "Apply edits before Export" : "Export (does not save)" );
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

  function preopenDownloadWindowIfNeeded() {
    // Called synchronously inside a user gesture to keep Safari/iOS download fallback unblocked.
    if (canUseSaveFsa()) return null;
    try {
      const w = window.open("", "_blank", "noopener");
      if (!w) return null;
      try {
        w.document.title = "Preparing…";
        w.document.body.innerHTML = '<p style="font-family:system-ui; padding:12px;">Preparing file…</p>';
      } catch {}
      return w;
    } catch {
      return null;
    }
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
    renderIssuesToQuickCheck({ issues, qcPanel, qcSummary, qcList });
  }

  // IMPORTANT: keep this synchronous.
  // File picker / programmatic download often require a direct user activation.
  // Any `await` before invoking them can break the gesture and make SaveAs/Export
  // appear to do nothing.
  function ensureStrictOk(doc) {
    try {
      const ok = core.validateStrict?.(doc);
      if (ok) return true;
      setHud("Validation failed: fix issues before saving");
      return false;
    } catch (e) {
      // Kick off initialization in the background (best-effort), but don't await.
      try { core.ensureValidatorInitialized?.(); } catch {}
      setHud(`AJV is unavailable; skipping JSON Schema validation.`);
      return false;
    }
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


  async function handleFileAction(action, { ensureEditsApplied } = {}) {
    const act = String(action || "").toLowerCase();
    if (!core?.getDocument?.()) return;
    if (ensureEditsApplied && !ensureEditsApplied()) return;

    if (!Object.prototype.hasOwnProperty.call(inFlight, act)) return;

    if (inFlight[act]) {
      setHud(`${act} already running`);
      return;
    }
    inFlight[act] = true;

    // iOS Safari / no-FSA path: pre-open a window synchronously (user gesture),
    // then navigate it to the Blob URL after async validation work.
    const preopenedWindow = (act === "save" || act === "saveas" || act === "export")
      ? preopenDownloadWindowIfNeeded()
      : null;

    try {
      const doc = core.getDocument();
      if (!ensureStrictOk(doc)) return;

      const jsonText = JSON.stringify(doc, null, 2);

      // --- Export ---
      if (act === "export") {
        // Prefer FSA when available; fallback to download/new-tab.
        if (canUseSaveFsa()) {
          try {
            const suggestedName = defaultExportName();
            const handle = await withFocusRestore(() => pickSaveHandle({ suggestedName }));
            await writeToHandle(handle, jsonText);
            setHud(`Exported: ${handle?.name || suggestedName}`);
            return;
          } catch (e) {
            if (isAbortError(e)) {
              setHud("Export cancelled");
              return;
            }
            const fn = defaultExportName();
            dl(fn, jsonText, { preopenedWindow });
            setHud(`Exported (download): ${fn}`);
            return;
          }
        }

        const fn = defaultExportName();
        dl(fn, jsonText, { preopenedWindow });
        setHud(`Exported (download): ${fn}`);
        return;
      }

      // --- Save / SaveAs ---
      if (act === "save" || act === "saveas") {
        // FSA path
        if (canUseSaveFsa()) {
          // Save: try existing handle first
          if (act === "save") {
            const handle = core?.getSaveHandle?.();
            if (handle) {
              try {
                await writeToHandle(handle, jsonText);
                core?.setSaveLabel?.(handle?.name || defaultSaveName());
                core?.markClean?.();
                syncTitle();
                setHud(`Saved: ${handle?.name || defaultSaveName()}`);
                return;
              } catch (e) {
                // If overwrite failed, fall through to SaveAs
                core?.clearSaveHandle?.();
              }
            }
          }

          // SaveAs / fallback from Save
          try {
            const suggestedName = defaultSaveName();
            const handle = await withFocusRestore(() => pickSaveHandle({ suggestedName }));
            await writeToHandle(handle, jsonText);
            core?.setSaveHandle?.(handle);
            core?.setSaveLabel?.(handle?.name || suggestedName);
            core?.markClean?.();
            syncTitle();
            setHud(`Saved: ${handle?.name || suggestedName}`);
            return;
          } catch (e) {
            if (isAbortError(e)) {
              setHud(act === "save" ? "Save cancelled" : "Save As cancelled");
              return;
            }
            // Fallback to download
          }
        }

        // Download fallback (no FSA)
        let fn = defaultSaveName();
        if (act === "saveas") {
          const name = window.prompt("Save As filename:", fn);
          if (!name) {
            setHud("Save As cancelled");
            return;
          }
          fn = String(name).trim() || fn;
          core?.setSaveLabel?.(fn);
        } else {
          const s = core?.getSaveLabel?.();
          if (typeof s === "string" && s.trim()) fn = s.trim();
        }

        dl(fn, jsonText, { preopenedWindow });
        core?.markClean?.();
        syncTitle();
        setHud(`${act === "save" ? "Saved" : "Saved As"} (download): ${fn}`);
        return;
      }
    } finally {
      inFlight[act] = false;
    }
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
