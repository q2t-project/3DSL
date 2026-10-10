// ui/controllers/uiFileController.js
// File/title/dirty/beforeunload (UI layer only).
//
// Phase 3 (production-grade File I/O):
// - Save / Save As: keep handle when possible, overwrite on Save
// - Export: does NOT update Save destination; work packages stay dirty
// - Strict validation gate: Save/SaveAs/Export require schema-OK; otherwise show errors
// - Failures: keep dirty, notify, provide retry paths
// - Fallback: download when FSA is unavailable or fails; dispatch is not a verified disk save

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
    a.dispatchEvent(new MouseEvent("click"));
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
 *    fileStatus?: HTMLElement|null,
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
  const { fileLabel, fileStatus, btnSave, btnSaveAs, btnExport, qcPanel, qcSummary, qcList } = elements || {};
  let extraDirty = null;
  let invoker = null;
  let writeInProgress = false;
  let lastOutcome = null;

  function reportFileState(message, state = "info") {
    lastOutcome = { message, state, epoch: core.getDocumentEpoch?.() };
    setHud(message);
    syncTitle();
  }

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

    const work = deps.getWorkPackage?.();
    const handle = core.getSaveHandle?.();
    const destination = handle?.name || core.getSaveLabel?.() || "";
    const name = basenameLike(baseLabel) || baseLabel;
    const suffix = extra ? " · 未適用の入力あり" : coreDirty ? " · 未保存" : "";
    if (fileLabel) {
      fileLabel.textContent = `${name}${suffix}`;
      fileLabel.title = `${baseLabel}${destination ? `\n上書き先: ${destination}（選択済みのファイル）` : "\n上書き先は未指定。保存時に場所を選べる。"}`;
    }
    try { document.title = `${coreDirty || extra ? "* " : ""}${name} — ${appTitle}`; } catch {}
    if (lastOutcome && lastOutcome.epoch !== core.getDocumentEpoch?.()) lastOutcome = null;
    if (fileStatus) {
      const state = !hasDoc ? "作品を開くか新規作成" : writeInProgress ? "保存処理中…" : extra ? "未適用の入力あり：プロパティで適用／入力を取消" : coreDirty ? "未保存" : handle ? "保存済み" : "読込済み・保存先未指定";
      const draftCount = work?.contract?.draft?.inputs?.length || 0;
      const draft = draftCount ? ` ／ 作業入力 ${draftCount} 件も作品一式に保存（未適用のまま）` : "";
      const outcomeLabels = { saved: "保存完了", exported: "図の書出し完了", cancelled: "保存／書出しを取消・内容保持", failed: "保存／書出し失敗・内容保持", download: "ダウンロード開始・開き直して確認", blocked: "保存を停止・入力を確認" };
      const result = !writeInProgress && lastOutcome ? ` ／ 前回: ${outcomeLabels[lastOutcome.state] || lastOutcome.message}` : "";
      fileStatus.textContent = `${state}${handle ? ` ／ 上書き先: ${destination}` : ""}${draft}${result}`;
      if (fileStatus.dataset) fileStatus.dataset.state = writeInProgress ? "saving" : extra ? "unapplied" : coreDirty ? "unsaved" : "clean";
      fileStatus.title = `${lastOutcome ? `${lastOutcome.message}\n` : ""}${work ? "作品一式には図・原文・作業入力・変更履歴を含む。Undoで図を戻しても、変更履歴が追加されれば未保存になる。上書き先を変える場合は別名保存で場所を選ぶ。" : "保存場所は最初の保存／別名保存で選択。未適用のプロパティ入力は適用または取消してから保存。"}`;
    }

    // Save semantics:
    // Legacy buffers block Save; contract drafts are already part of core state.
    // Content, draft and journal changes all contribute to core dirty state.
    const canWrite = hasDoc && !extra && !writeInProgress;
    if (btnSave) btnSave.disabled = !(canWrite && coreDirty);
    if (btnSaveAs) btnSaveAs.disabled = !canWrite;
    if (btnExport) btnExport.disabled = !canWrite;

    try {
      if (btnSave) {
        btnSave.title = !hasDoc ? "作品を開くか新規作成してな" : writeInProgress ? "保存処理中" : extra ? "プロパティで適用／入力を取消してから保存" : coreDirty ? `${handle ? `「${destination}」へ上書き保存` : "保存先を選ぶ"}（Ctrl+S）` : "保存する変更なし（別名保存は可能）";
      }
      if (btnSaveAs) {
        btnSaveAs.title = !hasDoc ? "作品を開くか新規作成してな" : writeInProgress ? "保存処理中" : extra ? "プロパティで適用／入力を取消してから別名保存" : "場所と名前を選んで保存（Ctrl+Shift+S）";
      }
      if (btnExport) {
        btnExport.title = !hasDoc ? "作品を開くか新規作成してな" : writeInProgress ? "保存処理中" : extra ? "プロパティで適用／入力を取消してから書出し" : work ? "図だけを書き出す。原文・作業入力・変更履歴は含まれず、作品一式の保存状態も変わらない" : "図を3DSSとして書き出す";
      }
    } catch {}
  }

  function confirmDiscardIfDirty(reason = "this") {
    if (!isDirty()) return true;
    return window.confirm("未保存の編集・入力を破棄して切り替える？ 残す場合はキャンセルして、先に作品一式を保存してな。");
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
    const issues = list.map((e) => {
      const path = e?.instancePath || e?.schemaPath || "/";
      const match = path.match(/^\/(points|lines|aux)\/(\d+)(?:\/|$)/);
      const node = match ? core.getDocument?.()?.[match[1]]?.[Number(match[2])] : null;
      return {
        severity: "error",
        uuid: e?.uuid || node?.meta?.uuid || null,
        path,
        expected: e?.expected,
        actual: e?.actual,
        message: e?.message || String(e || "Schema error"),
        kind: match ? ({ points: "point", lines: "line", aux: "aux" })[match[1]] : "document",
      };
    });
    try {
      if (qcPanel) qcPanel.dataset.source = "schema";
    } catch {}
    renderIssuesToQuickCheck({ issues, qcPanel, qcSummary, qcList, onSelectIssue: (it) => selectionController?.selectIssue?.(it) });
  }

  // IMPORTANT: keep this synchronous.
  // File picker / programmatic download often require a direct user activation.
  // Any `await` before invoking them can break the gesture and make SaveAs/Export
  // appear to do nothing.
  
