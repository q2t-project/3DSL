// viewer/ui/keyboardInput.js
import { mapArrowKeyToOrbitDelta } from './orbitMapping.js';
import { createHubFacade } from './hubFacade.js';

const DEBUG_KEYBOARD = false;

// 2.10 仕様：view preset は 7 スロット固定（0〜6）
const VIEW_PRESET_COUNT = 7;

// 0〜6 を ±1 で巡回
function stepViewPresetIndex(current, dir) {
  let i = Number(current);
  if (!Number.isFinite(i)) i = 0;
  i = Math.floor(i);

  const d = dir ?? 1; // 0 を保持する
  let next = i + d;

  if (VIEW_PRESET_COUNT > 0) {
    if (next < 0) {
      next = ((next % VIEW_PRESET_COUNT) + VIEW_PRESET_COUNT) % VIEW_PRESET_COUNT;
    } else {
      next = next % VIEW_PRESET_COUNT;
    }
  } else {
    next = 0;
  }

  return next;
}

// index → 実際のカメラ操作に変換
//   角度テーブルは CameraEngine 側に固定してあるので、ここでは
//   「正規化した index を setViewPreset に渡す」だけにする。
function applyViewPreset(camera, index) {
  if (!camera) return;
  if (typeof camera.setViewPreset !== 'function') return;

  const i = stepViewPresetIndex(index, 0); // 正規化だけ
  camera.setViewPreset(i);
}

export class KeyboardInput {
  constructor(target, hub) {
    this.target = target || window;
    this.hub = hub;
    this.hf = null;
    try {
      this.hf = createHubFacade(hub);
    } catch (_e) {
      this.hf = null;
    }
    this.viewPresetIndex = 0;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.target.addEventListener('keydown', this.onKeyDown);

    if (DEBUG_KEYBOARD) {
      console.log('[keyboard] KeyboardInput constructed', {
        target: this.target,
        hasHub: !!this.hub,
      });
    }
  }

  dispose() {
    if (!this.target) return;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target = null;
    this.hub = null;
    this.hf = null;
  }
  // AutoOrbit が有効な場合に停止する共通ヘルパ
  stopAutoCamera() {
    const hf = this.hf;
    const cam = hf?.getCamera?.() ?? null;
    cam?.stopAutoOrbit?.();
  }

  onKeyDown(ev) {
    const key = ev.key;
    const code = ev.code;

    if (DEBUG_KEYBOARD) {
      console.log('[keyboard] keydown', code, key, {
        tag: ev.target && ev.target.tagName,
      });
    }

    const hf = this.hf;
    if (!hf) return;

    const hub = this.hub;

    // 入力欄/編集要素にフォーカス乗ってるときはスキップ
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (ev.target?.isContentEditable) return;
    const camera = hf.getCamera?.() ?? null;
    const frame = hf.getFrameApi?.() ?? null;
    const mode = hf.getMode?.() ?? null;

    // --- ワールド軸の表示トグル（C キー） ----------------
    if (
      (key === 'c' || key === 'C') &&
      hub.viewerSettings &&
      typeof hub.viewerSettings.toggleWorldAxes === 'function'
    ) {
      ev.preventDefault();
      hub.viewerSettings.toggleWorldAxes();
      return;
    }

    // -----------------------------
    // 7 ビュー巡回（バックスラッシュ系キー）
    // - code:
    //     Backslash / IntlYen / IntlRo（環境差分ケア）
    // - key:
    //     "\" / "¥" も保険で拾う
    // - 単押し   → 順方向
    // - Shift+押 → 逆方向
    // view preset index を ±1 して camera.setViewPreset(index)
    // -----------------------------
    const isViewCycleKey =
      code === 'Backslash' ||
      code === 'IntlYen' ||
      code === 'IntlRo' ||
      key === '\\' ||
      key === '¥';

    if (isViewCycleKey) {
      if (!camera) return;

      ev.preventDefault();
      this.stopAutoCamera();

      const dir = ev.shiftKey ? -1 : 1;

      // CameraEngine 側の index を正として取得
      let currentIndex = 0;
      if (camera && typeof camera.getViewPresetIndex === 'function') {
        currentIndex = camera.getViewPresetIndex();
      }
      const nextIndex = stepViewPresetIndex(currentIndex, dir);

      applyViewPreset(camera, nextIndex);

      // UI側の巡回状態を更新
      this.viewPresetIndex =
        camera && typeof camera.getViewPresetIndex === 'function'
          ? camera.getViewPresetIndex()
          : nextIndex;
      return;
    }

    // -----------------------------
    // Frame 操作（PgUp / PgDn）
    // -----------------------------
    if (frame && typeof frame.next === 'function' && typeof frame.prev === 'function') {
      if (code === 'PageUp') {
        ev.preventDefault();
        frame.next(); // 進む
        return;
      }

      if (code === 'PageDown') {
        ev.preventDefault();
        frame.prev(); // 戻る
        return;
      }
    }

    // -----------------------------
    // Mode 切り替え（Esc）
    //   - Q/W は v1 では未使用（予約のみ）
    // -----------------------------

    if (mode && key === 'Escape') {
      ev.preventDefault();
      mode.set('macro');
      return;
    }

    // -----------------------------
    // カメラ Zoom（+ / -）
    // -----------------------------
    if (camera && (typeof camera.zoomDelta === 'function' || typeof camera.zoom === 'function')) {
      const ZOOM_STEP = 0.1;

      const isPlus = key === '+' || (key === '=' && ev.shiftKey) || code === 'NumpadAdd';
      if (isPlus) {
        ev.preventDefault();
        this.stopAutoCamera();
        if (typeof camera.zoomDelta === 'function') camera.zoomDelta(-ZOOM_STEP);
        else camera.zoom(-ZOOM_STEP);
        return;
      }
      const isMinus = key === '-' || (key === '_' && ev.shiftKey) || code === 'NumpadSubtract';
      if (isMinus) {
        ev.preventDefault();
        this.stopAutoCamera();
        if (typeof camera.zoomDelta === 'function') camera.zoomDelta(ZOOM_STEP);
        else camera.zoom(ZOOM_STEP);
        return;
      }
    }

    // -----------------------------
    // カメラ HOME（Home キー）
    // -----------------------------
    if (camera && typeof camera.reset === 'function' && code === 'Home') {
      ev.preventDefault();
      this.stopAutoCamera();
      camera.reset();
      return;
    }

    // -----------------------------
    // カメラ Orbit（矢印キー）
    // -----------------------------
    const canRotateDelta = !!(camera && typeof camera.rotateDelta === 'function');
    const canRotate = !!(camera && typeof camera.rotate === 'function');
    if (!canRotateDelta && !canRotate) {
      return;
    }

    const BASE_STEP = Math.PI / 90; // ≒ 2°
    const FAST_STEP = Math.PI / 45; // ≒ 4°
    const step = ev.shiftKey ? FAST_STEP : BASE_STEP;

    const { dTheta, dPhi } = mapArrowKeyToOrbitDelta(code, step);
    if (dTheta !== 0 || dPhi !== 0) {
      ev.preventDefault();
      this.stopAutoCamera();
      if (canRotateDelta) camera.rotateDelta(dTheta, dPhi);
      else camera.rotate(dTheta, dPhi);
      return;
    }
    return;
  }
}
