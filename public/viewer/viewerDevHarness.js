// viewerDevHarness.js

// viewerDevHarness.js の責務
//
// - エントリ：window.load → boot() 1 回だけ
// - 3D canvas 生成や runtime 初期化はすべて bootstrapViewerFromUrl に委譲する
// - viewerHub.core.* / viewerHub.pickObjectAt 以外の runtime 内部には触らない
// - dev 用 HUD / メタパネル / ログ表示を提供する（本番 viewer には含めない）
// - KeyboardInput / PointerInput のロジックには干渉しない
//   - 例外：Space → Play トグルなど UI 専用ショートカットのみ許可


import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";
import { attachGizmo } from "./ui/gizmo.js";

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
  console.log(
    "[viewer-dev gizmo] initGizmoButtons start",
    viewerHub && viewerHub.core && viewerHub.core.camera
  );

  if (!viewerHub || !viewerHub.core || !viewerHub.core.camera) {
    console.warn("[viewer-dev gizmo] hub/core.camera not ready");
    return;
  }

  const camera = viewerHub.core.camera;

  // HOME ボタン
  const btnHomeCam = document.getElementById("gizmo-home");
  if (btnHomeCam) {
    console.log("[viewer-dev gizmo] HOME button found", btnHomeCam);
    btnHomeCam.addEventListener("click", () => {
      console.log("[viewer-dev gizmo] HOME clicked");
      if (typeof camera.reset === "function") {
        camera.reset();
      }
      showHudMessage("Camera: HOME", { duration: 800, level: "info" });
    });
  } else {
    console.warn("[viewer-dev gizmo] gizmo-home button not found");
  }

  // X/Y/Z 軸ボタン
  const axisButtons = document.querySelectorAll(
    ".gizmo-axis[data-gizmo-axis]"
  );
  console.log(
    "[viewer-dev gizmo] axis buttons found:",
    axisButtons.length,
    axisButtons
  );

  axisButtons.forEach((btn) => {
    const axis = btn.dataset.gizmoAxis; // "x" | "y" | "z"
    console.log("[viewer-dev gizmo] axis button wired", axis, btn);

    btn.addEventListener("click", () => {
      console.log("[viewer-dev gizmo] axis clicked", axis);
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
// キーボードショートカット（Space → Play, Home → Camera HOME）
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
      console.log(line);
      appendModelLog(line);
    }

// ------------------------------------------------------------
// boot: viewer_dev.html → viewerDevHarness → bootstrapViewerFromUrl
// ------------------------------------------------------------
async function boot() {
  console.log("[viewer-dev] boot start");

  clearMetaPanels();

  const canvasId = "viewer-canvas";

  // ★使うサンプルをここで切り替える
  // const jsonUrl = "../3dss/sample/valid_minimum_L1-P2-A0.3dss.json";
  // const jsonUrl = "../3dss/sample/frame_filter_test.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_cluster_medium.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_depth_layers.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_label.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_long_span.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_min.3dss.json";
  // const jsonUrl = "../3dss/sample/microfx_mixed.3dss.json";
  // const jsonUrl = "../3dss/sample/xyz_basis.3dss.json";
  // const jsonUrl = "../3dss/sample/sample_arrows.3dss.json";
  // const jsonUrl = "../3dss/sample/frame_aux_demo.3dss.json";
  // const jsonUrl = "../3dss/sample/rpref-20p-40l.3dss.json";
  // const jsonUrl = "../3dss/sample/rpref-200p-400l.3dss.json";
   const jsonUrl = "../3dss/sample/rpref-1000p-2000l.3dss.json";
  // const jsonUrl = "../3dss/sample/rpref-4000p-8000l.3dss.json";

  try {
    viewerHub = await bootstrapViewerFromUrl(canvasId, jsonUrl, {
      devBootLog: true,
      devLabel: "viewer_dev",
      modelUrl: jsonUrl,
      logger: devLogger,
    });
    window.hub = viewerHub; // デバッグ用

    console.log(
      "[viewer-dev] hub created, core.camera =",
      viewerHub.core && viewerHub.core.camera
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
          err
        )}</pre>`;
    }

    showHudMessage("Viewer load error", {
      duration: 3000,
      level: "error",
    });

    return;
  }

  // --- ここから viewerHub が生きている前提で各 UI を接続 ---
  const gizmoWrapper = document.getElementById("gizmo-wrapper");
  if (gizmoWrapper && typeof attachGizmo === "function") {
    console.log("[viewer-dev gizmo] attachGizmo", gizmoWrapper);
    attachGizmo(gizmoWrapper, viewerHub);
  } else {
    console.warn("[viewer-dev gizmo] gizmoWrapper missing or attachGizmo NG");
  }

  initFrameControls();
  initFilterControls();
  initModeHudLoop();
  initGizmoButtons();
  initKeyboardShortcuts();
}

// window load → boot（エントリは 1 回だけ）
window.addEventListener("load", boot);
