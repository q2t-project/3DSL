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
 * }} deps
 */
export function createUiSelectionController({ core, ensureEditsAppliedOrConfirm, setHud, getOutlinerRowOrder }) {
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
    const uuid = issueLike.uuid ? String(issueLike.uuid) : "";
    const kind = issueLike.kind ? String(issueLike.kind) : "";
    const path = issueLike.path ? String(issueLike.path) : "";

    if (uuid) return { uuid, kind: kind || null, path: path || null };
    if (!path) return null;

    // QuickCheck path fallback: /points/<idx>, /lines/<idx>, /aux/<idx>
    const m = path.match(/^\/(points|lines|aux)\/(\d+)$/);
    if (!m) return null;

    const tab = m[1];
    const idx = Number(m[2]);
    if (!Number.isFinite(idx) || idx < 0) return null;
    const doc = core.getDocument?.();
    if (!doc || typeof doc !== "object") return null;

    const arr = tab === "points" ? doc.points : tab === "lines" ? doc.lines : doc.aux;
    if (!Array.isArray(arr) || idx >= arr.length) return null;
    const node = arr[idx];
    const u = node?.meta?.uuid || node?.uuid;
    if (!u) return null;
    const k = tab === "points" ? "point" : tab === "lines" ? "line" : "aux";
    return { uuid: String(u), kind: k, path };
  };

  const selectIssue = (issueLike) => {
    const r = resolveIssueLike(issueLike);
    if (!r?.uuid) return;
    setSelectionUuids([r.uuid], r, "quickcheck");
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
