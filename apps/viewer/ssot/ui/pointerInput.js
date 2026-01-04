// viewer/ui/pointerInput.js
// PATCH: drag-capture-window-v5.1 (fix int undefined + keep rearm+debug)
// canvas 上の pointer / wheel イベントを受けて
// hubFacade(camera/selection/mode) を操作する UI 入力アダプタ。
import { mapDragToOrbitDelta } from './orbitMapping.js';
import { createHubFacade } from './hubFacade.js';
import { DEFAULT_INPUT_POINTER, resolveInputDefaults } from '../runtime/core/inputDefaults.js';


function _num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function _int(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export class PointerInput {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import("../runtime/viewerHub.js").ViewerHub} hub
   */
  constructor(canvas, hub) {
    this.canvas = canvas;
    this.win = canvas?.ownerDocument?.defaultView || window;
    this.hub = hub;
    this.hf = null;
    try {
      this.hf = createHubFacade(hub);
    } catch (_e) {
      this.hf = null;
    }

    this.isPointerDown = false;
    this.activeMode = null; // "rotate" | "pan" | null
    this.lastX = 0;
    this.lastY = 0;

    this.downX = 0;
    this.downY = 0;

    this.clickPending = false;
    this._activePointerId = null;
    this._dragging = false;

    this._useMouseFallback = false;
    this._startButtonsMask = 0;

    // debug (enable with ?inputDebug=1)
    this._debug = false;
    this._dbgSeq = 0;
    try {
      const u = new URL(this.win.location.href);
      this._debug = u.searchParams.get('inputDebug') === '1';
    } catch (_eU) {}
    if (this._debug) {
      this.win.__3DSL_INPUT_LOG = this.win.__3DSL_INPUT_LOG || [];
      this._log('init', { href: String(this.win.location?.href || '') });
    }

    // preset fallback (when uiState is not yet ready)
    this._preset = null;
    try {
      const u = new URL(this.win.location.href);
      this._preset = u.searchParams.get('preset');
    } catch (_eP) {}
    this._presetResolved = resolveInputDefaults(this._preset);

    // reduce browser default gestures / selections that can trigger pointercancel
    try {
      this.canvas.style.touchAction = 'none';
      this.canvas.style.userSelect = 'none';
      this.canvas.style.webkitUserSelect = 'none';
    } catch (_eS) {}

    this._camSnap = { target: { x: 0, y: 0, z: 0 } };

    // UI から見える統一 camera API だけ触る
    this.camera = this._resolveCamera();

    // ハンドラは自分自身に bind しておく（dispose 時に外せるように）
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = (e) => e.preventDefault();

    // イベント登録
    // - pointerdown は canvas 起点
    // - move/up/cancel は window にも張る（canvas 外や overlay 上でも取りこぼさない）
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('dragstart', (e) => { try { e.preventDefault(); } catch (_e) {} });
    canvas.addEventListener('lostpointercapture', (e) => {
      this._log('lostcapture', { pointerId: e?.pointerId, type: e?.pointerType });
    });

    // window blur で押下状態が壊れた時の保険
    try {
      this.win?.addEventListener?.('blur', () => {
        if (this.isPointerDown) {
          this._log('blur', {});
          this.onPointerUp({ pointerId: this._activePointerId, pointerType: 'mouse' });
        }
      }, true);
    } catch (_eB) {}

    // window 側はドラッグ中だけ有効化（onPointerDown/onPointerUp で付け外し）
    this._winMove = (e) => this.onPointerMove(e);
    this._winUp = (e) => this.onPointerUp(e);
    this._winCancel = (e) => this.onPointerCancel(e);

    // mouse fallback (only used when pointercancel happens for mouse)
    this._winMouseMove = (e) => this.onMouseMove(e);
    this._winMouseUp = (e) => this.onMouseUp(e);
  }

  _resolveCamera() {
    const hf = this.hf;
    const camera = hf?.getCamera?.() ?? null;
    if (camera) return camera;
    return null;
  }

  // 後始末用。viewer を破棄するときに呼んでもらう想定。
  dispose() {
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerCancel);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('contextmenu', this.onContextMenu);

    // 念のため window 側も外す（ドラッグ中に dispose されてもリークしない）
    try {
      this.win?.removeEventListener?.('pointermove', this._winMove, true);
      this.win?.removeEventListener?.('pointerup', this._winUp, true);
      this.win?.removeEventListener?.('pointercancel', this._winCancel, true);
      this.win?.removeEventListener?.('mousemove', this._winMouseMove, true);
      this.win?.removeEventListener?.('mouseup', this._winMouseUp, true);
    } catch (_e3) {}
  }

  // ★「毎回 refresh」するヘルパ
  _refreshCamera() {
    const next = this._resolveCamera();
    if (next) this.camera = next;
    return this.camera || next || null;
  }

  stopAutoCamera() {
    const cam = this._refreshCamera();
    if (cam && typeof cam.stopAutoOrbit === 'function') {
      cam.stopAutoOrbit();
    }
  }

  // uiState.viewerSettings.input.pointer を読む（無ければ fallback）
  _getPointerSettings(event) {
    const hf = this.hf;
    const ui = hf?.getUiState?.() ?? null;

    const p0 =
      ui?.viewerSettings?.input?.pointer &&
      typeof ui.viewerSettings.input.pointer === 'object'
        ? ui.viewerSettings.input.pointer
        : null;

    const presetName = ui?.viewerSettings?.inputPreset || this._presetResolved?.name || this._preset;
    const fallbackPointer = resolveInputDefaults(presetName).pointer || DEFAULT_INPUT_POINTER;
    const src = p0 || fallbackPointer;
    const fast = !!event?.shiftKey;

    const minDragPx = Math.max(0, _int(src.minDragPx, fallbackPointer.minDragPx));
    const clickMovePx = Math.max(0, _num(src.clickMovePx, fallbackPointer.clickMovePx));

    const rotateSpeed = _num(
      fast ? src.rotateSpeedFast : src.rotateSpeed,
      fast ? fallbackPointer.rotateSpeedFast : fallbackPointer.rotateSpeed
    );

    const panSpeed = _num(
      fast ? src.panSpeedFast : src.panSpeed,
      fast ? fallbackPointer.panSpeedFast : fallbackPointer.panSpeed
    );

    const panFactor = _num(src.panFactor, fallbackPointer.panFactor);

    const wheelZoomSpeed = _num(
      fast ? src.wheelZoomSpeedFast : src.wheelZoomSpeed,
      fast ? fallbackPointer.wheelZoomSpeedFast : fallbackPointer.wheelZoomSpeed
    );

    return {
      minDragPx,
      clickMovePx,
      rotateSpeed,
      panSpeed,
      panFactor,
      wheelZoomSpeed,
    };
  }

  // camera のメソッドを安全に叩くヘルパ
  dispatch(method, ...args) {
    const cam = this._refreshCamera();
    if (cam && typeof cam[method] === "function") {
      cam[method](...args);
      return true;
    }
    return false;
  }

  // pan スケール計算用に「今の cameraState」を安全に取得する
  getCameraState() {
    const cam = this._refreshCamera();
    if (!cam) return null;

    if (typeof cam.getCurrentSnapshot === "function") {
      return cam.getCurrentSnapshot(this._camSnap);
    }
    if (typeof cam.getSnapshot === "function") {
      return cam.getSnapshot(this._camSnap);
    }
    if (typeof cam.getState === "function") {
      return cam.getState();
    }
    return null;
  }

  // ボタン・修飾キーからドラッグモードを決定
  determineMode(event) {
    if (event.button === 2) return 'pan'; // 右ドラッグ = PAN
    if (event.button === 1) return 'rotate'; // 中ボタン = ROTATE
    if (event.ctrlKey || event.metaKey) return 'pan'; // Ctrl + 左 = PAN
    if (event.altKey) return 'rotate'; // Alt + 左 = ROTATE
    return 'rotate'; // 左だけ → rotate
  }

  _log(type, data) {
    if (!this._debug) return;
    const entry = { t: Date.now(), seq: ++this._dbgSeq, type, data };
    try {
      const arr = this.win.__3DSL_INPUT_LOG;
      arr.push(entry);
      if (arr.length > 200) arr.splice(0, arr.length - 200);
    } catch (_e) {}
    try { console.log('[input]', entry); } catch (_e2) {}
  }

  // pointermove では event.button が -1 になるので、buttons から推定する
  determineModeFromButtons(event) {
    const buttons = typeof event.buttons === 'number' ? event.buttons : 0;
    if (buttons & 2) return 'pan';    // right
    if (buttons & 4) return 'rotate'; // middle
    if (event.ctrlKey || event.metaKey) return 'pan';
    if (event.altKey) return 'rotate';
    return 'rotate';
  }

  _ensureWindowHandlers() {
    try {
      this.win?.addEventListener?.('pointermove', this._winMove, true);
      this.win?.addEventListener?.('pointerup', this._winUp, true);
      this.win?.addEventListener?.('pointercancel', this._winCancel, true);
      this.win?.addEventListener?.('mousemove', this._winMouseMove, true);
      this.win?.addEventListener?.('mouseup', this._winMouseUp, true);
    } catch (_e) {}
  }

  // 何らかの理由で isPointerDown が落ちても、mouse の押下状態が見えてるなら復帰する
  _rearmFromMove(event) {
    if (event.pointerType !== 'mouse') return false;
    const buttons = typeof event.buttons === 'number' ? event.buttons : 0;
    if (!buttons) return false;

    this._log('rearm', { buttons, pointerId: event.pointerId });

    this._ensureWindowHandlers();

    this.isPointerDown = true;
    this._activePointerId = event.pointerId ?? null;
    this.activeMode = this.determineModeFromButtons(event);
    this._useMouseFallback = false;
    this._startButtonsMask = buttons;

    // いまの位置を基準にして、即ドラッグとして継続
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.downX = event.clientX;
    this.downY = event.clientY;
    this._dragging = true;
    this.clickPending = false;

    return true;
  }

  onPointerDown(event) {
    try { event.preventDefault?.(); } catch (_eP) {}
    this._log('down', { pointerId: event.pointerId, type: event.pointerType, button: event.button, buttons: event.buttons });
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch (_e) {
      // capture 非対応 / 失敗時は無視
    }

    // window 側の move/up/cancel をドラッグ中だけ有効化
    try {
      this.win?.addEventListener?.('pointermove', this._winMove, true);
      this.win?.addEventListener?.('pointerup', this._winUp, true);
      this.win?.addEventListener?.('pointercancel', this._winCancel, true);
    } catch (_eW) {}

    // mouse fallback 用（pointercancel が出た時だけ使う）
    try {
      this.win?.addEventListener?.('mousemove', this._winMouseMove, true);
      this.win?.addEventListener?.('mouseup', this._winMouseUp, true);
    } catch (_eWm) {}

    // pointercancel(mouse) が起きたら mouse へ切り替える
    this._useMouseFallback = false;
    this._startButtonsMask =
      (event.buttons && event.buttons !== 0)
        ? event.buttons
        : (event.button === 0 ? 1 : event.button === 1 ? 4 : event.button === 2 ? 2 : 1);

    this.isPointerDown = true;
    this.activeMode = this.determineMode(event);
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this.downX = event.clientX;
    this.downY = event.clientY;

    this._activePointerId = event.pointerId;
    this._dragging = false;

    // 左ボタンクリックなら「クリック候補」にしとく
    this.clickPending = event.button === 0;
  }

  onPointerMove(event) {
    try { event.preventDefault?.(); } catch (_eP) {}
    if (!this.isPointerDown) {
      if (!this._rearmFromMove(event)) return;
    }
    this._log('move', { pointerId: event.pointerId, buttons: event.buttons });
    if (this._activePointerId != null && event.pointerId !== this._activePointerId) return;

    if (this._useMouseFallback) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    const settings = this._getPointerSettings(event);

    const totalDx = event.clientX - this.downX;
    const totalDy = event.clientY - this.downY;
    const totalDistSq = totalDx * totalDx + totalDy * totalDy;

    // 一定以上動いたら「クリック」ではなくドラッグとして扱う
    if (totalDistSq > settings.clickMovePx * settings.clickMovePx) {
      this.clickPending = false;
    }

    if (!this._dragging && totalDistSq > settings.minDragPx * settings.minDragPx) {
      this._dragging = true;
      // 手動ドラッグが始まったら自動カメラを停止
      this.stopAutoCamera();
    }

    // クリック候補の間はカメラを動かさない（微小な手ブレ対策）
    if (!this._dragging) return;

    if (this.activeMode === 'pan') {
      const camState = this.getCameraState();
      const distance = camState && typeof camState.distance === 'number' ? camState.distance : 1;

      // pan は distance と panFactor でワールド量を作って、panSpeed は「px→係数」
      const panScale = distance * settings.panFactor;
      const panX = dx * settings.panSpeed * panScale;
      const panY = dy * settings.panSpeed * panScale;

      if (!this.dispatch('panDelta', panX, panY)) {
        this.dispatch('pan', panX, panY);
      }
    } else {
      const { dTheta, dPhi } = mapDragToOrbitDelta(dx, dy, {
        theta: settings.rotateSpeed,
        phi: settings.rotateSpeed,
      });
      if (!this.dispatch('rotateDelta', dTheta, dPhi)) {
        this.dispatch('rotate', dTheta, dPhi);
      }
    }
  }

  onPointerUp(e) {
    this._log('up', { pointerId: e?.pointerId, type: e?.pointerType, buttons: e?.buttons });
    try {
      // pick → hub.set/mode.set など（未実装）
    } finally {
      // drag/orbit状態、pointer capture、フラグを必ず解除
      this.isPointerDown = false;
      this.activeMode = null;
      this._dragging = false;
      this._activePointerId = null;
      this.clickPending = false;
      this._useMouseFallback = false;
      this._startButtonsMask = 0;

      // window 側のハンドラを外す
      try {
        this.win?.removeEventListener?.('pointermove', this._winMove, true);
        this.win?.removeEventListener?.('pointerup', this._winUp, true);
        this.win?.removeEventListener?.('pointercancel', this._winCancel, true);
        this.win?.removeEventListener?.('mousemove', this._winMouseMove, true);
        this.win?.removeEventListener?.('mouseup', this._winMouseUp, true);
      } catch (_eW2) {}

      try {
        this.canvas?.releasePointerCapture?.(e.pointerId);
      } catch (_e2) {}
    }
  }