function sanitizeDocForSave(doc) {
  if (!doc || typeof doc !== "object") return doc;

  // Points: drop empty marker objects or fix missing primitive.
  if (Array.isArray(doc.points)) {
    for (const p of doc.points) {
      const marker = p?.appearance?.marker;
      if (marker && typeof marker === "object" && !Array.isArray(marker)) {
        const keys = Object.keys(marker);
        if (keys.length === 0) {
          delete p.appearance.marker;
        } else if (!("primitive" in marker)) {
          // If marker carries any other data (eg text), prefer a safe default over invalid output.
          marker.primitive = "none";
        }
      }
    }
  }

  // Endpoints are normalized by core. Do not mirror legacy fields or erase
  // invalid/coordinate values here; strict validation must see the snapshot.

  return doc;
}

function ensureStrictOk(doc) {
  // Synchronous preflight precedes the picker, preserving user activation.
  // The facade returns a boolean; a Promise must never count as ready.
  const ready = core?.isValidatorReady?.() === true;
  if (!ready) {
    try { Promise.resolve(core.ensureValidatorInitialized?.()).catch(() => {}); } catch {}
    showStrictErrors([{ instancePath: "/", message: "Strict validator is unavailable; wait for initialization or restore AJV, then retry" }]);
    reportFileState("検査の準備中で保存を止めたで。少し待ってから保存し直してな。入力内容は残ってる。", "blocked");
    return false;
  }
  if (core.validateStrict?.(doc) === true) return true;
  showStrictErrors(core.getStrictErrors?.() ?? []);
  reportFileState("作品の検査で保存を止めたで。検査欄の対象を確認してな。編集内容は残ってる。", "blocked");
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
      try {
        if (mode === "blob") {
          await writable.write(blob);
        } else {
          await writable.write(text);
        }
        await writable.close();
      } catch (error) {
        try { await writable.abort?.(); } catch {}
        throw error;
      }
    }

    async function readSize() {
      try {
        const f = await handle.getFile();
        const size = f?.size ?? 0;
        // Non-zero alone is not enough: a partial write must not mark the document clean.
        const matches = size === blob.size && typeof f?.text === "function" && (await f.text()) === text;
        return { size, matches, name: (f?.name || handle?.name || "(no name)") };
      } catch {
        return { size: 0, name: (handle?.name || "(no name)") };
      }
    }

    // 1st attempt: blob
    await writeOnce("blob");
    let s1 = await readSize();
    console.log("[file] wrote bytes=", s1.size, "name=", s1.name);
    if (s1.matches) return;
    if (s1.size > 0) throw new Error("writeToHandle: saved contents differ from the requested snapshot");

    // 2nd attempt: string (some FS backends behave better with text)
    console.warn("[file] wrote 0 bytes; retrying with string write");
    await writeOnce("text");
    let s2 = await readSize();
    console.log("[file] wrote bytes=", s2.size, "name=", s2.name);
    if (s2.matches) return;

    throw new Error("writeToHandle: saved contents could not be verified (after retry)");
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

  async function performFileAction(action, { ensureEditsApplied, getFallbackDocument } = {}) {
    const act = String(action || "").toLowerCase();
    // Legacy property buffers are outside the work package. Never make Save
    // secretly commit them through the general apply-on-leave callback.
    // Contract drafts already live inside the package and do not set extraDirty.
    if (isExtraDirty()) { reportFileState("保存を止めたで。プロパティの入力は残ってる。適用／入力を取消を選んでな。", "blocked"); return; }
    if (ensureEditsApplied && !ensureEditsApplied()) { reportFileState("保存を止めたで。プロパティの入力を確認してな。", "blocked"); return; }
    core.flushHistoryGroup?.();
    // Prefer core document; fall back to a hub-provided cache when available.
    // This keeps Save/Export usable even if the UI is currently driven by hub events.
    const doc0 = core?.getDocument?.() ?? null;
    const sourceDoc = doc0 || (typeof getFallbackDocument === "function" ? (getFallbackDocument() ?? null) : null);
    if (!sourceDoc) { reportFileState("保存する作品がないで。作品を開くか新規作成してな。", "blocked"); return; }
    // All preparation and validation operate on an isolated save snapshot.
    const sourceEpoch = core.getDocumentEpoch?.();
    const isSameDocument = () => sourceEpoch === undefined || core.getDocumentEpoch?.() === sourceEpoch;
    const sourceText = JSON.stringify(sourceDoc);
    const doc = sanitizeDocForSave(JSON.parse(sourceText));
    if (!ensureStrictOk(doc)) return;
    const work = deps.getWorkPackage?.() || null;
    const workText = work ? JSON.stringify(work) : null;
    const extras = core.getImportExtras?.();
    const hasExtras = !!(extras && (extras.removedCount > 0 || extras.removed?.length));
    // Import diagnostics may be truncated, so they are not a lossless sidecar.
    // Only an explicitly confirmed complete attachment may satisfy preservation.
    const extrasPreserved = work && deps.areImportExtrasPreserved?.() === true;
    if ((act === "save" || act === "saveas") && hasExtras && !extrasPreserved) {
      showStrictErrors([{ instancePath: "/", message: "Imported extra fields are not preserved by this save format. Keep the original file; use explicit graph export only if those fields are not required." }]);
      reportFileState("取り込んだ追加情報を含めて保存できないため停止したで。元ファイルと編集内容は保持してる。", "blocked");
      return;
    }
    let output = doc;
    if (work && (act === "save" || act === "saveas")) {
      if (typeof deps.prepareWorkPackage !== "function" || typeof deps.validateWorkPackage !== "function") {
        reportFileState("作品一式を保存する処理が利用できないため停止したで。編集内容は残ってる。", "blocked");
        return;
      }
      try {
        output = deps.prepareWorkPackage(doc, work);
        if (!output || typeof output.then === "function") throw new Error("Work package preparation must complete before the picker");
        const checked = deps.validateWorkPackage(output);
        if (checked === false || (checked && typeof checked.then === "function")) throw new Error("Work package validation did not complete");
      } catch (error) {
        showStrictErrors([{ instancePath: "/", message: String(error?.message || error) }]);
        reportFileState(`作品一式の検査で保存を止めたで: ${String(error?.message || error)}`, "blocked");
        return;
      }
    }
    const markSavedSnapshotClean = ({ verified = true } = {}) => {
      // A work download needs the actual file reopened; dispatch is not disk completion.
      if (!isSameDocument() || !verified) return;
      // A graph export is not a save of the work's source, mappings or history.
      if (act === "export" && (work || hasExtras)) return;
      // Editing or switching a work during an asynchronous write remains dirty.
      const current = core?.getDocument?.() ?? sourceDoc;
      const currentWork = deps.getWorkPackage?.() || null;
      if (JSON.stringify(current) === sourceText && (currentWork ? JSON.stringify(currentWork) : null) === workText) core.markClean?.();
    };
    const jsonText = JSON.stringify(output, null, 2);
    if (typeof jsonText !== "string" || jsonText.length === 0) {
      throw new Error("Export produced empty JSON");
    }
    console.log("[file] json chars=", jsonText ? jsonText.length : 0, "act=", act);

    // --- Export ---
    if (act === "export") {
      // Export: prefer File System Access API when available; otherwise download.
      if (!doc) throw new Error("No document");
      const exportStem = sanitizeFileStem(core.getSuggestedSaveName?.() || "export").replace(/(?:\.3dsl-work|\.3dss(?:\.export)?)?\.json$/i, "");
      const suggestedName = `${exportStem || "export"}.3dss.json`;

      const canFsa = canUseSaveFsa();
      let handle = null;

      // IMPORTANT: showSaveFilePicker must be invoked under user activation.

      if (canFsa) {
        try {
          handle = await withFocusRestore(() => pickSaveHandle({ suggestedName }));
        } catch (e) {
          if (e && (e.name === "AbortError" || e.code === 20)) {
            reportFileState("図の書出しを取消。作品・入力・保存先はそのままやで。", "cancelled");
            return;
          }
          throw e;
        }
      }

      if (!canFsa || !handle) {
        const fn = suggestedName;
        dl(fn, jsonText);
        reportFileState(`図のダウンロードを開始: ${fn}。ファイルを開いて確認してな。作品の保存状態はそのまま。`, "download");
        markSavedSnapshotClean({ verified: false });
        return;
      }

      try {
        await writeToHandle(handle, jsonText);
        markSavedSnapshotClean();
        reportFileState(`図を書き出したで: ${handle?.name || suggestedName}${work || hasExtras ? "。原文・作業入力・履歴は含まれず、作品一式は保存してないで。" : ""}`, "exported");
      } catch (e) {
        if (isAbortError(e)) { reportFileState("図の書出しを取消。作品・入力・保存先はそのままやで。", "cancelled"); return; }
        // File System Access can occasionally produce a 0-byte file depending on
        // backend / permissions. Fall back to download so the user isn't left
        // with an empty file.
        console.error("[file] export write failed; fallback to download", e);
        const fn = suggestedName;
        dl(fn, jsonText);
        reportFileState(`図の書込みに失敗。代わりにダウンロードを開始: ${fn}。保存状態はそのまま、内容は残ってるで。`, "failed");
      }
      return;
    }

    // --- Save / SaveAs ---
    if (act === "save" || act === "saveas") {
      if (!doc) throw new Error("No document");
      const saveStem = sanitizeFileStem(core.getSuggestedSaveName?.() || "untitled").replace(/(?:\.3dsl-work|\.3dss(?:\.export)?)?\.json$/i, "");
      const suggestedName = `${saveStem || "untitled"}${work ? ".3dsl-work.json" : ".3dss.json"}`;
      const canFsa = canUseSaveFsa();

      let handle = core.getSaveHandle?.() || null;

      // Save As (or first Save) needs a picker. Do it BEFORE any awaited work so user activation is preserved.
      if (act === "saveas" || (act === "save" && !handle)) {

        if (canFsa) {
          try {
            handle = await withFocusRestore(() => pickSaveHandle({ suggestedName }));
          } catch (e) {
            if (e && (e.name === "AbortError" || e.code === 20)) {
              reportFileState("保存を取消。編集内容・入力・これまでの保存先はそのままやで。", "cancelled");
              return;
            }
            throw e;
          }
        } else {
          // Fallback: download
          const fn = suggestedName;
          dl(fn, jsonText);
          reportFileState(`ダウンロードを開始: ${fn}。保存先はブラウザで確認してな。開き直すまで未保存状態と従来の上書き先を保持するで。`, "download");
          markSavedSnapshotClean({ verified: false });
          return;
        }
      }


      if (canFsa && handle) {
        try {
          await writeToHandle(handle, jsonText);
          if (isSameDocument() && (act === "saveas" || act === "save")) core.setSaveHandle?.(handle);
          markSavedSnapshotClean();
          reportFileState(`保存完了: ${handle?.name || suggestedName}${isSameDocument() && isDirty() ? "。保存中の追加編集・入力はまだ未保存やで。" : ""}`, "saved");
          return;
        } catch (e) {
          if (isAbortError(e)) { reportFileState("保存を取消。編集内容・入力・これまでの保存先はそのままやで。", "cancelled"); return; }
          console.error("[file] save write failed; fallback to download", e);
          const fn = suggestedName;
          dl(fn, jsonText);
          // Retain the original destination and dirty state after a failed write.
          reportFileState(`書込みに失敗。代わりにダウンロードを開始: ${fn}。未保存のまま内容と従来の上書き先を保持してるで。`, "failed");
          return;
        }
      }

      // Safe fallback
      const fn = suggestedName;
      dl(fn, jsonText);
      reportFileState(`ダウンロードを開始: ${fn}。保存先はブラウザで確認してな。開き直すまで未保存状態と従来の上書き先を保持するで。`, "download");
      markSavedSnapshotClean({ verified: false });
      return;
    }

    // Unknown action
    setHud(`Unknown file action: ${act}`);
  }

  async function handleFileAction(action, options) {
    if (writeInProgress) { setHud("保存処理中やで。完了するまで待ってな。"); return; }
    writeInProgress = true;
    try {
      syncTitle();
      deps.onStateChange?.();
      return await performFileAction(action, options);
    }
    catch (error) {
      reportErr("[file] file action failed", error);
      reportFileState(`保存／書出しに失敗: ${String(error?.message || error)}。編集内容・入力・これまでの保存先は保持してるで。`, "failed");
    }
    finally {
      // Rendering and notification failures must never strand the write lock.
      writeInProgress = false;
      try { syncTitle(); }
      finally { deps.onStateChange?.(); }
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

  // A read-only copy of the current work, made synchronously during the click.
  // This must not apply inputs, flush history, choose a file, or mark it saved.
  function createReadingSnapshot() {
    if (writeInProgress) throw new Error("保存処理が終わってからViewerを開いてください。");
    if (isExtraDirty()) throw new Error("プロパティに未適用の入力があります。入力は保持しています。適用／入力を取消してからViewerを開いてください。");
    const current = core?.getDocument?.();
    if (!current) throw new Error("作品を開くか、新規作成してください。");
    const scene = JSON.parse(JSON.stringify(current));
    if (core?.isValidatorReady?.() !== true) throw new Error("形式検査の準備中です。少し待ってからViewerを開いてください。");
    if (core.validateStrict?.(JSON.parse(JSON.stringify(scene))) !== true) throw new Error("図の形式検査に合格しません。編集内容は保持しています。");
    const extras = core.getImportExtras?.();
    const hasExtras = extras && (Array.isArray(extras) ? extras.length > 0 : Object.keys(extras).length > 0);
    const currentWork = deps.getWorkPackage?.() || null;
    if (hasExtras && !(currentWork && deps.areImportExtrasPreserved?.() === true)) throw new Error("この読込みで保持された追加情報をViewerへ渡せません。元ファイルと編集内容は保持しています。");
    let output = scene;
    if (currentWork) {
      if (typeof deps.prepareWorkPackage !== "function" || typeof deps.validateWorkPackage !== "function") throw new Error("作品一式の読取り準備を利用できません。");
      output = deps.prepareWorkPackage(scene, JSON.parse(JSON.stringify(currentWork)));
      if (!output || typeof output.then === "function") throw new Error("作品一式を同期で準備できません。");
      const checked = deps.validateWorkPackage(JSON.parse(JSON.stringify(output)));
      if (checked !== true) throw new Error("作品一式の形式検査に合格しません。");
    }
    return {
      text: JSON.stringify(output),
      label: basenameLike(core.getDisplayLabel?.() || core.getDocumentLabel?.() || "") || scene.document_meta?.title || "制作中の作品",
    };
  }

  return {
    createReadingSnapshot,
    isDirty,
    isCoreDirty,
    isExtraDirty,
    isWriting: () => writeInProgress,
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
