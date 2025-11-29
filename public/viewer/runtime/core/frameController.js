// viewer/runtime/core/frameController.js

// uiState.frame と visibilityController をつないで
// - 現在フレームの保持
// - フレーム移動時に visibleSet を再計算
// をやる役。

export function createFrameController(uiState, visibilityController) {
  if (!uiState.frame) {
    uiState.frame = { current: 0, range: { min: 0, max: 0 } };
  }

  const range = uiState.frame.range || { min: 0, max: 0 };

  // range の妥当化
  if (typeof range.min !== "number") range.min = 0;
  if (typeof range.max !== "number") range.max = range.min;

  if (typeof uiState.frame.current !== "number") {
    uiState.frame.current = range.min;
  }

  // ------------------------------------------------------------
  // 内部ユーティリティ
  // ------------------------------------------------------------
  function clampFrame(n) {
    if (!Number.isFinite(n)) return uiState.frame.current;
    if (n < range.min) return range.min;
    if (n > range.max) return range.max;
    return n;
  }

  function recomputeVisible() {
    if (
      visibilityController &&
      typeof visibilityController.recompute === "function"
    ) {
      uiState.visibleSet = visibilityController.recompute();
    }
    return uiState.visibleSet;
  }

  // ------------------------------------------------------------
  // 公開 API
  // ------------------------------------------------------------
  function set(n) {
    const next = clampFrame(n);
    uiState.frame.current = next;
    recomputeVisible();
    return next;
  }

  function get() {
    return uiState.frame.current;
  }

  function step(delta) {
    if (!Number.isFinite(delta)) delta = 0;
    return set(uiState.frame.current + delta);
  }

  function getRange() {
    return { min: range.min, max: range.max };
  }

  function startPlayback() {
    if (!uiState.runtime) uiState.runtime = {};
    uiState.runtime.isFramePlaying = true;
    // 実際のタイマー再生は dev HTML 側（setInterval）でやってるので、
    // ここではフラグだけ立てておく。
  }

  function stopPlayback() {
    if (!uiState.runtime) uiState.runtime = {};
    uiState.runtime.isFramePlaying = false;
  }

  return {
    set,
    get,
    step,
    range: getRange,
    startPlayback,
    stopPlayback,
  };
}
