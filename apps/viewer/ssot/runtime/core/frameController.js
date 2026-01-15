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

  const FIXED_FPS = 1;
  // fps は常に固定（外部から変更させない）
  playback.fps = FIXED_FPS;

  if (!Number.isFinite(playback.accumulator) || playback.accumulator < 0) {
    playback.accumulator = 0;
  }
  // ループは viewer では必須寄り。明示 false できるようにする
  if (typeof playback.loop !== "boolean") playback.loop = true;

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
    // fps は固定
    playback.fps = FIXED_FPS;
    if (opts && typeof opts.loop === "boolean") playback.loop = opts.loop;
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

    const fps = FIXED_FPS;
    const loop = playback.loop === true;

    playback.accumulator += dt * fps;
    if (playback.accumulator < 1) return uiState.frame.current;
    // スライド再生：追いつき再生せず、次の保持時間を作り直す
    playback.accumulator = 0;

  const before = uiState.frame.current;
  const after = clampFrame(before + 1);

  // 進めない（=上限）なら停止
    if (after === before) {
      if (loop) {
        const r = (uiState.frame && uiState.frame.range) || range;
        setActiveInternal(r.min, "playback.loop");
        return uiState.frame.current;
      }
      stopPlayback();
      return before;
    }

    setActiveInternal(after, "playback");

    // loop=false のときだけ従来どおり止める
    if (!loop) {
      const r = (uiState.frame && uiState.frame.range) || range;
      if (uiState.frame.current >= r.max) stopPlayback();
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
    updatePlayback,
    setRecomputeHandler,
  };
}
