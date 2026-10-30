// viewer/ui/picker.js
import { createHubFacade } from './hubFacade.js';
import { TOUCH_TAP_SLOP_PX } from './tapGesture.js';

export function createPicker(hub, opts = {}) {
  const hf = createHubFacade(hub);

  const CLICK_MOVE_PX = opts.clickMovePx ?? 4;
  const DEBUG = !!opts.debug;
  const selectionOnly = opts.selectionOnly === true;

  let el = null;
  let down = null; // { id, x, y, t }

  function log(...a) {
    if (DEBUG) console.log('[picker]', ...a);
  }

  // UI は hubFacade 経由で core API を参照する。

  function toNdc(ev) {
    if (!el) return { ndcX: 0, ndcY: 0 };
    const r = el.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) return { ndcX: 0, ndcY: 0 };
    const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((ev.clientY - r.top) / r.height) * 2 - 1);
    return { ndcX: nx, ndcY: ny };
  }

  function onDown(ev) {
    if (!ev.isPrimary || ev.button !== 0) { down = null; return; }
    const slop = selectionOnly && ev.pointerType === 'touch' ? Math.max(CLICK_MOVE_PX, TOUCH_TAP_SLOP_PX) : CLICK_MOVE_PX;
    down = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, moved: false, slop };
  }

  function onMove(ev) {
    if (!down || ev.pointerId !== down.id) return;
    if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > down.slop) down.moved = true;
  }

  function onCancel() {
    down = null;
  }

  function onUp(ev) {
    if (!ev.isPrimary) return;
    if (!down || ev.pointerId !== down.id) return;

    const dragged = down.moved;
    const slop = down.slop;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
    down = null;
    if (dragged || moved > slop || ev.button !== 0 || ev.buttons) return;

    if (!hub || typeof hub.pickObjectAt !== 'function') {
      console.warn('[picker] hub.pickObjectAt missing');
      return;
    }

    const selAPI = hf.getSelection();
    const modeAPI = hf.getMode();

    if (!selAPI?.select || !selAPI?.clear) {
      console.warn('[picker] selection API missing');
      return;
    }
    if (!selectionOnly && (!modeAPI?.get || !modeAPI?.set)) {
      console.warn('[picker] mode API missing');
      return;
    }

    const { ndcX, ndcY } = toNdc(ev);
    const hit = hub.pickObjectAt(ndcX, ndcY);
    log('pick', { ndcX, ndcY, hit });

    if (selectionOnly) {
      if (hit?.uuid) selAPI.select(hit.uuid, hit.kind);
      else selAPI.clear();
      return;
    }

    if (hit && hit.uuid) {
      const k = typeof hit.kind === 'string' && hit.kind.length > 0 ? hit.kind : undefined;
      if (typeof modeAPI.focus === 'function') modeAPI.focus(hit.uuid, k);
      else modeAPI.set('micro', hit.uuid, k);
      return;
    }

    const mode = modeAPI.get() ?? 'macro';
    if (mode === 'micro') {
      if (typeof modeAPI.exit === 'function') modeAPI.exit();
      else modeAPI.set('macro');
    } else {
      selAPI.clear();
    }
  }

  function attach(domElement) {
    detach();
    el = domElement;
    el.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    el.addEventListener('pointermove', onMove, { capture: true, passive: true });
    el.addEventListener('pointerup', onUp, { capture: true, passive: true });
    el.addEventListener('pointercancel', onCancel, { capture: true, passive: true });
    el.addEventListener('pointerleave', onCancel, { capture: true, passive: true });
  }

  function detach() {
    if (!el) return;
    el.removeEventListener('pointerdown', onDown, { capture: true });
    el.removeEventListener('pointermove', onMove, { capture: true });
    el.removeEventListener('pointerup', onUp, { capture: true });
    el.removeEventListener('pointercancel', onCancel, { capture: true });
    el.removeEventListener('pointerleave', onCancel, { capture: true });
    el = null;
    down = null;
  }

  return { attach, detach };
}
