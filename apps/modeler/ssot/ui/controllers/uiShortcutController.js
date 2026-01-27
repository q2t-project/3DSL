// ui/controllers/uiShortcutController.js
// Keyboard shortcuts wiring (no core logic).

function shouldIgnoreShortcutTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = (target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * @param {{
 *  signal: AbortSignal,
 *  core: any,
 *  invoke: (action: string) => void,
 *  ensureEditsAppliedOrConfirm?: () => boolean,
 *  setSelectionUuids?: (uuids: string[], issueLike?: any, reason?: string) => boolean,
 * }} args
 */
export function attachUiShortcutController({ signal, core, invoke, ensureEditsAppliedOrConfirm, setSelectionUuids }) {
  // Save / Save As
  window.addEventListener(
    "keydown",
    (ev) => {
      if (shouldIgnoreShortcutTarget(ev.target)) return;
      if (ev.altKey) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (!mod) return;
      const key = String(ev.key || "").toLowerCase();
      if (key !== "s") return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.shiftKey) invoke("saveas");
      else invoke("save");
    },
    { capture: true, signal }
  );

  // Undo / Redo
  window.addEventListener(
    "keydown",
    (ev) => {
      if (shouldIgnoreShortcutTarget(ev.target)) return;
      if (ev.altKey) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (!mod) return;

      const key = String(ev.key || "").toLowerCase();
      const isZ = key === "z";
      const isY = key === "y";
      if (!isZ && !isY) return;

      ev.preventDefault();
      ev.stopPropagation();

      const redo = isY || (isZ && ev.shiftKey);
      if (redo) invoke("redo");
      else invoke("undo");
    },
    { capture: true, signal }
  );

  // Delete selection (Backspace/Delete)
  window.addEventListener(
    "keydown",
    (ev) => {
      if (shouldIgnoreShortcutTarget(ev.target)) return;
      if (ev.altKey) return;
      if (ev.ctrlKey || ev.metaKey) return; // avoid clobbering browser shortcuts

      const key = String(ev.key || "");
      const isDel = key === "Delete" || key === "Backspace";
      if (!isDel) return;

      try {
        if (typeof ensureEditsAppliedOrConfirm === "function" && !ensureEditsAppliedOrConfirm()) return;
      } catch {}

      const doc = core.getDocument?.();
      const sel = Array.isArray(core.getSelection?.()) ? core.getSelection?.().map(String) : [];
      if (!doc || sel.length === 0) return;

      const locked = new Set(core.listLocks?.() || []);
      const targets = sel.filter((u) => !locked.has(u));
      if (targets.length === 0) return;

      const delSet = new Set(targets);
      const uuidOf = (node) => node?.meta?.uuid || node?.uuid || null;

      core.updateDocument?.((cur) => {
        const next = { ...cur };

        const deletedPoints = new Set();
        for (const u of delSet) {
          if ((Array.isArray(cur.points) ? cur.points : []).some((p) => uuidOf(p) === u)) deletedPoints.add(u);
        }

        next.points = Array.isArray(cur.points) ? cur.points.filter((p) => !delSet.has(uuidOf(p))) : [];
        next.aux = Array.isArray(cur.aux) ? cur.aux.filter((a) => !delSet.has(uuidOf(a))) : [];
        next.lines = Array.isArray(cur.lines)
          ? cur.lines.filter((ln) => {
            const u = uuidOf(ln);
            if (delSet.has(u)) return false;
            const a = ln?.end_a?.ref;
            const b = ln?.end_b?.ref;
            if (typeof a === "string" && deletedPoints.has(a)) return false;
            if (typeof b === "string" && deletedPoints.has(b)) return false;
            return true;
          })
          : [];

        return next;
      });

      try {
        if (typeof setSelectionUuids === "function") setSelectionUuids([], null, "shortcut-delete");
        else core.setSelection?.([]);
      } catch { try { core.setSelection?.([]); } catch {} }

      ev.preventDefault();
      ev.stopPropagation();
    },
    { capture: true, signal }
  );
}
