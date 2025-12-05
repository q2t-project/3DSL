// viewer/runtime/core/keyboardInput.js

import { getNextPresetName, applyCameraPreset } from "./cameraPresets.js";

const DEBUG_KEYBOARD = false; // 必要なとき true に

export class KeyboardInput {
  constructor(target, hub) {
    this.target = target || window;
    this.hub = hub;

    // 7 ビュー巡回用：最後に使ったプリセット名
    this.currentPresetName = null;

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

  // AutoOrbit が走っていたら止める共通ヘルパ
  stopAutoCamera() {
    const hub = this.hub;
    if (!hub || !hub.core) return;

    const camera = hub.core.camera;
    if (camera && typeof camera.stopAutoOrbit === "function") {
      camera.stopAutoOrbit();
      return;
    }

    const runtime = hub.core.uiState && hub.core.uiState.runtime;
    if (runtime) {
      runtime.isCameraAuto = false;
    }
  }

  onKeyDown(ev) {
    const key  = ev.key;
    const code = ev.code;

    if (DEBUG_KEYBOARD) {
      console.log("[keyboard] keydown", code, key, {
        tag: ev.target && ev.target.tagName,
      });
    }

    const hub = this.hub;
    if (!hub || !hub.core) return;

    // 入力欄にフォーカス乗ってるときはスキップ
    const tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const core      = hub.core;
    const frame     = core.frame;
    const mode      = core.mode;
    const camera    = core.camera || core.cameraEngine;
    const selection = core.selection;

    // --- ワールド軸の表示トグル（C キー） ----------------
    if (
      (key === "c" || key === "C") &&
      hub.viewerSettings &&
      typeof hub.viewerSettings.toggleWorldAxes === "function"
    ) {
      ev.preventDefault();
      hub.viewerSettings.toggleWorldAxes();
      return;
    }

    // -----------------------------
    // 7 ビュー巡回（バックスラッシュ系キー）
    //
    // - code:
    //     Backslash / IntlYen / IntlRo（環境差分ケア）
    // - key:
    //     "\" / "¥" も保険で拾う
    //
    // - 単押し   → 順方向（top → front → right → iso_ne → ...）
    // - Shift+押 → 逆方向（… → iso_ne → right → front → top）
    // -----------------------------
    const isViewCycleKey =
      code === "Backslash" ||
      code === "IntlYen" ||
      code === "IntlRo" ||
      key === "\\" ||
      key === "¥";

    if (camera && isViewCycleKey) {
      ev.preventDefault();

      // キーボードでビュー切り替えしたら自動カメラを停止
      this.stopAutoCamera();

      const dir = ev.shiftKey ? -1 : 1;
      const next = getNextPresetName(this.currentPresetName, dir);

      if (next) {
        const applied = applyCameraPreset(camera, next);
        if (applied) {
          // applyCameraPreset が実際に適用した名前を記憶
          this.currentPresetName = applied;
        }
      }

      return;
    }

    // -----------------------------
    // Frame 操作（PgUp / PgDn）
    // -----------------------------
    if (frame && typeof frame.step === "function") {
      if (code === "PageUp") {
        ev.preventDefault();
        frame.step(1);
        return;
      }

      if (code === "PageDown") {
        ev.preventDefault();
        frame.step(-1);
        return;
      }
    }

    // -----------------------------
    // Mode 切り替え（Q / W / Esc）
    // -----------------------------
    if (mode && selection && typeof selection.get === "function") {
      if (key === "q" || key === "Q") {
        ev.preventDefault();
        const sel = selection.get();
        if (sel && sel.uuid) {
          mode.set("micro", sel.uuid);
        }
        return;
      }

      if (key === "w" || key === "W") {
        ev.preventDefault();
        const sel = selection.get();
        if (sel && sel.uuid) {
          mode.set("meso", sel.uuid);
        }
        return;
      }
    }

    if (mode && key === "Escape") {
      ev.preventDefault();
      mode.set("macro");
      return;
    }

    // -----------------------------
    // カメラ Zoom（+ / -）
    // -----------------------------
    if (camera && typeof camera.zoom === "function") {
      const ZOOM_STEP = 0.1;

      if (key === "+" || code === "NumpadAdd") {
        ev.preventDefault();
        this.stopAutoCamera();
        camera.zoom(-ZOOM_STEP);
        return;
      }
      if (key === "-" || code === "NumpadSubtract") {
        ev.preventDefault();
        this.stopAutoCamera();
        camera.zoom(ZOOM_STEP);
        return;
      }
    }

    // -----------------------------
    // カメラ HOME（Home キー）
    // -----------------------------
    if (camera && typeof camera.reset === "function" && code === "Home") {
      ev.preventDefault();
      this.stopAutoCamera();
      camera.reset();
      // HOME 叩いたらプリセット状態もリセットしとく
      this.currentPresetName = null;
      return;
    }

    // -----------------------------
    // カメラ Orbit（矢印キー）
    // -----------------------------
    if (!camera || typeof camera.rotate !== "function") {
      return;
    }

    const BASE_STEP = Math.PI / 90; // ≒ 2°
    const FAST_STEP = Math.PI / 45; // ≒ 4°
    const step = ev.shiftKey ? FAST_STEP : BASE_STEP;

    switch (code) {
      case "ArrowLeft":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(-step, 0);
        // 手動オービットしたらプリセット名は忘れる
        this.currentPresetName = null;
        return;
      case "ArrowRight":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(step, 0);
        this.currentPresetName = null;
        return;
      case "ArrowUp":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(0, -step); // 上：上にチルト
        this.currentPresetName = null;
        return;
      case "ArrowDown":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(0, step); // 下：下にチルト
        this.currentPresetName = null;
        return;
      default:
        return;
    }
  }
}
