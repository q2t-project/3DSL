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
 *  deleteSelection?: () => void,
 *  addPoint?: () => void,
 *  addLine?: () => void,
 * }} args
 */
export function attachUiShortcutController({ signal, core, invoke, ensureEditsAppliedOrConfirm, deleteSelection, addPoint, addLine }) {
  // Single-key authoring aliases use the same guarded buttons as pointer input.
  // Never turn text entry, an IME keystroke or a held key into a new element.
  window.addEventListener(
    "keydown",
    (ev) => {
      if (ev.defaultPrevented || ev.repeat || ev.isComposing || ev.keyCode === 229) return;
      if (shouldIgnoreShortcutTarget(ev.target)) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const key = String(ev.key || "").toLowerCase();
      const add = key === "p" ? addPoint : key === "l" ? addLine : null;
      if (typeof add !== "function") return;
      ev.preventDefault();
      ev.stopPropagation();
      add();
    },
    { capture: true, signal }
  );

  // Save / Save As
  window.addEventListener(
    "keydown",
    (ev) => {
      // Save is a document command even while an input has focus. The file
      // controller keeps unapplied values as drafts or blocks explicitly; this
      // key must never fall through to the browser's page-save dialog.
      if (ev.defaultPrevented || ev.isComposing || ev.keyCode === 229) return;
      if (ev.altKey) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (!mod) return;
      const key = String(ev.key || "").toLowerCase();
      if (key !== "s") return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.repeat) return;
      if (ev.shiftKey) invoke("saveas");
      else invoke("save");
    },
    { capture: true, signal }
  );

  // Undo / Redo
  window.addEventListener(
    "keydown",
    (ev) => {
      if (ev.defaultPrevented || ev.repeat || ev.isComposing || ev.keyCode === 229) return;
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
      if (ev.defaultPrevented || ev.repeat || ev.isComposing || ev.keyCode === 229) return;
      if (shouldIgnoreShortcutTarget(ev.target)) return;
      if (ev.altKey) return;
      if (ev.ctrlKey || ev.metaKey) return; // avoid clobbering browser shortcuts

      const key = String(ev.key || "");
      const isDel = key === "Delete" || key === "Backspace";
      if (!isDel) return;

      ev.preventDefault();
      ev.stopPropagation();
      // One delete path for button and keyboard: dependent refs/locks and package
      // protections must not be bypassed by a silent cascading shortcut delete.
      if (typeof deleteSelection === "function") deleteSelection();
    },
    { capture: true, signal }
  );

  // Frame play/pause (Space)
  window.addEventListener(
    "keydown",
    (ev) => {
      if (ev.defaultPrevented || ev.repeat || ev.isComposing || ev.keyCode === 229) return;
      if (shouldIgnoreShortcutTarget(ev.target)) return;
      if (ev.altKey) return;
      if (ev.ctrlKey || ev.metaKey) return;

      // M: toggle Move tool (selection drag)
      if (ev.key === "m" || ev.key === "M") {
        ev.preventDefault();
        ev.stopPropagation();
        invoke?.("tool-move");
        return;
      }

      // Space: toggle frame playback
      if (ev.key !== " ") return;

      // Avoid triggering when a button is focused (Space is click).
      if (ev.target instanceof HTMLButtonElement) return;

      ev.preventDefault();
      ev.stopPropagation();
      invoke?.("play");
    },
    { capture: true, signal }
  );
}
