// viewer/ui/pointerInput.js
// canvas 上の pointer / wheel イベントを受けて
// hub.core.camera / hub.core.selection / hub.core.mode を操作する UI 入力アダプタ。

const ROTATE_SPEED = 0.005;
const PAN_SPEED = 0.002;
const ZOOM_SPEED = 0.001;

export class PointerInput {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import("../runtime/viewerHub.js").ViewerHub} hub
   */
  constructor(canvas, hub) {
    this.canvas = canvas;
    this.hub = hub;

    this.isPointerDown = false;
    this.activeMode = null; // "rotate" | "pan" | null
    this.lastX = 0;
    this.lastY = 0;
    this.clickPending = false;

    // UI から見える統一 camera API（hub.core.camera）だけ触る
    this.camera = this._resolveCamera();

    // ハンドラは自分自身に bind しておく（dispose 時に外せるように）
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp   = this.onPointerUp.bind(this);
    this.onWheel       = this.onWheel.bind(this);
    this.onContextMenu = (e) => e.preventDefault();

    // イベント登録
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  _resolveCamera() {
    const core = this.hub && this.hub.core;
    if (!core) return null;

    // 正式ルート：hub.core.camera に一本化
    if (core.camera) return core.camera;

    // 最悪の保険（古い実装との互換）：cameraEngine が残ってたら薄くラップ
    if (core.cameraEngine) {
      const ce = core.cameraEngine;
      return {
        rotate: (...args) => ce.rotate && ce.rotate(...args),
        pan:    (...args) => ce.pan    && ce.pan(...args),
        zoom:   (...args) => ce.zoom   && ce.zoom(...args),
        reset:  (...args) => ce.reset  && ce.reset(...args),
        getState: (...args) =>
          ce.getState ? ce.getState(...args) : null,
      };
    }

    return null;
  }

  // 後始末用。viewer を破棄するときに呼んでもらう想定。
  dispose() {
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointerleave", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("wheel", this.onWheel);
    canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

// viewer/ui/pointerInput.js

  // AutoOrbit 停止
  stopAutoCamera() {
    const hub = this.hub;

    // ① dev harness 経由の AutoOrbit UI があれば、それを正とする
    if (hub && hub.autoOrbit && typeof hub.autoOrbit.stop === "function") {
      hub.autoOrbit.stop();   // ← ボタン背景・HUD も含めて「正式停止」
      return;
    }

    // ② フォールバック：UI が無い環境用に camera 直たたき
    const camera = hub?.core?.camera || hub?.core?.cameraEngine;
    if (camera && typeof camera.stopAutoOrbit === "function") {
      camera.stopAutoOrbit();
    }

    const runtime = hub?.core?.uiState?.runtime;
    if (runtime) {
      runtime.isCameraAuto = false;
    }
  }


  // camera のメソッドを安全に叩くヘルパ
  dispatch(method, ...args) {
    let camera = this.camera || this._resolveCamera();
    if (camera && typeof camera[method] === "function") {
      camera[method](...args);
    }
  }

  // pan スケール計算用に「今の cameraState」を安全に取得する
  getCameraState() {
    const core = this.hub && this.hub.core;
    if (!core) return null;

    const camApi = core.camera || core.cameraEngine;
    if (camApi && typeof camApi.getState === "function") {
      return camApi.getState();
    }
    return null;
  }

  // ボタン・修飾キーからドラッグモードを決定
  determineMode(event) {
    if (event.button === 2) return "pan";      // 右ドラッグ = PAN
    if (event.button === 1) return "rotate";   // 中ボタン = ROTATE
    if (event.ctrlKey || event.metaKey) return "pan";  // Ctrl + 左 = PAN
    if (event.altKey) return "rotate";         // Alt + 左 = ROTATE
    return "rotate";                           // 左だけ → rotate
  }

  onPointerDown(event) {
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch (_e) {
      // capture 非対応 / 失敗時は無視
    }

    this.isPointerDown = true;
    this.activeMode = this.determineMode(event);
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    // 左ボタンクリックなら「クリック候補」にしとく
    this.clickPending = event.button === 0;
  }

  onPointerMove(event) {
    if (!this.isPointerDown) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    // 一定以上動いたら「クリック」ではなくドラッグ扱い
    if (Math.hypot(dx, dy) > 2) {
      this.clickPending = false;

      // 手動ドラッグが始まったら自動カメラを停止
      this.stopAutoCamera();
    }

    if (this.activeMode === "pan") {
      const camState = this.getCameraState();
      const distance =
        camState && typeof camState.distance === "number"
          ? camState.distance
          : 1;
      const panScale = distance * PAN_SPEED;
      this.dispatch("pan", dx * panScale, dy * panScale);
    } else {
      this.dispatch("rotate", dx * ROTATE_SPEED, dy * ROTATE_SPEED);
    }
  }

  onPointerUp(event) {
    if (this.isPointerDown) {
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch (_e) {
        // 既に release 済み・未 capture 等は無視
      }
    }

    if (this.clickPending) {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      const hit = this.hub?.pickObjectAt?.(x, y);

      if (hit?.uuid) {
        // 何かに当たった → micro へフォーカス
        this.stopAutoCamera();

        // spec どおり selection.set / mode.set を呼ぶ
        this.hub?.core?.selection?.set?.({
          uuid: hit.uuid,
          kind: hit.kind || null,
        });
        this.hub?.core?.mode?.set?.("micro", hit.uuid);
      } else {
        // 何も当たらへんかったら selection / micro をクリアして macro に戻す
        this.hub?.core?.selection?.clear?.();
        this.hub?.core?.mode?.set?.("macro");
      }
    }

    this.isPointerDown = false;
    this.activeMode = null;
    this.clickPending = false;
  }

  onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * ZOOM_SPEED;

    // ホイール操作が入った時点で自動カメラを停止
    this.stopAutoCamera();

    this.dispatch("zoom", delta);
  }
}
