// ui/controllers/importLossContract.js
// Pure helpers for the explicit lossy-import contract (SW-M1).

export function summarizeImportExtras(extras) {
  if (!extras || typeof extras !== "object") return { hasLoss: false, count: 0, truncated: false, paths: [] };
  const removed = Array.isArray(extras.removed) ? extras.removed : [];
  const count = Math.max(Number(extras.removedCount || 0) || 0, removed.length);
  return {
    hasLoss: count > 0,
    count,
    truncated: !!extras.truncated,
    paths: removed.slice(0, 3).map((it) => String(it?.path || "/")),
  };
}

export function buildImportLossMessage(extras, action = "save") {
  const s = summarizeImportExtras(extras);
  if (!s.hasLoss) return null;
  const label = String(action || "save").toLowerCase() === "export" ? "Export" : "Save";
  const sample = s.paths.length ? `\nExamples: ${s.paths.join(", ")}` : "";
  const more = s.truncated ? "\n(The stored extras list is truncated.)" : "";
  return [
    `${label} will write strict 3DSS only.`,
    `${s.count} unsupported imported field(s) are not persisted and will be lost from this output.`,
    "Schema-valid output does not mean the original source was preserved losslessly.",
    sample,
    more,
    "\nContinue with this lossy output?",
  ].filter(Boolean).join("\n");
}
