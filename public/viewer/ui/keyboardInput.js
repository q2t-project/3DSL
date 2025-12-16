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

    this._disposers = [];
    this._attached = false;
    this._onKeyDown = this.onKeyDown.bind(this);

    if (DEBUG_KEYBOARD) {
      console.log("[keyboard] KeyboardInput constructed", {
        target: this.target,
        hasHub: !!this.hub,
      });
    }

    // 互換：従来どおり「生成したら効く」
    this.attach(); // attach() は冪等にしとく
  }

  attach() {
    if (this._attached) return;
    const t = this.target;
    if (!t || typeof t.addEventListener !== "function") return;
    const on = (type, fn, opts) => {
      t.addEventListener(type, fn, opts);
      this._disposers.push(() => t.removeEventListener(type, fn, opts));
    };

    on("keydown", this._onKeyDown);
    this._attached = true;
  }

  dispose() {
    for (const off of this._disposers.splice(0)) {
      try { off(); } catch (_e) {}
    }
    this._attached = false;
    this.target = null;
    this.hub = null;
  }

  stopAutoCamera() {
    const hub = this.hub;
    if (!hub) return;

    // ① dev harness の AutoOrbit UI があればそっちを優先
    if (hub.autoOrbit && typeof hub.autoOrbit.stop === "function") {
      hub.autoOrbit.stop();
      return;
    }

    // ② フォールバック：UI 不在時は camera 直たたき
    const camera = hub?.core?.camera || hub?.core?.cameraEngine;
    if (camera && typeof camera.stopAutoOrbit === "function") {
      camera.stopAutoOrbit();
    }
  }

  _isTypingTarget(ev) {
    const el = ev?.target;
    const tag = (el && el.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    if (el && el.isContentEditable) return true;
    return false;
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
    if (this._isTypingTarget(ev)) return;

    const core = hub.core;
    const frame = core.frame;
    const mode = core.mode;
    const camera = core.camera || core.cameraEngine;
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

      // uiState 同期は「必要なら」残す（camera 側が管理してるなら不要）
      if (uiState && typeof uiState === "object") {
        uiState.view_preset_index =
          camera && typeof camera.getViewPresetIndex === "function"
            ? camera.getViewPresetIndex()
            : nextIndex;
      }
      return;
    }

    // -----------------------------
    // Frame 操作（PgUp / PgDn）
    // -----------------------------
    if (
      frame &&
      typeof frame.next === "function" &&
      typeof frame.prev === "function"
    ) {
      if (code === "PageUp") {
        ev.preventDefault();
        frame.next();   // 進む
        return;
      }

      if (code === "PageDown") {
        ev.preventDefault();
        frame.prev();   // 戻る
        return;
      }
    }

    // -----------------------------
    // Mode 切り替え（Esc）
    //   - Q/W は v1 では未使用（予約のみ）
    // -----------------------------

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
