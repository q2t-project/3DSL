// viewer/runtime/core/frameController.js
//
// uiState.frame と visibilityController をつないで
// - 現在フレームの保持
// - フレーム移動時に visibleSet を再計算
// をやる役。
// A-5 対応：後から core.recomputeVisibleSet を差し込めるフックを用意する。

export function createFrameController(uiState, visibilityController) {
  if (!uiState?.frame || typeof uiState.frame !== "object") {
    throw new Error("frameController: uiState.frame missing (contract)");
  }
  if (!uiState?.runtime || typeof uiState.runtime !== "object") {
    throw new Error("frameController: uiState.runtime missing (contract)");
  }

  // A-5: visibleSet 再計算の正規ルート（後から差し替え可能なハンドラ）
  // ここに core.recomputeVisibleSet を注入できるようにしておく。
  let recomputeHandler = null;

  const range = uiState.frame.range;
  if (!range || typeof range !== "object") throw new Error("frameController: frame.range missing");

  // 妥当化は createUiState 側で終わってる前提（ここでは assert のみ）

  // ------------------------------------------------------------
  // playback state（Phase2: updatePlayback 導入）
  // ------------------------------------------------------------
  // fps は「1秒あたり何フレーム進めるか」の目安。
  // dev harness 側が setInterval でも、renderLoop(dt) でも両対応できる。
  const playback = uiState.frame.playback;
  if (!playback || typeof playback !== "object") throw new Error("frameController: frame.playback missing");

  if (!Number.isFinite(playback.fps) || playback.fps <= 0) playback.fps = 6;
  if (!Number.isFinite(playback.accumulator) || playback.accumulator < 0) {
    playback.accumulator = 0;
  }

  // ------------------------------------------------------------
  // 内部ユーティリティ
  // ------------------------------------------------------------
  function clampFrame(n) {
    if (!Number.isFinite(n)) return uiState.frame.current;

    // frames は schema 上 integer 前提なので丸める
    n = Math.trunc(n);

    const r = (uiState.frame && uiState.frame.range) || range;
    if (n < r.min) return r.min;
    if (n > r.max) return r.max;
    return n;
  }

  function recomputeVisible(reason = "frame") {
    // 正規ルートがあればそれを優先
    if (typeof recomputeHandler === "function") {
      // recomputeVisibleSet 側が uiState.visibleSet を確定する前提
      const out = recomputeHandler({ reason });
      return typeof out !== "undefined" ? out : uiState.visibleSet;
    }

    // Phase2 方針：ここでは計算しない（正規ルート未注入なら現状維持）
    return uiState.visibleSet;
  }

  function setActiveInternal(n, reason) {
    const next = clampFrame(n);
    const cur = uiState.frame.current;
    if (next === cur) return cur;
    uiState.frame.current = next;
    recomputeVisible(reason || "frame");
    return next;
  }

  // ------------------------------------------------------------
  // 公開 API（新名に統一）
  // ------------------------------------------------------------

  function setActive(n) {
    return setActiveInternal(n, "frame");
  }

  function getActive() {
    return uiState.frame.current;
  }

  function stepFrame(delta) {
    if (!Number.isFinite(delta)) delta = 0;
    return setActive(uiState.frame.current + delta);
  }

  function next() {
    return stepFrame(+1);
  }

  function prev() {
    return stepFrame(-1);
  }

  function getRange() {
    const r = (uiState.frame && uiState.frame.range) || range;
    return { min: r.min, max: r.max };
  }

  function startPlayback(opts = {}) {
    uiState.runtime.isFramePlaying = true;

    // fps 指定が来たら反映（任意）
    if (opts && Number.isFinite(opts.fps) && opts.fps > 0) {
      playback.fps = opts.fps;
    }

    // 開始時は積算をリセット（意図せず飛ばないように）
    playback.accumulator = 0;
  }

  function stopPlayback() {
    uiState.runtime.isFramePlaying = false;

    // 停止時も積算リセット
    playback.accumulator = 0;
  }

  // ★ Phase2 推奨 → 必須へ：dt(sec) で再生を進める
  // - isFramePlaying=false なら何もしない
  // - range.max に到達したら止める（安全側）
  function updatePlayback(dt) {
    if (!uiState.runtime?.isFramePlaying) return uiState.frame.current;
    if (!Number.isFinite(dt) || dt <= 0) return uiState.frame.current;

    const fps = Number.isFinite(playback.fps) && playback.fps > 0 ? playback.fps : 6;

    playback.accumulator += dt * fps;

    const steps = Math.floor(playback.accumulator);
    if (steps <= 0) return uiState.frame.current;

    playback.accumulator -= steps;

    const before = uiState.frame.current;
    const after = clampFrame(before + steps);

    // 進めない（=上限）なら停止
    if (after === before) {
      stopPlayback();
      return before;
    }

    setActiveInternal(after, "playback");

    // 上限に当たったら止める（loop仕様は Phase2後半で決める）
    const r = (uiState.frame && uiState.frame.range) || range;
    if (uiState.frame.current >= r.max) {
      stopPlayback();
    }
    return uiState.frame.current;
  }

  // A-5: core 側から「正規の再計算ルート」を注入するフック。
  function setRecomputeHandler(fn) {
    recomputeHandler = typeof fn === "function" ? fn : null;
  }

  return {
    setActive,
    getActive,
    next,
    prev,
    getRange,
    startPlayback,
    stopPlayback,
    updatePlayback, // ★ 追加
    setRecomputeHandler,
  };
}
