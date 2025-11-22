// ============================================================
// microVisualController.js
//  - micro / meso 視覚補助のための focus 位置計算
//  - rendererContext.applyFocusFX(payload) に委譲
// ============================================================

/**
 * @param {Object} params
 * @param {Object} params.struct
 * @param {Object} params.ui_state
 * @param {Map<string,any>} params.indexByUUID
 * @param {Object} params.rendererContext
 */
export function createMicroVisualController({
  struct,
  ui_state,
  indexByUUID,
  rendererContext,
}) {
  const { applyFocusFX } = rendererContext || {};

  function computeFocusOrigin(uuid) {
    const info = indexByUUID.get(uuid);
    if (!info) return null;

    if (info.kind === "point") {
      const p = info.ref;
      const pos = p?.appearance?.position;
      if (Array.isArray(pos) && pos.length >= 3) return [...pos];
      return [0, 0, 0];
    }

    if (info.kind === "line") {
      const l = info.ref;
      const a = l?.appearance?.end_a;
      const b = l?.appearance?.end_b;

      const getCoord = (end) => {
        if (!end) return null;
        if (end.ref) {
          const pInfo = indexByUUID.get(end.ref);
          if (pInfo && pInfo.kind === "point") {
            const pos = pInfo.ref?.appearance?.position;
            if (Array.isArray(pos) && pos.length >= 3) return pos;
          }
          return null;
        }
        if (Array.isArray(end.coord) && end.coord.length >= 3) {
          return end.coord;
        }
        return null;
      };

      const ca = getCoord(a) || [0, 0, 0];
      const cb = getCoord(b) || [0, 0, 0];
      return [
        (ca[0] + cb[0]) / 2,
        (ca[1] + cb[1]) / 2,
        (ca[2] + cb[2]) / 2,
      ];
    }

    if (info.kind === "aux") {
      const a = info.ref;
      const pos = a?.appearance?.position;
      if (Array.isArray(pos) && pos.length >= 3) return [...pos];
      return [0, 0, 0];
    }

    return null;
  }

  function applyFocusState() {
    if (typeof applyFocusFX !== "function") return;

    if (!ui_state.focus.active || !ui_state.focus.uuid) {
      applyFocusFX(null); // 全解除
      return;
    }

    const origin = computeFocusOrigin(ui_state.focus.uuid);
    if (!origin) {
      applyFocusFX(null);
      return;
    }

    const payload = {
      mode: ui_state.mode,
      uuid: ui_state.focus.uuid,
      origin,
      activeFrame: ui_state.activeFrame,
      settings: ui_state.viewerSettings,
    };

    applyFocusFX(payload);
  }

  function enter(uuid) {
    ui_state.focus.active = true;
    ui_state.focus.uuid = uuid;
    applyFocusState();
  }

  function exit() {
    ui_state.focus.active = false;
    ui_state.focus.uuid = null;
    applyFocusState();
  }

  function update() {
    applyFocusState();
  }

  return { enter, exit, update };
}
