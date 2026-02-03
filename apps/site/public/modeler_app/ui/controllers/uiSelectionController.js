// ui/controllers/uiSelectionController.js

/**
 * Selection controller (UI layer)
 * - Centralizes selection changes (Outliner / Preview pick / QuickCheck jump)
 * - Guards selection changes behind property "apply/discard" when necessary
 * - Supports ctrl/cmd toggle + shift range selection in Outliner
 */

/**
 * @param {{
 *   core: any,
 *   ensureEditsAppliedOrConfirm: (args?: {reason?: string}) => boolean,
 *   setHud: (msg: string) => void,
 *   getOutlinerRowOrder?: () => string[],
 *   flashOutlinerRow?: (args: {uuid: string, tab?: 'points'|'lines'|'aux'|null}) => void,
 *   focusFieldByIssue?: (issueLike: any) => void,
 * }} deps
 */
export function createUiSelectionController({ core, ensureEditsAppliedOrConfirm, setHud, getOutlinerRowOrder, flashOutlinerRow, focusFieldByIssue }) {
  /** @type {string|null} */
  let outlinerAnchorUuid = null;
  /** @type {"points"|"lines"|"aux"|null} */
  let outlinerAnchorTab = null;

  const tabFromKind = (kind) => {
    const k = String(kind || "").toLowerCase();
    if (k === "point" || k === "points") return "points";
    if (k === "line" || k === "lines") return "lines";
    if (k === "aux") return "aux";
    return null;
  };

  const focusIfSingle = (uuids, issueLike) => {
    try {
      if (Array.isArray(uuids) && uuids.length === 1) core.focusByIssue?.(issueLike || { uuid: uuids[0] });
    } catch {}
  };

  const setSelectionUuids = (uuids, issueLike, reason = "selection") => {
    const ok = ensureEditsAppliedOrConfirm?.({ reason });
    if (!ok) return false;
    const next = Array.isArray(uuids) ? uuids.filter(Boolean).map(String) : [];
    core.setSelection?.(next);
    focusIfSingle(next, issueLike);
    return true;
  };

  const resolveIssueLike = (issueLike) => {
    if (!issueLike || typeof issueLike !== "object") return null;

    const rawUuid = issueLike.uuid ? String(issueLike.uuid) : "";
    const rawKind = issueLike.kind ? String(issueLike.kind) : "";
    const rawPath = issueLike.path ? String(issueLike.path) : "";

    /** @type {string} */
    let uuid = rawUuid;
    /** @type {string} */
    let kind = String(rawKind || "").toLowerCase();
    // Treat non-canonical kinds (e.g. "unknown") as missing and infer from uuid/path.
    if (kind && !["point", "line", "aux", "points", "lines", "aux"].includes(kind)) kind = "";
    /** @type {string} */
    let path = rawPath;

    const doc = core.getDocument?.();
    const hasDoc = !!(doc && typeof doc === "object");

    // Infer kind from path prefix when missing.
    if (!kind && path) {
      const pm = path.match(/^\/(points|lines|aux)(?:\/|$)/);
      if (pm) kind = pm[1] === "points" ? "point" : pm[1] === "lines" ? "line" : "aux";
    }

    // If uuid is missing, try to resolve from QuickCheck-like path:
    //   /points/<idx>/..., /lines/<idx>/..., /aux/<idx>/...
    if (!uuid && path && hasDoc) {
      const m = path.match(/^\/(points|lines|aux)\/(\d+)(?:\/.*)?$/);
      if (m) {
        const tab = m[1];
        const idx = Number(m[2]);
        if (Number.isFinite(idx) && idx >= 0) {
          const arr = tab === "points" ? doc.points : tab === "lines" ? doc.lines : doc.aux;
          if (Array.isArray(arr) && idx < arr.length) {
            const node = arr[idx];
            const u = node?.meta?.uuid || node?.uuid;
            if (u) {
              uuid = String(u);
              if (!kind) kind = tab === "points" ? "point" : tab === "lines" ? "line" : "aux";
            }
          }
        }
      }
    }

    // If kind is missing but uuid exists, search the doc to infer kind.
    if (uuid && !kind && hasDoc) {
      try {
        const u = String(uuid);
        const hitPoint = Array.isArray(doc.points) && doc.points.some((n) => String(n?.meta?.uuid || n?.uuid || "") === u);
        const hitLine = Array.isArray(doc.lines) && doc.lines.some((n) => String(n?.meta?.uuid || n?.uuid || "") === u);
        const hitAux = Array.isArray(doc.aux) && doc.aux.some((n) => String(n?.meta?.uuid || n?.uuid || "") === u);
        kind = hitPoint ? "point" : hitLine ? "line" : hitAux ? "aux" : "";
      } catch {}
    }

    const sev = issueLike?.severity ? String(issueLike.severity) : null;
    const msg = issueLike?.message ? String(issueLike.message) : null;

    // Some issues are doc-level (no uuid) but still provide a precise JSON pointer path.
    if (!uuid) return { uuid: null, kind: kind || null, path: path || null, severity: sev, message: msg };
    return { uuid: String(uuid), kind: kind || null, path: path || null, severity: sev, message: msg };
  };

  const selectIssue = (issueLike) => {
    const r = resolveIssueLike(issueLike);
    if (!r) return;

    // Doc-level issue: keep selection, but provide a visible response.
    if (!r.uuid) {
      try {
        const p = r.path ? String(r.path) : "/";
        const s = r.severity ? String(r.severity) : "info";
        const m = r.message ? String(r.message) : "";
        setHud?.(`QuickCheck ${s}: ${p}${m ? ` — ${m}` : ""}`);
      } catch {}
      return;
    }

    // QuickCheck jump: always flash the outliner row and focus the most relevant field.
    // Even when the selection stays the same, users expect a visible response.
    try { flashOutlinerRow?.({ uuid: r.uuid, tab: tabFromKind(r.kind) }); } catch {}

    // Selection is the SSOT; focusByIssue is a best-effort hint for viewport/inputs.
    setSelectionUuids([r.uuid], r, "quickcheck");

    try { focusFieldByIssue?.(r); } catch {}
  };

  const selectFromPick = (issueLike, ev) => {
    if (!issueLike?.uuid) return;
    const uuid = String(issueLike.uuid);
    const tab = tabFromKind(issueLike?.kind);

    const mod = !!(ev && (ev.ctrlKey || ev.metaKey));
    if (mod) {
      const ok = ensureEditsAppliedOrConfirm?.({ reason: "selection" });
      if (!ok) return;

      const cur = Array.isArray(core.getSelection?.()) ? core.getSelection?.().map(String) : [];
      const s = new Set(cur);
      if (s.has(uuid)) s.delete(uuid);
      else s.add(uuid);
      const next = Array.from(s);
      core.setSelection?.(next);
      focusIfSingle(next, issueLike);
      outlinerAnchorUuid = uuid;
      outlinerAnchorTab = tab;
      return;
    }

    outlinerAnchorUuid = uuid;
    outlinerAnchorTab = tab;
    setSelectionUuids([uuid], issueLike, "selection");
  };

  const selectFromOutliner = (issueLike, ev) => {
    if (!issueLike?.uuid) return;
    const uuid = String(issueLike.uuid);
    const rowTab = tabFromKind(issueLike?.kind);
    const shift = !!(ev && ev.shiftKey);
    const mod = !!(ev && (ev.ctrlKey || ev.metaKey));

    const rowOrder = Array.isArray(getOutlinerRowOrder?.()) ? getOutlinerRowOrder?.().map(String) : [];
    const rowIndex = rowOrder.indexOf(uuid);

    // SHIFT range select (within current tab order)
    if (shift && rowIndex >= 0) {
      const ok = ensureEditsAppliedOrConfirm?.({ reason: "selection" });
      if (!ok) return;

      // Anchor: last non-shift click within same tab, else current single selection, else clicked row.
      let anchor = null;
      if (outlinerAnchorUuid && outlinerAnchorTab && rowTab && outlinerAnchorTab === rowTab) anchor = outlinerAnchorUuid;
      if (!anchor) {
        const cur = Array.isArray(core.getSelection?.()) ? core.getSelection?.().map(String) : [];
        if (cur.length === 1) anchor = String(cur[0]);
      }
      if (!anchor) anchor = uuid;

      const aIdx = rowOrder.indexOf(String(anchor));
      const lo = Math.min(aIdx >= 0 ? aIdx : rowIndex, rowIndex);
      const hi = Math.max(aIdx >= 0 ? aIdx : rowIndex, rowIndex);
      const range = rowOrder.slice(lo, hi + 1);

      if (mod) {
        const cur = Array.isArray(core.getSelection?.()) ? core.getSelection?.().map(String) : [];
        const s = new Set(cur);
        for (const u of range) s.add(String(u));
        const next = Array.from(s);
        core.setSelection?.(next);
        focusIfSingle(next, issueLike);
      } else {
        core.setSelection?.(range);
        focusIfSingle(range, issueLike);
      }

      // Do not update anchor on shift; keep it stable for repeated range adjustments.
      return;
    }

    // Ctrl/cmd toggle
    if (mod) {
      const ok = ensureEditsAppliedOrConfirm?.({ reason: "selection" });
      if (!ok) return;

      const cur = Array.isArray(core.getSelection?.()) ? core.getSelection?.().map(String) : [];
      const s = new Set(cur);
      if (s.has(uuid)) s.delete(uuid);
      else s.add(uuid);
      const next = Array.from(s);
      core.setSelection?.(next);
      focusIfSingle(next, issueLike);

      outlinerAnchorUuid = uuid;
      outlinerAnchorTab = rowTab;
      return;
    }

    // Single selection
    outlinerAnchorUuid = uuid;
    outlinerAnchorTab = rowTab;
    setSelectionUuids([uuid], issueLike, "selection");
  };

  return {
    setSelectionUuids,
    selectIssue,
    selectFromPick,
    selectFromOutliner,
  };
}
