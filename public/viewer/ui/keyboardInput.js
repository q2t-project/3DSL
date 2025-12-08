// viewer/ui/keyboardInput.js

const DEBUG_KEYBOARD = false;

// 2.10 仕様：view preset は 7 スロット固定（0〜6）
const VIEW_PRESET_COUNT = 7;

// 0〜6 を ±1 で巡回
function stepViewPresetIndex(current, dir) {
  let i = Number(current);
  if (!Number.isFinite(i)) i = 0;
  i = Math.floor(i);

  let next = i + (dir || 1);

  if (VIEW_PRESET_COUNT > 0) {
    if (next < 0) {
      next =
        ((next % VIEW_PRESET_COUNT) + VIEW_PRESET_COUNT) %
        VIEW_PRESET_COUNT;
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
  if (typeof camera.setViewPreset !== "function") return;

  const i = stepViewPresetIndex(index, 0); // 正規化だけ
  camera.setViewPreset(i);
}

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

  // AutoOrbit が走っていたら止める共通ヘルパ
  stopAutoCamera() {
    const hub = this.hub;
    if (!hub || !hub.core) return;

    const camera = hub.core.camera || hub.core.cameraEngine;
    if (camera && typeof camera.stopAutoOrbit === "function") {
      camera.stopAutoOrbit();
    }

    const runtime = hub.core.uiState && hub.core.uiState.runtime;
    if (runtime) {
      runtime.isCameraAuto = false;
    }
  }

  onKeyDown(ev) {
    const key = ev.key;
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

    const core = hub.core;
    const frame = core.frame;
    const mode = core.mode;
    const camera = core.camera || core.cameraEngine;
    const selection = core.selection;
    const uiState = core.uiState;

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
    // - 単押し   → 順方向
    // - Shift+押 → 逆方向
    //
    // uiState.view_preset_index を ±1 して camera.setViewPreset(index)
    // -----------------------------
    const isViewCycleKey =
      code === "Backslash" ||
      code === "IntlYen" ||
      code === "IntlRo" ||
      key === "\\" ||
      key === "¥";

    if (isViewCycleKey) {
      if (!camera) return;

      ev.preventDefault();
      this.stopAutoCamera();

      const dir = ev.shiftKey ? -1 : 1;

      // CameraEngine 側の index を正として取得
      let currentIndex = 0;
      if (
        camera &&
        typeof camera.getViewPresetIndex === "function"
      ) {
        currentIndex = camera.getViewPresetIndex();
      } else if (
        uiState &&
        typeof uiState.view_preset_index === "number"
      ) {
        currentIndex = uiState.view_preset_index;
      }

      const nextIndex = stepViewPresetIndex(currentIndex, dir);

      applyViewPreset(camera, nextIndex);

      if (uiState) {
        uiState.view_preset_index =
          camera &&
          typeof camera.getViewPresetIndex === "function"
            ? camera.getViewPresetIndex()
            : nextIndex;
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
    // Mode 切り替え（Q / Esc）
    //   - W（meso）はいったん画面/UI から外す方針なので
    //     キーボードショートカットも予約のみで何もしない。
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

      // if (key === "w" || key === "W") {
      //   // meso 用: 将来拡張のため予約。現行 v1 では何もしない。
      //   ev.preventDefault();
      //   return;
      // }
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
        return;
      case "ArrowRight":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(step, 0);
        return;
      case "ArrowUp":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(0, -step); // 上：上にチルト
        return;
      case "ArrowDown":
        ev.preventDefault();
        this.stopAutoCamera();
        camera.rotate(0, step); // 下：下にチルト
        return;
      default:
        return;
    }
  }
}
