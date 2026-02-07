// apps/modeler/ssot/runtime/persistDocument.js
// SSOT for all persistence: Save / SaveAs (FSA only), Export (download only)
export async function persistDocument({
  mode,              // "save" | "saveAs" | "export"
  payload,           // string (JSON)
  filenameHint,      // string
  getHandle,         // () => FileSystemFileHandle | null
  setHandle,         // (h) => void
  markClean,         // () => void
}) {
  if (!payload || payload.length === 0) {
    return { ok: false, reason: "empty-payload" };
  }

  // --- Export: download only (data URL) ---
  if (mode === "export") {
    const name = filenameHint || "untitled.3dss.json";
    const url =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(payload);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { ok: true };
  }

  // --- Save / SaveAs: FSA only ---
  if (!window.isSecureContext || !("showSaveFilePicker" in window)) {
    return { ok: false, reason: "fsa-unavailable" };
  }

  let handle = null;
  if (mode === "save") {
    handle = getHandle && getHandle();
    if (!handle) mode = "saveAs";
  }

  if (mode === "saveAs") {
    handle = await window.showSaveFilePicker({
      suggestedName: filenameHint || "untitled.3dss.json",
      types: [{
        description: "3DSS JSON",
        accept: { "application/json": [".json"] },
      }],
    });
  }

  const writable = await handle.createWritable({ keepExistingData: true });
  try {
    await writable.write({ type: "write", position: 0, data: payload });
    await writable.truncate(payload.length);
    await writable.close();
  } catch (e) {
    try { await writable.abort(); } catch {}
    return { ok: false, reason: "write-failed" };
  }

  if (setHandle) setHandle(handle);
  if (markClean) markClean();
  return { ok: true };
}
