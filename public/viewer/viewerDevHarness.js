// viewerDevHarness.js
import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";

const DEFAULT_MODEL = "/data/sample/core_viewer_baseline.3dss.json";

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
    "hud-error"
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

  const btnRew = document.getElementById("btn-rew");
  const btnPlay = document.getElementById("btn-play");
  const btnFF = document.getElementById("btn-ff");
  const btnStepBack = document.getElementById("btn-step-back");
  const btnHome = document.getElementById("btn-home");
  const btnStepForward = document.getElementById("btn-step-forward");

  const range = frameAPI.range();
  const current = frameAPI.get();

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

  if (slider) {
    slider.addEventListener("input", (ev) => {
      const v = Number(ev.target.value);
      if (!Number.isFinite(v)) return;
      frameAPI.set(v);
      updateLabelFromState();
    });
  }

  if (btnStepBack) {
    btnStepBack.addEventListener("click", () => {
      frameAPI.step(-1);
      updateLabelFromState();
    });
  }

  if (btnStepForward) {
    btnStepForward.addEventListener("click", () => {
      frameAPI.step(1);
      updateLabelFromState();
    });
  }

  if (btnHome) {
    btnHome.addEventListener("click", () => {
      frameAPI.set(range.min);
      updateLabelFromState();
    });
  }

  if (btnRew) {
    btnRew.addEventListener("click", () => {
      frameAPI.set(range.min);
      updateLabelFromState();
    });
  }

  if (btnFF) {
    btnFF.addEventListener("click", () => {
      frameAPI.set(range.max);
      updateLabelFromState();
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
        btnPlay.textContent = "Play";
        return;
      }
      btnPlay.textContent = "Stop";

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
// mode HUD + focus 表示
// ------------------------------------------------------------
function initModeHudLoop() {
  if (!viewerHub || !viewerHub.core) return;

  const elModeMacro = document.getElementById("mode-label-macro");
  const elModeMeso = document.getElementById("mode-label-meso");
  const elModeMicro = document.getElementById("mode-label-micro");
  const elFocusLabel = document.getElementById("mode-focus-label");
  const btnFocusToggle = document.getElementById("mode-focus-toggle");

  if (btnFocusToggle) {
    btnFocusToggle.addEventListener("click", () => {
      const sel = viewerHub.core.selection.get();
      if (!sel || !sel.uuid) return;
      viewerHub.core.mode.set("micro", sel.uuid);
    });
  }

  if (elModeMeso) {
    elModeMeso.style.cursor = "pointer";
    elModeMeso.addEventListener("click", () => {
      const sel = viewerHub.core.selection.get();
      if (!sel || !sel.uuid) return;
      viewerHub.core.mode.set("meso", sel.uuid);
    });
  }

  let lastMode = null;

  function loop() {
    if (!viewerHub || !viewerHub.core) {
      requestAnimationFrame(loop);
      return;
    }

    const modeAPI = viewerHub.core.mode;
    const uiState = viewerHub.core.uiState;

    const mode = modeAPI.get();
    if (mode !== lastMode) {
      lastMode = mode;
      let msg = "";
      if (mode === "macro") msg = "MACRO MODE";
      else if (mode === "meso") msg = "MESO MODE";
      else if (mode === "micro") msg = "MICRO MODE";
      if (msg) showHudMessage(msg, { duration: 800, level: "info" });
    }

    if (elModeMacro) {
      elModeMacro.classList.toggle("mode-pill-active", mode === "macro");
    }
    if (elModeMeso) {
      elModeMeso.classList.toggle("mode-pill-active", mode === "meso");
    }
    if (elModeMicro) {
      elModeMicro.classList.toggle("mode-pill-active", mode === "micro");
    }

    if (elFocusLabel && uiState) {
      const sel = uiState.selection || null;
      const txt = sel && sel.uuid ? sel.uuid : "-";
      elFocusLabel.textContent = txt;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

// ------------------------------------------------------------
// ギズモボタン（HOME / 軸スナップ）
// ------------------------------------------------------------
function initGizmoButtons() {
  if (!viewerHub || !viewerHub.core || !viewerHub.core.camera) return;
  const camera = viewerHub.core.camera;

  // 矢印ボタン（data-key="ArrowLeft" など）がもしあれば回す
  const gizmoArrows = document.querySelectorAll(".gizmo-arrow");
  gizmoArrows.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const key = btn.dataset.key;
      if (!key) return;
      const fast = ev.shiftKey === true;
      const STEP = Math.PI / 90; // 約 2°
      const STEP_FAST = Math.PI / 45; // 約 4°
      const s = fast ? STEP_FAST : STEP;

      switch (key) {
        case "ArrowLeft":
          camera.rotate(-s, 0);
          break;
        case "ArrowRight":
          camera.rotate(s, 0);
          break;
        case "ArrowUp":
          camera.rotate(0, -s);
          break;
        case "ArrowDown":
          camera.rotate(0, s);
          break;
      }
    });
  });

  // HOME ボタン
  const btnHomeCam = document.querySelector("[data-gizmo='home']");
  if (btnHomeCam) {
    btnHomeCam.addEventListener("click", () => {
      if (typeof camera.reset === "function") {
        camera.reset();
      }
      showHudMessage("Camera: HOME", { duration: 800, level: "info" });
    });
  }

  // X/Y/Z 軸ボタン
  const axisButtons = document.querySelectorAll("[data-axis]");
  axisButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const axis = btn.dataset.axis; // "x" | "y" | "z" の想定
      if (!axis) return;
      if (typeof camera.snapToAxis === "function") {
        camera.snapToAxis(axis);
      }
      showHudMessage(`Camera axis: ${axis.toUpperCase()}`, {
        duration: 800,
        level: "info",
      });
    });
  });
}

