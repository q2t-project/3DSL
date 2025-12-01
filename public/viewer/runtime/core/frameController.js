// viewer/runtime/core/frameController.js

// uiState.frame と visibilityController をつないで
// - 現在フレームの保持
// - フレーム移動時に visibleSet を再計算
// をやる役。
// A-5 対応：後から core.recomputeVisibleSet を差し込めるフックを用意する。

export function createFrameController(uiState, visibilityController) {
  if (!uiState.frame) {
    uiState.frame = { current: 0, range: { min: 0, max: 0 } };
  }

  // A-5: visibleSet 再計算の正規ルート（後から差し替え可能なハンドラ）
  // ここに core.recomputeVisibleSet を注入できるようにしておく。
  let recomputeHandler = null;

  const range = uiState.frame.range || { min: 0, max: 0 };
  // fallback オブジェクトを使った場合は、ちゃんと uiState 側にも反映しておく
  if (!uiState.frame.range) {
    uiState.frame.range = range;
  }

  // range の妥当化
  if (typeof range.min !== "number") range.min = 0;
  if (typeof range.max !== "number") range.max = range.min;

  // min > max になっていた場合は揃えておく
  if (range.max < range.min) {
    range.max = range.min;
  }

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
    // まず、外部から差し込まれた正規ルートがあればそちらを優先
    if (typeof recomputeHandler === "function") {
      const next = recomputeHandler();
      if (next) {
        uiState.visibleSet = next;
      }
      return uiState.visibleSet;
    }

    // フォールバック：従来どおり visibilityController に直接委譲
    if (
      visibilityController &&
      typeof visibilityController.recompute === "function"
    ) {
      // visibilityController 側で uiState.visibleSet を更新してくれる想定やけど、
      // 戻り値もそのまま同期しておく（冗長やけど安全側）。
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

  // A-5: core 側から「正規の再計算ルート」を注入するためのフック。
  // 例: frameController.setRecomputeHandler(() => core.recomputeVisibleSet());
  function setRecomputeHandler(fn) {
    if (typeof fn === "function") {
      recomputeHandler = fn;
    } else {
      // 無効な値が来たら外しておく（安全側）
      recomputeHandler = null;
    }
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