onPointerCancel(e) {
  this._log('cancel', { pointerId: e?.pointerId, type: e?.pointerType, buttons: e?.buttons });
  // touch/pen は素直に終了。mouse だけ cancel 時に mouse へフォールバックする。
  if (!this.isPointerDown) return;
  if (e && e.pointerType === 'mouse') {
    this._useMouseFallback = true;
    return;
  }
  this.onPointerUp(e);
}

onMouseMove(e) {
  if (!this.isPointerDown) return;
  if (!this._useMouseFallback) return;

  // ボタンが離れてるなら終了
  const buttons = typeof e.buttons === 'number' ? e.buttons : 0;
  if (this._startButtonsMask && (buttons & this._startButtonsMask) === 0) {
    this.onMouseUp(e);
    return;
  }

  const dx = e.clientX - this.lastX;
  const dy = e.clientY - this.lastY;
  this.lastX = e.clientX;
  this.lastY = e.clientY;

  const settings = this._getPointerSettings(e);

  const totalDx = e.clientX - this.downX;
  const totalDy = e.clientY - this.downY;
  const totalDistSq = totalDx * totalDx + totalDy * totalDy;

  if (totalDistSq > settings.clickMovePx * settings.clickMovePx) {
    this.clickPending = false;
  }

  if (!this._dragging && totalDistSq > settings.minDragPx * settings.minDragPx) {
    this._dragging = true;
    this.stopAutoCamera();
  }

  if (!this._dragging) return;

  if (this.activeMode === 'pan') {
    const camState = this.getCameraState();
    const distance = camState && typeof camState.distance === 'number' ? camState.distance : 1;

    const panScale = distance * settings.panFactor;
    const panX = dx * settings.panSpeed * panScale;
    const panY = dy * settings.panSpeed * panScale;

    if (!this.dispatch('panDelta', panX, panY)) {
      this.dispatch('pan', panX, panY);
    }
  } else {
    const { dTheta, dPhi } = mapDragToOrbitDelta(dx, dy, {
      theta: settings.rotateSpeed,
      phi: settings.rotateSpeed,
    });
    if (!this.dispatch('rotateDelta', dTheta, dPhi)) {
      this.dispatch('rotate', dTheta, dPhi);
    }
  }
}

onMouseUp(e) {
  if (!this.isPointerDown) return;
  if (!this._useMouseFallback) return;
  this.onPointerUp(e);
}
  onWheel(event) {
    event.preventDefault();

    const settings = this._getPointerSettings(event);
    const delta = event.deltaY * settings.wheelZoomSpeed;

    // ホイール操作が入った時点で自動カメラを停止
    this.stopAutoCamera();

    if (!this.dispatch('zoomDelta', delta)) {
      this.dispatch('zoom', delta);
    }
  }
}
