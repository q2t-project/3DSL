// ============================================================
// frameController.js
//  - frame のアクティブ番号管理
//  - appearance.frames に応じて可視/不可視切り替え
//  - cameraEngine.onFrameChange を通知
// ============================================================

/**
 * @param {Object} params
 * @param {Object} params.struct
 * @param {Map<string,any>} params.indexByUUID
 * @param {Object} params.ui_state
 * @param {Object} params.rendererContext
 * @param {import("./CameraEngine.js").CameraEngine} params.cameraEngine
 */
export function createFrameController({
  struct,
  indexByUUID, // いまは未使用だが将来用に保持
  ui_state,
  rendererContext,
  cameraEngine,
}) {
  const { setElementVisibility } = rendererContext || {};
  const appliesFrame = typeof setElementVisibility === "function";

  function elementVisibleInFrame(frames, active) {
    if (frames == null) return true;
    if (typeof frames === "number") return frames === active;
    if (Array.isArray(frames)) return frames.includes(active);
    return true;
  }

  function applyFrame(frame) {
    ui_state.activeFrame = frame;

    if (appliesFrame) {
      (struct.points || []).forEach((p) => {
        const uuid = p?.meta?.uuid;
        if (!uuid) return;
        const visible = elementVisibleInFrame(p?.appearance?.frames, frame);
        setElementVisibility({ uuid, visible });
      });

      (struct.lines || []).forEach((l) => {
        const uuid = l?.meta?.uuid;
        if (!uuid) return;
        const visible = elementVisibleInFrame(l?.appearance?.frames, frame);
        setElementVisibility({ uuid, visible });
      });

      (struct.aux || []).forEach((a) => {
        const uuid = a?.meta?.uuid;
        if (!uuid) return;
        const visible = elementVisibleInFrame(a?.appearance?.frames, frame);
        setElementVisibility({ uuid, visible });
      });
    }

    cameraEngine.onFrameChange(frame);
  }

  function setActiveFrame(frame) {
    const { min, max } = ui_state.frameRange || {};
    let clamped = frame;
    if (typeof min === "number" && typeof max === "number") {
      clamped = Math.max(min, Math.min(max, frame));
    }
    applyFrame(clamped);
  }

  return {
    setActiveFrame,
    applyFrame,
  };
}
