// viewer/runtime/core/keyboardInput.js

// KeyboardInput:
//   - window の keydown を 1 箇所に集約
//   - core.camera / core.frame / core.mode / core.selection だけを叩く
//   - UI や CameraEngine には直接触れない

const DEBUG_KEYBOARD = true; // 必要なとき true に

export class KeyboardInput {
  constructor(target, hub) {
    this.target = target || window;
    this.hub = hub;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.target.addEventListener("keydown", this.onKeyDown);

    if (DEBUG_KEYBOARD) {
      console.log("[keyboard] KeyboardInput constructed", {
        target: this.target,
        hasHub: !!this.hub,
      });
    }
  }

  dispose() {
    if (!this.target) return;
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target = null;
    this.hub = null;
  }

  onKeyDown(ev) {
    if (DEBUG_KEYBOARD) {
      console.log("[keyboard] keydown", ev.code, ev.key, {
        tag: ev.target && ev.target.tagName,
      });
    }

    const hub = this.hub;
    if (!hub || !hub.core) return;

    // 入力欄にフォーカス乗ってるときはスキップ
    const tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const core = hub.core;
    const frame = core.frame;
    const mode = core.mode;
    const camera = core.camera;
    const selection = core.selection;

    // -----------------------------
    // Frame 操作（PgUp / PgDn）
    // -----------------------------
    if (frame) {
      if (ev.code === "PageUp") {
        if (typeof frame.step === "function") {
          ev.preventDefault();
          frame.step(1);
        }
        return;
      }
    }

    // -----------------------------
    // Mode 切り替え（Q / W / Esc）
    // -----------------------------
    if (mode && selection && typeof selection.get === "function") {
      if (ev.key === "q" || ev.key === "Q") {
        ev.preventDefault();
        const sel = selection.get();
        if (sel && sel.uuid) {
          mode.set("micro", sel.uuid);
        }
        return;
      }

      if (ev.key === "w" || ev.key === "W") {
        ev.preventDefault();
        const sel = selection.get();
        if (sel && sel.uuid) {
          mode.set("meso", sel.uuid);
        }
        return;
      }
    }

    if (mode && ev.key === "Escape") {
      ev.preventDefault();
      mode.set("macro");
      return;
    }

    // -----------------------------
    // カメラ Zoom（+ / -）
    // -----------------------------
    if (camera && typeof camera.zoom === "function") {
      const ZOOM_STEP = 0.1; // 必要なら調整

      // 日本語配列など：key="+" / "-" を優先
      if (ev.key === "+" || ev.code === "NumpadAdd") {
        ev.preventDefault();
        camera.zoom(-ZOOM_STEP);
        return;
      }
      if (ev.key === "-" || ev.code === "NumpadSubtract") {
        ev.preventDefault();
        camera.zoom(ZOOM_STEP);
        return;
      }
    }

    // -----------------------------
    // カメラ HOME（Home キー）
    // -----------------------------
    if (camera && typeof camera.reset === "function" && ev.code === "Home") {
      ev.preventDefault();
      camera.reset();
      return;
    }

    // -----------------------------
    // カメラ Orbit（矢印キー）
    // -----------------------------
    if (!camera || typeof camera.rotate !== "function") {
      return;
    }

    // Shift 押しで早回し
    const BASE_STEP = Math.PI / 90; // ≒ 2°
    const FAST_STEP = Math.PI / 45; // ≒ 4°
    const step = ev.shiftKey ? FAST_STEP : BASE_STEP;

    switch (ev.code) {
      case "ArrowLeft":
        ev.preventDefault();
        camera.rotate(-step, 0);
        return;
      case "ArrowRight":
        ev.preventDefault();
        camera.rotate(step, 0);
        return;
      case "ArrowUp":
        ev.preventDefault();
        camera.rotate(0, -step); // 上：上にチルト
        return;
      case "ArrowDown":
        ev.preventDefault();
        camera.rotate(0, step); // 下：下にチルト
        return;
      default:
        return;
    }
  }
}
