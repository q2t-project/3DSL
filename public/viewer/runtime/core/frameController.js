// viewer/runtime/core/frameController.js

// uiState.frame と visibilityController をつないで
// - 現在フレームの保持
// - フレーム移動時に visibleSet を再計算
// をやる役。
// A-5 対応：後から core.recomputeVisibleSet を差し込めるフックを用意する。
// runtime/core/frameController.js

export function createFrameController(uiState, visibilityController) {
  if (!uiState.frame) {
    uiState.frame = { current: 0, range: { min: 0, max: 0 } };
  }

  // 正規の再計算ルート（core.recomputeVisibleSet を差し込む想定）
  let recomputeHandler = null;

  let range = uiState.frame.range || { min: 0, max: 0 };
  if (!uiState.frame.range) {
    uiState.frame.range = range;
  }

  if (typeof range.min !== "number") range.min = 0;
  if (typeof range.max !== "number") range.max = range.min;
  if (range.max < range.min) range.max = range.min;

  if (typeof uiState.frame.current !== "number") {
    uiState.frame.current = range.min;
  }

  function clampFrame(n) {
    if (!Number.isFinite(n)) return uiState.frame.current;
    n = Math.round(n);
    if (n < range.min) return range.min;
    if (n > range.max) return range.max;
    return n;
  }

  function recomputeVisible() {
    // A-5: 正規ルート（core.recomputeVisibleSet）が入っていればそれだけ呼ぶ
    if (typeof recomputeHandler === "function") {
      return recomputeHandler(); // uiState.visibleSet への反映や renderer は core 側
    }

    // フォールバック：visibilityController 単体で再計算し、
    // uiState.visibleSet だけ更新しておく（renderer は触らない）
    if (
      visibilityController &&
      typeof visibilityController.recompute === "function"
    ) {
      const subsets = visibilityController.recompute();

      const toArray = (s) =>
        s instanceof Set
          ? Array.from(s)
          : Array.isArray(s)
          ? s.slice()
          : [];

      const visibleSet =
        subsets && typeof subsets === "object"
          ? {
              points: toArray(subsets.points),
              lines:  toArray(subsets.lines),
              aux:    toArray(subsets.aux),
            }
          : {
              points: [],
              lines:  [],
              aux:    [],
            };

      uiState.visibleSet = visibleSet;
      return visibleSet;
    }

    return uiState.visibleSet;
  }


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
    // ★ ここが重要：必ず {min,max} を返す
    return { min: range.min, max: range.max };
  }

  function startPlayback() {
    if (!uiState.runtime) uiState.runtime = {};
    uiState.runtime.isFramePlaying = true;
  }

  function stopPlayback() {
    if (!uiState.runtime) uiState.runtime = {};
    uiState.runtime.isFramePlaying = false;
  }

  function setRecomputeHandler(fn) {
    recomputeHandler = typeof fn === "function" ? fn : null;
  }

  return {
    set,
    get,
    step,
    range: getRange,
    startPlayback,
    stopPlayback,
    setRecomputeHandler,
  };
}
