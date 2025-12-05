// viewerDevHarness.js

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";
import { attachGizmo } from "./ui/gizmo.js";

let viewerHub = null;
let playTimer = null;

const elMetaFile = document.getElementById("meta-file");
const elMetaModel = document.getElementById("meta-model");
const elHud = document.getElementById("viewer-hud");

// ------------------------------------------------------------
// メタパネル / ログ / HUD
// ------------------------------------------------------------
function clearMetaPanels() {
  if (elMetaFile) {
    elMetaFile.innerHTML = "<h3>File</h3><div>(loading...)</div>";
  }
  if (elMetaModel) {
    elMetaModel.innerHTML =
      "<h3>Model</h3><div>(logs will appear here)</div>";
  }
}

function appendModelLog(line) {
  if (!elMetaModel) return;
  if (!elMetaModel.dataset.initialized) {
    elMetaModel.innerHTML = "<h3>Model</h3><div class='meta-log'></div>";
    elMetaModel.dataset.initialized = "1";
  }
  const logArea = elMetaModel.querySelector(".meta-log") || elMetaModel;
  const div = document.createElement("div");
  div.textContent = line;
  logArea.appendChild(div);
  elMetaModel.scrollTop = elMetaModel.scrollHeight;
}

// dev 用：コンソールからも触れるように
window.viewerLog = appendModelLog;

function showHudMessage(text, { duration = 1600, level = "info" } = {}) {
  if (!elHud) return;

  if (showHudMessage._timer) {
    clearTimeout(showHudMessage._timer);
    showHudMessage._timer = null;
  }

  elHud.textContent = text;

  elHud.classList.remove(
    "hud-hidden",
    "hud-visible",
    "hud-info",
    "hud-warn",
    "hud-error",
  );
  elHud.classList.add("hud-visible", `hud-${level}`);

  showHudMessage._timer = setTimeout(() => {
    elHud.classList.remove("hud-visible", `hud-${level}`);
    elHud.classList.add("hud-hidden");
  }, duration);
}

window.viewerToast = showHudMessage;

// ------------------------------------------------------------
// filter コントロール
// ------------------------------------------------------------
function initFilterControls() {
  if (!viewerHub || !viewerHub.core || !viewerHub.core.filters) return;

  const filtersAPI = viewerHub.core.filters;

  const btnLines = document.getElementById("filter-lines");
  const btnPoints = document.getElementById("filter-points");
  const btnAux = document.getElementById("filter-aux");

  function setFilterButtonState(btn, enabled) {
    if (!btn) return;
    const icon = btn.querySelector(".icon");
    if (enabled) {
      btn.classList.remove("filter-off");
      btn.classList.add("filter-on");
      if (icon) icon.textContent = "👁";
    } else {
      btn.classList.remove("filter-on");
      btn.classList.add("filter-off");
      if (icon) icon.textContent = "🙈";
    }
  }

  function syncFilterUI() {
    const f = filtersAPI.get();
    setFilterButtonState(btnLines, !!f.lines);
    setFilterButtonState(btnPoints, !!f.points);
    setFilterButtonState(btnAux, !!f.aux);
  }

  if (btnLines) {
    btnLines.addEventListener("click", () => {
      const next = btnLines.classList.contains("filter-off");
      filtersAPI.setTypeEnabled("lines", next);
      syncFilterUI();
    });
  }

  if (btnPoints) {
    btnPoints.addEventListener("click", () => {
      const next = btnPoints.classList.contains("filter-off");
      filtersAPI.setTypeEnabled("points", next);
      syncFilterUI();
    });
  }

  if (btnAux) {
    btnAux.addEventListener("click", () => {
      const next = btnAux.classList.contains("filter-off");
      filtersAPI.setTypeEnabled("aux", next);
      syncFilterUI();
    });
  }

  syncFilterUI();
}