// ------------------------------------------------------------
// キーボードショートカット（Space → Play トグル）
// ------------------------------------------------------------
function initKeyboardShortcuts() {
  window.addEventListener("keydown", (ev) => {
    if (!viewerHub || !viewerHub.core) return;

    const tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (ev.code === "Space") {
      ev.preventDefault();
      const btnPlay = document.getElementById("btn-play");
      if (btnPlay) btnPlay.click();
    }
  });
}

// ------------------------------------------------------------
// boot: viewer_dev.html → viewerDevHarness → bootstrapViewerFromUrl
// ------------------------------------------------------------
async function boot() {
  console.log("[viewer-dev] boot start");

  clearMetaPanels();

  const canvasId = "viewer-canvas";

  // ★使うサンプルをここで切り替える
  // const jsonUrl = "../3dss/sample/frame_test.3dss.json";
  // const jsonUrl = "../3dss/sample/frame_filter_test.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_cluster_medium.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_depth_layers.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_label.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_long_span.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_min.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_mixed.3dss.json";
  // const jsonUrl = "../3dss/sample/xyz_basis.3dss.json";
  // const jsonUrl = "../3dss/sample/sample_arrows.3dss.json";
  const jsonUrl = "../3dss/sample/frame_aux_demo.3dss.json";

  try {
    viewerHub = await bootstrapViewerFromUrl(canvasId, jsonUrl, {
      devBootLog: true,
      devLabel: "viewer_dev",
      modelUrl: jsonUrl, // CAMERA/LAYERS/FRAME ログの MODEL 行用
    });
    window.hub = viewerHub; // デバッグ用

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
          err
        )}</pre>`;
    }

    showHudMessage("Viewer load error", {
      duration: 3000,
      level: "error",
    });

    return;
  }

  initFrameControls();
  initFilterControls();
  initModeHudLoop();
  initGizmoButtons();
  initKeyboardShortcuts();
}

// window load → boot（エントリは 1 回だけ）
window.addEventListener("load", boot);
