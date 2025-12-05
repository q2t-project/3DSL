// runtime/core/pointerInput.js
// canvas 上の pointer / wheel イベントを受けて
// CameraEngine / selectionController を操作する入力アダプタ。

const ROTATE_SPEED = 0.005;
const PAN_SPEED = 0.002;
const ZOOM_SPEED = 0.001;

export class PointerInput {
  constructor(canvas, cameraEngine, hub) {
    this.canvas = canvas;
    this.cameraEngine = cameraEngine;
    this.hub = hub;

    this.isPointerDown = false;
    this.activeMode = null;
    this.lastX = 0;
    this.lastY = 0;
    this.clickPending = false;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });

    this.onContextMenu = (e) => e.preventDefault();
    canvas.addEventListener("contextmenu", this.onContextMenu);
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

  stopAutoCamera() {
    // AutoOrbit 停止はまず hub.core.camera.stopAutoOrbit 経由で行う
    const camera = this.hub?.core?.camera;
    if (camera && typeof camera.stopAutoOrbit === "function") {
      camera.stopAutoOrbit();
      return;
    }

    // フォールバック：旧実装互換
    const runtime = this.hub?.core?.uiState?.runtime;
    if (runtime) {
      runtime.isCameraAuto = false;
    }
  }

  dispatch(method, ...args) {
    if (this.hub?.core?.camera?.[method]) {
      this.hub.core.camera[method](...args);
      return;
    }
    if (this.cameraEngine?.[method]) {
      this.cameraEngine[method](...args);
    }
  }

  // pan スケール計算用に「今の cameraState」を安全に取得する
  getCameraState() {
    const camApi = this.hub?.core?.camera;
    if (camApi && typeof camApi.getState === "function") {
      return camApi.getState();
    }
    if (this.cameraEngine && typeof this.cameraEngine.getState === "function") {
      return this.cameraEngine.getState();
    }
    return null;
  }

  determineMode(event) {
    if (event.button === 2) return "pan"; // 右ドラッグ = PAN
    if (event.button === 1) return "rotate"; // 中ボタン = ROTATE
    if (event.ctrlKey || event.metaKey) return "pan"; // Ctrl + 左 = PAN
    if (event.altKey) return "rotate"; // Alt + 左 = ROTATE
    return "rotate"; // 左だけ → rotate
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
    this.clickPending = event.button === 0;
  }

  onPointerMove(event) {
    if (!this.isPointerDown) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

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
      // 自動カメラを止めてから selection/mode に渡す
        this.stopAutoCamera();

        this.hub?.core?.selection?.select?.(hit.uuid);
        this.hub?.core?.mode?.focus?.(hit.uuid);
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