// ------------------------------------------------------------
// frame コントロール
// ------------------------------------------------------------
function initFrameControls() {
  if (!viewerHub || !viewerHub.core || !viewerHub.core.frame) return;

  const frameAPI = viewerHub.core.frame;

  const slider = document.getElementById("frame-slider");
  const label = document.getElementById("frame-slider-label");

  const frameBlock    = document.querySelector(".frame-block");
  const frameControls = document.getElementById("frame-controls");

  // "gauge" = パラパラ用ゲージ, "timeline" = 連続再生バー
  let frameUiMode = "gauge";

  const btnRew = document.getElementById("btn-rew");
  const btnPlay = document.getElementById("btn-play");
  const btnFF = document.getElementById("btn-ff");
  const btnStepBack = document.getElementById("btn-step-back");
  const btnHome = document.getElementById("btn-home");
  const btnStepForward = document.getElementById("btn-step-forward");

  const range = frameAPI.range();
  const current = frameAPI.get();
  const hasMultipleFrames = range.max > range.min;
  const ZERO_FRAME = 0;

  // フレーム操作用 HUD
  function showFrameToast(kind) {
    // 単一フレームのときは何も出さない
    if (!hasMultipleFrames) return;

    const cur = frameAPI.get();
    let msg = "";

    if (kind === "play-start") {
      msg = `Frame: play [${range.min} … ${range.max}]`;
    } else if (kind === "play-stop") {
      msg = `Frame: stop (frame ${cur})`;
    } else if (kind === "home") {
      msg = `Frame: home (${cur})`;
    } else if (kind === "jump") {
      msg = `Frame: ${cur}`;
    }

    if (msg) {
      showHudMessage(msg, { duration: 800, level: "info" });
    }
  }

  // 0 をレンジ内のどこに描くか（0.0–1.0）を CSS 変数に渡す
  function updateZeroMarker() {
    if (!slider) return;

    const span = range.max - range.min;
    if (!Number.isFinite(span) || span <= 0) {
      // 単一フレームなどの場合は中央に置いておく
      slider.style.setProperty("--frame-zero-frac", "0.5");
      return;
    }

    const frac = (ZERO_FRAME - range.min) / span;
    const clamped = Math.max(0, Math.min(1, frac));

    slider.style.setProperty("--frame-zero-frac", String(clamped));
  }

  // 単一フレームのときは「見えるけど触れない」状態にする
  function updateFrameEnabledState() {
    if (!frameBlock) return;

    frameBlock.classList.toggle("frame-single", !hasMultipleFrames);

    const controls = [
      slider,
      btnRew,
      btnPlay,
      btnFF,
      btnStepBack,
      btnHome,
      btnStepForward,
    ];
    controls.forEach((el) => {
      if (!el) return;
      el.disabled = !hasMultipleFrames;
    });
  }

  // フレーム UI モードを CSS に反映
  function setFrameUiMode(mode) {
    // 単一フレームのときは常にゲージ扱い
    if (!hasMultipleFrames) {
      mode = "gauge";
    }
    frameUiMode = mode;
    if (frameControls) {
      frameControls.classList.toggle(
        "mode-continuous",
        mode === "timeline"
      );
      frameControls.classList.toggle(
        "mode-flip",
        mode === "gauge"
      );
    }
    if (slider) {
      slider.classList.toggle("frame-mode-timeline", mode === "timeline");
      slider.classList.toggle("frame-mode-gauge", mode === "gauge");
    }
  }

  function updateLabelFromState() {
    const f = frameAPI.get();
    if (slider) slider.value = f;
    if (label) label.textContent = String(f);
  }

  if (slider) {
    slider.min = range.min;
    slider.max = range.max;
    slider.step = 1;
    slider.value = current;
  }
  if (label) {
    label.textContent = String(current);
  }

  // 初期状態反映
  updateFrameEnabledState();
  setFrameUiMode("gauge");
  updateZeroMarker();

  if (slider) {
    slider.addEventListener("input", (ev) => {
      const v = Number(ev.target.value);
      if (!Number.isFinite(v)) return;
      frameAPI.set(v);
      updateLabelFromState();
      // 手動でスライダをいじったら「ゲージ」モード寄りに戻す
      setFrameUiMode("gauge");
    });

    // ドラッグ完了時に 1 回だけ HUD を出す
    slider.addEventListener("change", () => {
      showFrameToast("jump");
    });
  }


  if (btnStepBack) {
    btnStepBack.addEventListener("click", () => {
      frameAPI.step(-1);
      updateLabelFromState();
      setFrameUiMode("gauge");
    });
  }

  if (btnStepForward) {
    btnStepForward.addEventListener("click", () => {
      frameAPI.step(1);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnHome) {
    btnHome.addEventListener("click", () => {
      frameAPI.set(range.min);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnRew) {
    btnRew.addEventListener("click", () => {
      frameAPI.set(range.min);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnFF) {
    btnFF.addEventListener("click", () => {
      frameAPI.set(range.max);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (!hasMultipleFrames) {
        // 単一フレームでは実質なにも起こさない（ボタンは disabled のはずだが保険）
        return;
      }
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
        btnPlay.textContent = "Play";
        // 再生終了 → ゲージモードに戻す
        setFrameUiMode("gauge");
        showFrameToast("play-stop");
        return;
      }
      btnPlay.textContent = "Stop";

      // 再生開始 → 動画バー（タイムライン）モードへ
      setFrameUiMode("timeline");
      showFrameToast("play-start");

      playTimer = setInterval(() => {
        const r = frameAPI.range();
        const cur = frameAPI.get();
        if (cur >= r.max) {
          frameAPI.set(r.min);
        } else {
          frameAPI.step(1);
        }
        updateLabelFromState();
      }, 600);
    });
  }

  // 他経路（キーボード等）からの変更を拾って UI を同期
  let lastFrame = frameAPI.get();
  function frameUiLoop() {
    const f = frameAPI.get();
    if (f !== lastFrame) {
      lastFrame = f;
      if (slider) slider.value = f;
      if (label) label.textContent = String(f);
    }
    requestAnimationFrame(frameUiLoop);
  }
  requestAnimationFrame(frameUiLoop);
}

// ------------------------------------------------------------
// mode HUD（モードトースト＋Pill ON/OFF）
// ------------------------------------------------------------
function initModeHudLoop() {
  if (!viewerHub || !viewerHub.core) return;

  const elModeMacro = document.getElementById("mode-label-macro");
  const elModeMeso  = document.getElementById("mode-label-meso");
  const elModeMicro = document.getElementById("mode-label-micro");

  let lastMode = null;

  function loop() {
    if (!viewerHub || !viewerHub.core) {
      requestAnimationFrame(loop);
      return;
    }

    const core = viewerHub.core;
    const modeAPI =
      (core.mode && typeof core.mode.get === "function" && core.mode) ||
      (core.modeController &&
        typeof core.modeController.get === "function" &&
        core.modeController);

    if (!modeAPI) {
      requestAnimationFrame(loop);
      return;
    }

    const mode = modeAPI.get && modeAPI.get();

    // モード変わったときだけトースト
    if (mode !== lastMode) {
      lastMode = mode;
      let msg = "";
      if (mode === "macro") msg = "MACRO MODE";
      else if (mode === "meso") msg = "MESO MODE";
      else if (mode === "micro") msg = "MICRO MODE";
      if (msg) showHudMessage(msg, { duration: 800, level: "info" });
    }

    // pill の ON/OFF
    if (elModeMacro) {
      elModeMacro.classList.toggle("mode-pill-active", mode === "macro");
    }
    if (elModeMeso) {
      elModeMeso.classList.toggle("mode-pill-active", mode === "meso");
    }
    if (elModeMicro) {
      elModeMicro.classList.toggle("mode-pill-active", mode === "micro");
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}


// dev 用ログフラグ
const DEBUG_DEV_HARNESS = true;

function devLog(...args) {
  if (!DEBUG_DEV_HARNESS) return;
  console.log(...args);
}

// ------------------------------------------------------------
// ギズモボタン（HOME / 軸スナップ）
// ------------------------------------------------------------
function initGizmoButtons() {
  devLog(
    "[viewer-dev gizmo] initGizmoButtons start",
    viewerHub && viewerHub.core && viewerHub.core.camera,
  );

  if (!viewerHub || !viewerHub.core || !viewerHub.core.camera) {
    console.warn("[viewer-dev gizmo] hub/core.camera not ready");
    return;
  }

  const camera = viewerHub.core.camera;

  // HOME ボタン
  const btnHomeCam = document.getElementById("gizmo-home");
  if (btnHomeCam) {
    devLog("[viewer-dev gizmo] HOME button found", btnHomeCam);
    btnHomeCam.addEventListener("click", () => {
      devLog("[viewer-dev gizmo] HOME clicked");
      // AutoOrbit 中ならまず止める
      if (typeof camera.stopAutoOrbit === "function") {
        camera.stopAutoOrbit();
      }
      if (typeof camera.reset === "function") {
        camera.reset();
      }
      showHudMessage("Camera: HOME", { duration: 800, level: "info" });
    });
  }

  // X/Y/Z 軸ボタン
  const axisButtons = document.querySelectorAll(
    ".gizmo-axis[data-gizmo-axis]",
  );
  devLog(
    "[viewer-dev gizmo] axis buttons found:",
    axisButtons.length,
    axisButtons,
  );

  axisButtons.forEach((btn) => {
    const axis = btn.dataset.gizmoAxis; // "x" | "y" | "z"
    devLog("[viewer-dev gizmo] axis button wired", axis, btn);

    btn.addEventListener("click", () => {
      devLog("[viewer-dev gizmo] axis clicked", axis);
      if (!axis) return;

      if (typeof camera.snapToAxis === "function") {
        camera.snapToAxis(axis);
      } else {
        console.warn("[viewer-dev gizmo] camera.snapToAxis not available");
      }

      showHudMessage(`Camera axis: ${axis.toUpperCase()}`, {
        duration: 800,
        level: "info",
      });
    });
  });
}

// ------------------------------------------------------------
// gizmo そばの座標軸トグルボタン
// ------------------------------------------------------------
function initWorldAxesToggle(hub) {
  const btn = document.getElementById("world-axes-toggle");
  if (
    !btn ||
    !hub ||
    !hub.viewerSettings ||
    typeof hub.viewerSettings.toggleWorldAxes !== "function"
  ) {
    console.warn("[viewer-dev gizmo] world-axes toggle button not wired");
    return;
  }

  // renderer のデフォルトに合わせて false からスタート
  let visible = false;

  function updateUI() {
    btn.dataset.visible = visible ? "true" : "false";
    btn.setAttribute("aria-pressed", visible ? "true" : "false");
  }

  // C キーからのトグルとも状態を共有するため、viewerSettings 側をラップ
  const origToggle =
    hub.viewerSettings.toggleWorldAxes.bind(hub.viewerSettings);
  hub.viewerSettings.toggleWorldAxes = function () {
    origToggle();
    visible = !visible;
    updateUI();
  };

  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    hub.viewerSettings.toggleWorldAxes();
  });

  // 初期状態反映
  updateUI();
}

// ------------------------------------------------------------
// ぐるり俯瞰（AutoOrbit）コントロール（pill → 3ボタン）
// ------------------------------------------------------------
function initOrbitControls(hub) {
  if (!hub || !hub.core || !hub.core.camera) {
    console.warn("[viewer-dev orbit] hub/core.camera not ready");
    return;
  }

  const camera   = hub.core.camera;
  const uiState  = hub.core.uiState || {};
  const runtime  = uiState.runtime || {};

  const elSlot    = document.getElementById("auto-orbit-slot");
  const elPill    = document.getElementById("auto-orbit-pill");
  const elControls= document.getElementById("auto-orbit-controls");

  if (!elSlot || !elPill || !elControls) {
    console.warn("[viewer-dev orbit] auto-orbit elements not found");
    return;
  }

  const AUTO_ORBIT_MAX_SPEED = 2; // 1x / 2x の 2 段

  const autoOrbitState = {
    enabled: false,
    direction: 1, // +1: 正転, -1: 逆転
    speedLevel: 1,
  };

  function setUiMode(mode) {
    elSlot.dataset.mode = mode === "expanded" ? "expanded" : "collapsed";
  }

  function applyAutoOrbit() {
    if (!autoOrbitState.enabled) {
      if (typeof camera.stopAutoOrbit === "function") {
        camera.stopAutoOrbit();
      }
      if (runtime) {
        runtime.isCameraAuto = false;
      }
      return;
    }

    const opts = {
      direction: autoOrbitState.direction,
      speedLevel: autoOrbitState.speedLevel,
    };

    const isAuto = !!runtime.isCameraAuto;

    if (!isAuto && typeof camera.startAutoOrbit === "function") {
      camera.startAutoOrbit(opts);
      if (runtime) {
        runtime.isCameraAuto = true;
      }
    } else if (typeof camera.updateAutoOrbitSettings === "function") {
      camera.updateAutoOrbitSettings(opts);
    }
  }

  // HUD 用のメッセージ統一
  function showOrbitStatusToast(kind) {
    const dirLabel =
      autoOrbitState.direction === -1 ? "reverse" : "forward";
    const speedLabel = `x${autoOrbitState.speedLevel}`;

    if (kind === "start") {
      showHudMessage(`AutoOrbit: start (${dirLabel} ${speedLabel})`, {
        duration: 900,
        level: "info",
      });
    } else if (kind === "speed") {
      showHudMessage(`AutoOrbit: speed ${speedLabel}`, {
        duration: 800,
        level: "info",
      });
    } else if (kind === "stop") {
      showHudMessage("AutoOrbit: stop", {
        duration: 900,
        level: "info",
      });
    }
  }

  function stopAutoOrbit() {
    if (!autoOrbitState.enabled) return;
    autoOrbitState.enabled = false;
    applyAutoOrbit();
    setUiMode("collapsed");
    showOrbitStatusToast("stop");
  }

  // pill クリック → 展開＆正転・速度1 で開始
  elPill.addEventListener("click", (ev) => {
    ev.preventDefault();

    setUiMode("expanded");

    autoOrbitState.enabled   = true;
    autoOrbitState.direction = 1;
    autoOrbitState.speedLevel= 1;

    applyAutoOrbit();
    showOrbitStatusToast("start")
  });

  // 3ボタン（⟲ / ■ / ⟳）
  elControls.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".auto-orbit-btn");
    if (!btn) return;
    ev.preventDefault();

    const role = btn.dataset.role;
    if (!role) return;

    if (role === "stop") {
      // 停止＋折りたたみ
      stopAutoOrbit();
      return;
    }

    const prevDir   = autoOrbitState.direction;
    const prevSpeed = autoOrbitState.speedLevel;

    autoOrbitState.enabled = true;

    if (role === "fwd") {
      if (autoOrbitState.direction === 1) {
        autoOrbitState.speedLevel = Math.min(
          AUTO_ORBIT_MAX_SPEED,
          autoOrbitState.speedLevel + 1,
        );
      } else {
        autoOrbitState.direction  = 1;
        autoOrbitState.speedLevel = 1;
      }
    } else if (role === "rev") {
      if (autoOrbitState.direction === -1) {
        autoOrbitState.speedLevel = Math.min(
          AUTO_ORBIT_MAX_SPEED,
          autoOrbitState.speedLevel + 1,
        );
      } else {
        autoOrbitState.direction  = -1;
        autoOrbitState.speedLevel = 1;
      }
    }

    applyAutoOrbit();

    // 方向 or 速度が変わったときだけトースト
    if (
      autoOrbitState.direction !== prevDir ||
      autoOrbitState.speedLevel !== prevSpeed
    ) {
      showOrbitStatusToast("speed");
    }

  });

  // 初期状態は折りたたみ
  setUiMode("collapsed");

  // 将来 pointerInput から UI ごと止めたいとき用のフック
  hub.autoOrbit = {
    stop: stopAutoOrbit,
  };
}

// ------------------------------------------------------------
// キーボードショートカット（Space → Play）
// ------------------------------------------------------------
function initKeyboardShortcuts() {
  window.addEventListener("keydown", (ev) => {
    if (!viewerHub || !viewerHub.core) return;

    const tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Space → 再生トグル
    if (ev.code === "Space") {
      ev.preventDefault();
      const btnPlay = document.getElementById("btn-play");
      if (btnPlay) btnPlay.click();
      return;
    }
  });
}

function devLogger(line) {
  devLog(line);
  appendModelLog(line);
}

// ------------------------------------------------------------
// boot: viewer_dev.html → viewerDevHarness → bootstrapViewerFromUrl
// ------------------------------------------------------------
async function boot() {
  devLog("[viewer-dev] boot start");

  clearMetaPanels();

  const canvasId = "viewer-canvas";

    // ★使うサンプルをここで切り替える
    //  const jsonUrl = "../3dss/sample/";
    //  const jsonUrl = "../3dss/sample/valid_minimum_L1-P2-A0.3dss.json";
      const jsonUrl = "../3dss/sample/primitive_and_arrow.3dss.json";
    //  const jsonUrl = "../3dss/sample/rpref_L1000-P1000-A20.3dss.json";
    //  const jsonUrl = "../3dss/sample/rpref_L2-P2-A2.3dss.json";

  try {
    viewerHub = await bootstrapViewerFromUrl(canvasId, jsonUrl, {
      devBootLog: true,
      devLabel: "viewer_dev",
      modelUrl: jsonUrl,
      logger: devLogger,
    });
    window.hub = viewerHub; // デバッグ用

    // ★ gizmo 用 canvas を差し込む
    const gizmoSlot = document.getElementById("gizmo-slot");
    if (gizmoSlot && typeof attachGizmo === "function") {
      devLog("[viewer-dev gizmo] attachGizmo", gizmoSlot);
      attachGizmo(gizmoSlot, viewerHub);
    } else {
      console.warn("[viewer-dev gizmo] gizmo-slot missing or attachGizmo NG");
    }

    devLog(
      "[viewer-dev] hub created, core.camera =",
      viewerHub.core && viewerHub.core.camera,
    );

    appendModelLog("Viewer boot OK.");
    if (elMetaFile && viewerHub.core && viewerHub.core.frame) {
      const range = viewerHub.core.frame.range();
      const current = viewerHub.core.frame.get();
      elMetaFile.innerHTML =
        "<h3>File</h3>" +
        `<div>Source: ${jsonUrl}</div>` +
        `<div>Frame range: [${range.min}, ${range.max}]</div>` +
        `<div>Current frame: ${current}</div>`;
    }

    showHudMessage("Viewer loaded", {
      duration: 1200,
      level: "info",
    });
  } catch (err) {
    console.error("[viewer-dev] boot failed:", err);

    if (elMetaFile) {
      elMetaFile.innerHTML =
        "<h3>File</h3>" + `<div>Source: ${jsonUrl}</div>`;
    }
    if (elMetaModel) {
      elMetaModel.innerHTML =
        "<h3>Model</h3>" +
        "<div style='color:#ff8888;'>Load error.</div>" +
        `<pre style="white-space:pre-wrap;font-size:10px;">${String(
          err,
        )}</pre>`;
    }

    showHudMessage("Viewer load error", {
      duration: 3000,
      level: "error",
    });

    return;
  }

  // --- ここから viewerHub が生きている前提で各 UI を接続 ---
  initFrameControls();
  initFilterControls();
  initModeHudLoop();
  initGizmoButtons();
  initWorldAxesToggle(viewerHub); // gizmo そばトグル
  initKeyboardShortcuts();
  initOrbitControls(viewerHub);   // ★ hub を渡すように変更
}

// window load → boot（エントリは 1 回だけ）
window.addEventListener("load", boot);