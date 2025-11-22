// ============================================================
// gizmoController.js
//  - ギズモからの軸スナップ / ホーム操作を CameraEngine に橋渡し
// ============================================================

/**
 * @param {Object} params
 * @param {import("./CameraEngine.js").CameraEngine} params.cameraEngine
 */
export function createGizmoController({ cameraEngine }) {
  function onAxisClick(axis) {
    cameraEngine.snapToAxis(axis);
  }

  function onHomeClick() {
    cameraEngine.reset();
  }

  return { onAxisClick, onHomeClick };
}
