// viewer/ui/timeline.js
// Frame UI の正規実装：DOM 配線 + 再生トグル + UI 同期

import { createHubFacade } from "./hubFacade.js";

export function createTimeline(hub, opts = {}) {
  const DEBUG = !!opts.debug;
  const onToast =
    (typeof opts.onToast === 'function' && opts.onToast) ||
    (typeof opts.toast === 'function' && opts.toast) ||
    null;

  let doc = null;
  let win = null;
  let getEl = null; // (roleName) => element

  // DOM
  let slider = null;
  let sliderWrapper = null;
  let frameBlock = null;
  let frameControls = null;

  let labelCurrent = null; // 新: frame-label-current / 旧: frame-slider-label
  let labelMin = null;
  let labelMax = null;
  let labelZero = null;
  let zeroLine = null;

  let btnRew = null;
  let btnPlay = null;
  let btnFF = null;
  let btnStepBack = null;
  let btnStepForward = null;

  // loop state
  let rafId = 0;
  let lastFrame = null;

  // button handlers（detach で外すために参照保持）
  let onClickStepBack = null;
  let onClickStepForward = null;
  let onClickRew = null;
  let onClickFF = null;
  let onClickPlay = null;

  // host 側のグローバルハンドラ（メニュー/スワイプ等）への誤伝播を避ける
  let onPointerDownStop = null;

  function log(...a) {
    if (DEBUG) console.log('[timeline]', ...a);
  }
  const hf = (() => {
    try { return createHubFacade(hub); } catch { return null; }
  })();

  function getHF() {
    return hf;
  }

  function getFrameAPI() {
    const hf = getHF();
    if (!hf) return null;
    return hf.getFrameApi?.() ?? null;
  }

  function readRange(frameAPI) {
    if (frameAPI && typeof frameAPI.getRange === 'function') {
      const r = frameAPI.getRange();
      if (r && Number.isFinite(r.min) && Number.isFinite(r.max)) return r;
    }

    return { min: 0, max: 0 };
  }

  function getActive(frameAPI, range) {
    if (frameAPI && typeof frameAPI.getActive === 'function') {
      const n = frameAPI.getActive();
      if (Number.isFinite(n)) return n;
    }
    return range.min;
  }

  function setActive(frameAPI, n) {
    if (!Number.isFinite(n)) return;
    if (frameAPI && typeof frameAPI.setActive === 'function') {
      frameAPI.setActive(n);
      return;
    }
    if (frameAPI && typeof frameAPI.set === 'function') {
      frameAPI.set(n);
      return;
    }
    console.warn('[timeline] setActive: no frameAPI.setActive/set available');
  }

  function step(frameAPI, delta) {
    const range = readRange(frameAPI);
    const cur = getActive(frameAPI, range);
    const next = Math.max(range.min, Math.min(range.max, cur + delta));
    setActive(frameAPI, next);
  }

  function isPlaying(frameAPI = null) {
    const f = frameAPI || getFrameAPI();
    if (f && typeof f.isPlaying === 'function') return !!f.isPlaying();

    const hf = getHF();
    const rt = hf?.getRuntime?.() ?? null;
    if (rt && typeof rt.isFramePlaying === 'function') return !!rt.isFramePlaying();
    return false; // contract がない場合は UIは「停止状態として扱う」として扱う
  }

  function startPlayback(frameAPI) {
    const fps = FIXED_FPS;

    if (frameAPI && typeof frameAPI.startPlayback === 'function') {
      frameAPI.startPlayback({ fps, loop: true });
    } else {
      console.warn('[timeline] startPlayback: frameAPI.startPlayback missing (contract broken)');
      return;
    }

    setPlayButtonState(true);
    setFrameUiMode('timeline');
    toast(`Frame: play [${readRange(frameAPI).min} … ${readRange(frameAPI).max}]`, {
      duration: 800,
    });
  }

  function stopPlayback(frameAPI) {
    if (frameAPI && typeof frameAPI.stopPlayback === 'function') {
      frameAPI.stopPlayback();
    } else {
      console.warn('[timeline] stopPlayback: frameAPI.stopPlayback missing (contract broken)');
    }

    setPlayButtonState(false);
    setFrameUiMode('gauge');
    toast(`Frame: stop (frame ${getActive(frameAPI, readRange(frameAPI))})`, { duration: 800 });
  }

  function togglePlayback() {
    const frameAPI = getFrameAPI();
    const range = readRange(frameAPI);
    const hasMultiple = range.max > range.min;
    if (!hasMultiple) return;

    if (isPlaying(frameAPI)) stopPlayback(frameAPI);
    else startPlayback(frameAPI);
  }

  const FIXED_FPS = 1;

  function setPlayButtonState(playing) {
    if (!btnPlay) return;
    btnPlay.classList.toggle('is-playing', !!playing);
  }

  function setFrameUiMode(mode) {
    if (frameControls) {
      frameControls.classList.toggle('mode-continuous', mode === 'timeline');
    }
    if (slider) {
      slider.classList.toggle('frame-mode-timeline', mode === 'timeline');
      slider.classList.toggle('frame-mode-gauge', mode !== 'timeline');
    }
  }

  function toast(text, opt) {
    if (!onToast || !text) return;
    onToast(text, { level: 'info', duration: 700, ...(opt || {}) });
  }

  function updateZeroMarker(range) {
    if (!sliderWrapper) return;

    const ZERO_FRAME = 0;
    const span = range.max - range.min;
    const zeroInRange = ZERO_FRAME >= range.min && ZERO_FRAME <= range.max;

    if (!Number.isFinite(span) || span <= 0 || !zeroInRange) {
      sliderWrapper.style.setProperty('--frame-zero-frac', '0.5');
      if (labelZero) labelZero.style.display = 'none';
      if (zeroLine) zeroLine.style.display = 'none';
      return;
    }

    const zeroIsMin = ZERO_FRAME === range.min;
    const zeroIsMax = ZERO_FRAME === range.max;
    const hideZero = zeroIsMin || zeroIsMax;

    if (hideZero) {
      if (labelZero) labelZero.style.display = 'none';
      if (zeroLine) zeroLine.style.display = 'none';
    } else {
      const frac = (ZERO_FRAME - range.min) / span;
      const clamped = Math.max(0, Math.min(1, frac));
      sliderWrapper.style.setProperty('--frame-zero-frac', String(clamped));
      if (labelZero) {
        labelZero.style.display = '';
        labelZero.textContent = '0';
      }
      if (zeroLine) zeroLine.style.display = '';
    }
  }

  function syncEnabledState(range) {
    const hasMultiple = range.max > range.min;

    if (frameBlock) frameBlock.classList.toggle('frame-single', !hasMultiple);

    const controls = [slider, btnRew, btnPlay, btnFF, btnStepBack, btnStepForward];
    controls.forEach((el) => {
      if (!el) return;
      el.disabled = !hasMultiple;
    });

    // range を slider に反映
    if (slider) {
      slider.min = range.min;
      slider.max = range.max;
      slider.step = 1;
    }
  }

  function syncValueUI(frameAPI, range) {
    const f = getActive(frameAPI, range);

    if (slider) slider.value = String(f);
    if (labelCurrent) labelCurrent.textContent = String(f);

    // CSS 変数（丸ラベル位置用）
    if (sliderWrapper) {
      const span = range.max - range.min;
      if (!Number.isFinite(span) || span <= 0) {
        sliderWrapper.style.setProperty('--frame-value-frac', '0');
      } else {
        let frac = (f - range.min) / span;
        frac = Math.max(0, Math.min(1, frac));
        sliderWrapper.style.setProperty('--frame-value-frac', String(frac));
      }
    }
  }

  // -------------------------
  // イベントハンドラ
  // -------------------------
  function onSliderInput(ev) {
    ev?.stopPropagation?.();
    ev?.stopImmediatePropagation?.();

    const frameAPI = getFrameAPI();
    const range = readRange(frameAPI);

    const v = Number(ev?.target?.value);
    if (!Number.isFinite(v)) return;

    // 手で動かしたら再生は止める
    if (isPlaying()) stopPlayback(frameAPI);

    setActive(frameAPI, v);
    setFrameUiMode('gauge');
    syncValueUI(frameAPI, range);
  }

  function onSliderChange() {
    // change は UI だけなので、念のため伝播を止めておく
    // （click が別レイヤに吸われる系の事故回避）
    // ※ 引数が無いので current event は取れないが、bubble は input 側で遮断済み
    const frameAPI = getFrameAPI();
    toast(`Frame: ${getActive(frameAPI, readRange(frameAPI))}`, { duration: 800 });
  }

  function onKeyDown(ev) {
    // 入力欄は無視
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (ev.target?.isContentEditable) return;

    if (ev.code === 'Space') {
      ev.preventDefault();
      togglePlayback();
    }
  }

  // -------------------------
  // RAF loop
  // -------------------------
  let lastRangeKey = null; // "min:max"
  function loop() {
    if (!doc || !win) return;

    const frameAPI = getFrameAPI();
    const range = readRange(frameAPI);
    const rangeKey = `${range.min}:${range.max}`;
    if (rangeKey !== lastRangeKey) {
      lastRangeKey = rangeKey;
      if (labelMin) labelMin.textContent = String(range.min);
      if (labelMax) labelMax.textContent = String(range.max);
      syncEnabledState(range);
      updateZeroMarker(range);
      // mode/playing は状況に合わせて再同期
      setPlayButtonState(isPlaying(frameAPI));
    }

    // UI 同期（frame 変化時だけ）
    const curFrame = getActive(frameAPI, range);
    if (curFrame !== lastFrame) {
      lastFrame = curFrame;
      syncValueUI(frameAPI, range);
    }

    rafId = win.requestAnimationFrame(loop);
  }

  // -------------------------
  // attach / detach
  // -------------------------
  function attach(ctx = {}) {
    detach();
    doc = ctx.doc || document;
    win = ctx.win || doc.defaultView || window;
    getEl = typeof ctx.el === 'function' ? ctx.el : null;
    if (!getEl) {
      console.warn('[timeline] attach: role resolver (ctx.el) missing; timeline disabled');
      return;
    }
    const el = (roleName) => getEl(roleName);

    const stopAndPrevent = (ev) => {
      ev?.preventDefault?.();
      ev?.stopPropagation?.();
      ev?.stopImmediatePropagation?.();
    };
    const stopBubble = (ev) => {
      ev?.stopPropagation?.();
      ev?.stopImmediatePropagation?.();
    };

    onPointerDownStop = stopBubble;

    // DOM: 新UI / 旧UI両対応
    slider = el('frameSlider');
    sliderWrapper = el('frameSliderWrapper');
    frameBlock = el('frameBlock');
    frameControls = el('frameControls');

    labelCurrent = el('frameLabelCurrent');
    labelMin = el('frameLabelMin');
    labelMax = el('frameLabelMax');
    labelZero = el('frameLabelZero');
    zeroLine = el('frameZeroLine');

    btnRew = el('btnRew');
    btnPlay = el('btnPlay');
    btnFF = el('btnFf');
    btnStepBack = el('btnStepBack');
    btnStepForward = el('btnStepForward');

    const frameAPI = getFrameAPI();
    const range = readRange(frameAPI);
    lastRangeKey = `${range.min}:${range.max}`;

    // range ラベル
    if (labelMin) labelMin.textContent = String(range.min);
    if (labelMax) labelMax.textContent = String(range.max);

    syncEnabledState(range);
    updateZeroMarker(range);
    syncValueUI(frameAPI, range);

    // すでに再生状態ならボタン見た目を合わせる
    const playing = isPlaying(frameAPI);
    setPlayButtonState(playing);
    setFrameUiMode(playing ? 'timeline' : 'gauge');

    // listeners
    if (slider) {
      slider.addEventListener('input', onSliderInput);
      slider.addEventListener('change', onSliderChange);
      // swipe 等の誤検知を避ける
      slider.addEventListener('pointerdown', onPointerDownStop, { capture: true });
    }

    onClickStepBack = (ev) => {
      stopAndPrevent(ev);
      const f = getFrameAPI();
      const r = readRange(f);
      step(f, -1);
      syncValueUI(f, r);
      setFrameUiMode('gauge');
      toast(`Frame: ${getActive(f, r)}`, { duration: 800 });
    };
    onClickStepForward = (ev) => {
      stopAndPrevent(ev);
      const f = getFrameAPI();
      const r = readRange(f);
      step(f, +1);
      syncValueUI(f, r);
      setFrameUiMode('gauge');
      toast(`Frame: ${getActive(f, r)}`, { duration: 800 });
    };
    onClickRew = (ev) => {
      stopAndPrevent(ev);
      const f = getFrameAPI();
      const r = readRange(f);
      setActive(f, r.min);
      syncValueUI(f, r);
      setFrameUiMode('gauge');
      toast(`Frame: ${getActive(f, r)}`, { duration: 800 });
    };
    onClickFF = (ev) => {
      stopAndPrevent(ev);
      const f = getFrameAPI();
      const r = readRange(f);
      setActive(f, r.max);
      syncValueUI(f, r);
      setFrameUiMode('gauge');
      toast(`Frame: ${getActive(f, r)}`, { duration: 800 });
    };

    if (btnStepBack) btnStepBack.addEventListener('click', onClickStepBack);
    if (btnStepForward) btnStepForward.addEventListener('click', onClickStepForward);
    if (btnRew) btnRew.addEventListener('click', onClickRew);
    if (btnFF) btnFF.addEventListener('click', onClickFF);

    onClickPlay = (ev) => {
      stopAndPrevent(ev);
      togglePlayback();
    };
    if (btnPlay) btnPlay.addEventListener('click', onClickPlay);

    // pointerdown を先に遮断（click 前にホスト側が拾う事故回避）
    [btnStepBack, btnStepForward, btnRew, btnPlay, btnFF].forEach((b) => {
      if (!b) return;
      b.addEventListener('pointerdown', onPointerDownStop, { capture: true });
    });

    win.addEventListener('keydown', onKeyDown);

    // RAF start
    lastFrame = null;
    rafId = win.requestAnimationFrame(loop);

    log('attached', { range });
  }

  function detach() {
    if (!doc) return;

    // 先に RAF 停止
    if (rafId && win) win.cancelAnimationFrame(rafId);
    rafId = 0;
    lastFrame = null;
    lastRangeKey = null;

    // listeners 제거
    if (slider) {
      slider.removeEventListener('input', onSliderInput);
      slider.removeEventListener('change', onSliderChange);
      if (onPointerDownStop) slider.removeEventListener('pointerdown', onPointerDownStop, { capture: true });
    }
    if (btnPlay && onClickPlay) btnPlay.removeEventListener('click', onClickPlay);

    if (btnStepBack && onClickStepBack) btnStepBack.removeEventListener('click', onClickStepBack);
    if (btnStepForward && onClickStepForward)
      btnStepForward.removeEventListener('click', onClickStepForward);
    if (btnRew && onClickRew) btnRew.removeEventListener('click', onClickRew);
    if (btnFF && onClickFF) btnFF.removeEventListener('click', onClickFF);

    if (onPointerDownStop) {
      [btnStepBack, btnStepForward, btnRew, btnPlay, btnFF].forEach((b) => {
        if (!b) return;
        b.removeEventListener('pointerdown', onPointerDownStop, { capture: true });
      });
    }

    if (win) win.removeEventListener('keydown', onKeyDown);

    onClickStepBack = null;
    onClickStepForward = null;
    onClickRew = null;
    onClickFF = null;
    onClickPlay = null;
    onPointerDownStop = null;

    // DOM refs clear
    doc = null;
    win = null;
    getEl = null;

    slider = null;
    sliderWrapper = null;
    frameBlock = null;
    frameControls = null;

    labelCurrent = null;
    labelMin = null;
    labelMax = null;
    labelZero = null;
    zeroLine = null;

    btnRew = null;
    btnPlay = null;
    btnFF = null;
    btnStepBack = null;
    btnStepForward = null;
  }

  return { attach, detach };
}
