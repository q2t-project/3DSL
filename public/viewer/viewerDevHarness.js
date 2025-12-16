// viewerDevHarness.js

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";
import { attachGizmo } from "./ui/gizmo.js";
import { attachDetailView } from "./ui/detailView.js";
import { PointerInput } from "./ui/pointerInput.js";
import { KeyboardInput } from "./ui/keyboardInput.js";

// baseline 起動時のデフォルト 3DSS
const DEFAULT_MODEL = "/3dss/canonical/valid/sample02_mixed_basic.3dss.json";

let viewerHub = null;
let playTimer = null;
let detailViewHandle = null;
let stopFrameUiLoop = null;
let stopModeHudLoop = null;
let stopUiBindings = null;

function disposeCurrentViewer() {
  const hub = viewerHub;
  viewerHub = null;
  if (!hub) return;
  try {
    // まず専用disposeがあればそれが正
    if (typeof hub.dispose === "function") {
      hub.dispose();
      return;
    }
    // 次点：rendererContext を持ってるならそれを殺す
    if (hub.rendererContext?.dispose) hub.rendererContext.dispose();
    // 次点：renderer
    if (hub.renderer?.dispose) hub.renderer.dispose();
  } catch (_e) {}
}

// Vite HMR: モジュール差し替え前に必ず掃除
if (import.meta?.hot) {
  import.meta.hot.dispose(() => {
    disposeCurrentViewer();
  });
}

function stopTimer() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

function disposeDetailView() {
  if (detailViewHandle && typeof detailViewHandle.dispose === "function") {
    detailViewHandle.dispose();
  }
  detailViewHandle = null;
}

 function stopLoops() {
   if (typeof stopFrameUiLoop === "function") stopFrameUiLoop();
   if (typeof stopModeHudLoop === "function") stopModeHudLoop();
   if (typeof stopUiBindings === "function") stopUiBindings();
   stopFrameUiLoop = null;
   stopModeHudLoop = null;
   stopUiBindings = null;
 }

function cleanupHarness() {
  stopTimer();
  stopLoops();
  disposeInputs();
  disposeDetailView();
  if (viewerHub && typeof viewerHub.stop === "function") {
    viewerHub.stop();
  }
  viewerHub = null;
}

function startRafLoop(fn) {
  let alive = true;
  let rafId = 0;
  const loop = () => {
    if (!alive) return;
    try { fn(); } catch (e) { console.warn("[viewer-dev] raf loop error:", e); }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
  return () => {
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
  };
}

// 入力デバイス
let pointerInput = null;
let keyboardInput = null;

// ------------------------------------------------------------
// DOM キャッシュ（window load 後にまとめて取得）
// ------------------------------------------------------------
let elCanvas = null;
let elMetaFile = null;
let elMetaModel = null;
let elMetaModelLog = null;
let elHud = null;

// ドキュメントのキャプション表示用
let elDocCaptionTitle = null;
let elDocCaptionBody = null;

function cacheDomElements() {
  elCanvas = document.getElementById("viewer-canvas");
  elMetaFile = document.getElementById("meta-file");
  elMetaModel = document.getElementById("meta-model");
  elMetaModelLog = document.getElementById("meta-model-log");
  elHud = document.getElementById("viewer-hud");
  // 新: doc-caption-* / 旧: scene-meta-* の両方をフォロー
  elDocCaptionTitle =
    document.getElementById("doc-caption-title") ||
    document.getElementById("scene-meta-title");
  elDocCaptionBody =
    document.getElementById("doc-caption-body") ||
    document.getElementById("scene-meta-body");
}

// ------------------------------------------------------------------
// ドキュメントキャプション更新（右上オーバーレイ）
//   - runtime/bootstrap が用意した hub.core.documentCaption を使う
//   - host 側は 3DSS のフィールド名を一切知らない
// ------------------------------------------------------------------
function updateDocumentCaptionPanel(hub) {
  if (!elDocCaptionTitle || !elDocCaptionBody) {
    devLog("[viewer-dev] updateDocumentCaptionPanel: no caption DOM", {
      hasTitleEl: !!elDocCaptionTitle,
      hasBodyEl: !!elDocCaptionBody,
    });
    return;
  }

  const core = hub && hub.core ? hub.core : null;
  const cap  = core && core.documentCaption ? core.documentCaption : null;
  devLog("[viewer-dev] updateDocumentCaptionPanel: caption =", cap);

  if (!cap) {
    elDocCaptionTitle.textContent = "";
    elDocCaptionBody.textContent  = "";
    return;
  }

  elDocCaptionTitle.textContent = cap.title || "";
  elDocCaptionBody.textContent  = cap.body  || "";
}

// dev 用ログフラグ
const DEBUG_DEV_HARNESS = true;

function devLog(...args) {
  if (!DEBUG_DEV_HARNESS) return;
  console.log(...args);
}

// ------------------------------------------------------------
// 共通ユーティリティ
// ------------------------------------------------------------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// MODEL パネル用：ログ 1 行をラベル＆本文に分解
function formatModelLogLine(rawLine) {
  const line = String(rawLine || "").trim();

  // BOOT: そのまま 1 行
  let m = line.match(/^BOOT\s+(.+)$/);
  if (m) {
    return {
      label: "BOOT",
      mode: "inline",        // ラベルの右に文
      html: escapeHtml(m[1]),
    };
  }

  // MODEL: ラベルの下にパスだけ 1 行
  m = line.match(/^MODEL\s+(.+)$/);
  if (m) {
    return {
      label: "MODEL",
      mode: "stacked",       // ラベルの下に本文を縦積み
      html: `<div class="model-log-mono">${escapeHtml(m[1])}</div>`,
    };
  }

  // CAMERA: position / target / fov 固定レイアウト
  m = line.match(/^CAMERA\s+(\{.*\})$/);
  if (m) {
    try {
      const obj = JSON.parse(m[1]);
      const pos = obj.position || obj.pos || [0, 0, 0];
      const tgt = obj.target || [0, 0, 0];
      const fov = obj.fov;

      const posText = `[${pos.join(", ")}]`;
      const tgtText = `[${tgt.join(", ")}]`;
      const fovText = fov != null ? String(fov) : "?";

      return {
        label: "CAMERA",
        mode: "stacked",
        html:
          `<div>position: ${escapeHtml(posText)}</div>` +
          `<div>target: ${escapeHtml(tgtText)}</div>` +
          `<div>fov: ${escapeHtml(fovText)}</div>`,
      };
    } catch (_e) {
      // JSON 壊れてたら、とりあえず生で出す
      return {
        label: "CAMERA",
        mode: "stacked",
        html: `<div class="model-log-mono">${escapeHtml(m[1])}</div>`,
      };
    }
  }

  // LAYERS: lines / points / aux を 1 行ずつ
  m = line.match(/^LAYERS\s+(.+)$/);
  if (m) {
    const map = { lines: "?", points: "?", aux: "?" };
    m[1].split(/\s+/).forEach((pair) => {
      const [k, v] = pair.split("=");
      if (k && v != null && k in map) map[k] = v;
    });

    return {
      label: "LAYERS",
      mode: "stacked",
      html:
        `<div>lines=${escapeHtml(map.lines)}</div>` +
        `<div>points=${escapeHtml(map.points)}</div>` +
        `<div>aux=${escapeHtml(map.aux)}</div>`,
    };
  }

  // FRAME: current / range / count
  // ログ側を「FRAME frame_id=-1 range=[-1,2] count=4」みたいに揃える想定
  m = line.match(/^FRAME\s+(.+)$/);
  if (m) {
    const kv = {};
    m[1].split(/\s+/).forEach((pair) => {
      const [k, v] = pair.split("=");
      if (!k) return;
      kv[k] = v;
    });

    const current = kv.frame_id || kv.current || "?";
    const range = kv.range || kv.frame_range || "";
    const count = kv.count || kv.total || "";

    const parts = [];
    parts.push(`current: ${current}`);
    if (range) parts.push(`range: ${range}`);
    if (count) parts.push(`count: ${count}`);

    return {
      label: "FRAME",
      mode: "stacked",
      html: parts.map((t) => `<div>${escapeHtml(t)}</div>`).join(""),
    };
  }

  // その他：ラベルなしの素の 1 行
  return {
    label: null,
    mode: "inline",
    html: escapeHtml(line),
  };
}

function getCore(hub = viewerHub) {
  return hub && hub.core ? hub.core : null;
}

function disposeInputs() {
  if (pointerInput && typeof pointerInput.dispose === "function") {
    pointerInput.dispose();
  }
  if (keyboardInput && typeof keyboardInput.dispose === "function") {
    keyboardInput.dispose();
  }
  pointerInput = null;
  keyboardInput = null;
}

// ------------------------------------------------------------
// Pointer / Keyboard 入力
// ------------------------------------------------------------
function attachInputs(hub) {
  const core = getCore(hub);
  if (!elCanvas || !core) {
    console.warn("[viewer-dev] attachInputs: canvas/core not ready");
    return;
  }

  disposeInputs();

  // PointerInput は (canvas, hub)
  pointerInput = new PointerInput(elCanvas, hub);
  if (typeof pointerInput.attach === "function") {
    pointerInput.attach();
  }

  // KeyboardInput は (window, hub)
  keyboardInput = new KeyboardInput(window, hub);
  if (typeof keyboardInput.attach === "function") {
    keyboardInput.attach();
  }

  devLog("[viewer-dev] Pointer/Keyboard attached", {
    pointerInput,
    keyboardInput,
  });

  // デバッグ用
  if (DEBUG_DEV_HARNESS) {
    window.pointerInput = pointerInput;
    window.keyboardInput = keyboardInput;
  }
}

// ------------------------------------------------------------
// エラー表示 / メタパネル初期化
// ------------------------------------------------------------
function showFatalError(kind, message) {
  cleanupHarness();
  if (elMetaFile) {
    elMetaFile.innerHTML = `
      <h3>File</h3>
      <div class="error">
        <strong>${escapeHtml(kind)}</strong><br/>
        <code>${escapeHtml(message)}</code>
      </div>
    `;
  }
  if (elMetaModel) {
    elMetaModel.innerHTML =
      "<h3>Model</h3><div>(no struct loaded)</div>";
  }
  if (elHud) {
    elHud.dataset.status = "error";
    elHud.textContent = `ERROR: ${kind}`;
  }

  // エラー時は今回の hub は捨てる
  viewerHub = null;
}

function classifyBootstrapError(err) {
  const raw = String(err || "");
  const code = err && (err.code || err.name);
  const message =
    (err && err.message) || (typeof err === "string" ? err : raw);

  if (code === "NETWORK_ERROR") {
    return { kind: "NETWORK_ERROR", message };
  }
  if (code === "JSON_ERROR") {
    return { kind: "JSON_ERROR", message };
  }
  if (code === "VALIDATION_ERROR") {
    return { kind: "VALIDATION_ERROR", message };
  }

  if (raw.includes("3DSS validation failed")) {
    return { kind: "VALIDATION_ERROR", message };
  }
  if (raw.includes("Unexpected token") || raw.includes("JSON")) {
    return { kind: "JSON_ERROR", message };
  }
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return { kind: "NETWORK_ERROR", message };
  }

  return { kind: "UNKNOWN_ERROR", message };
}

function clearMetaPanels() {
  if (elMetaFile) {
    elMetaFile.innerHTML = "<h3>File</h3><div>(loading...)</div>";
  }

  // Model パネルは h3 はそのまま残し、
  // 中身 (#meta-model-log) だけリセットする
  if (elMetaModelLog) {
    elMetaModelLog.innerHTML = "(logs will appear here)";
    // 初期化フラグもリセット
    if (elMetaModelLog.dataset) {
      delete elMetaModelLog.dataset.initialized;
    }
  }

  // ドキュメントキャプションもリセット
  if (elDocCaptionTitle) elDocCaptionTitle.textContent = "";
  if (elDocCaptionBody)  elDocCaptionBody.textContent  = "";
}

function appendModelLog(line) {
  if (!elMetaModel || !elMetaModelLog) return;

  // 初回だけプレースホルダを消す
  if (!elMetaModelLog.dataset.initialized) {
    elMetaModelLog.innerHTML = "";
    elMetaModelLog.dataset.initialized = "1";
  }

  const { label, mode, html } = formatModelLogLine(line);

  const row = document.createElement("div");
  row.className = "model-log-row";
  if (mode === "stacked") {
    row.classList.add("model-log-row--stacked");
  }

  if (label) {
    const chip = document.createElement("span");
    chip.className =
      "model-log-label model-log-label--" + label.toLowerCase();
    chip.textContent = label;
    row.appendChild(chip);
  }

  const body = document.createElement(mode === "stacked" ? "div" : "span");
  body.className = "model-log-text";
  body.innerHTML = html;
  row.appendChild(body);

  elMetaModelLog.appendChild(row);

  // 尾っぽにスクロール
  elMetaModel.scrollTop = elMetaModel.scrollHeight;
}

// dev 用：コンソールからも触れるように
window.viewerLog = appendModelLog;

// ------------------------------------------------------------
// HUD トースト
// ------------------------------------------------------------
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
function initFilterControls(hub) {
  const core = getCore(hub);
  if (!core || !core.filters) return;

  const filtersAPI = core.filters;

  const btnLines = document.getElementById("filter-lines");
  const btnPoints = document.getElementById("filter-points");
  const btnAux = document.getElementById("filter-aux");

  function setFilterButtonState(btn, enabled) {
    if (!btn) return;
    if (enabled) {
      btn.classList.remove("filter-off");
      btn.classList.add("filter-on");
    } else {
      btn.classList.remove("filter-on");
      btn.classList.add("filter-off");
    }
  }

  function syncFilterUI() {
    const f = filtersAPI.get() || {};
    setFilterButtonState(btnLines,  f.lines  !== false);
    setFilterButtonState(btnPoints, f.points !== false);
    setFilterButtonState(btnAux,    f.aux    !== false);
  }

  function toggleFilter(type, btn) {
    if (!btn) return;
    const next = btn.classList.contains("filter-off");
    filtersAPI.setTypeEnabled(type, next);
    syncFilterUI();
  }

  const disposers = [];
  const on = (el, type, fn) => {
    if (!el) return;
    el.addEventListener(type, fn);
    disposers.push(() => el.removeEventListener(type, fn));
  };

  on(btnLines,  "click", () => toggleFilter("lines",  btnLines));
  on(btnPoints, "click", () => toggleFilter("points", btnPoints));
  on(btnAux,    "click", () => toggleFilter("aux",    btnAux));

  syncFilterUI();
  return () => disposers.splice(0).forEach((d) => d());
}

// ------------------------------------------------------------
// viewerSettings コントロール（microFX profile のみ）
// ------------------------------------------------------------
function initViewerSettingsControls(hub) {
  const vs = hub && hub.viewerSettings ? hub.viewerSettings : null;
  if (!vs) return;

  const elLineMode = document.getElementById("vs-linewidth-mode");
  const elMicroProfile = document.getElementById("vs-micro-profile");

  const disposers = [];
  const on = (el, type, fn) => {
    if (!el) return;
    el.addEventListener(type, fn);
    disposers.push(() => el.removeEventListener(type, fn));
  };

  if (elLineMode) {
    // 既存 option と整合する値に倒しておく（表示用）
    if (!elLineMode.value) elLineMode.value = "auto";
    elLineMode.disabled = true;
    elLineMode.title = "Line width is fixed to 1px in this build.";
  }

  // microFX profile
  if (elMicroProfile && typeof vs.setMicroFXProfile === "function") {
    let currentProfile = "normal";
    if (typeof vs.getMicroFXProfile === "function") {
      try { currentProfile = vs.getMicroFXProfile() || "normal"; } catch (_e) {}
    }
    elMicroProfile.value = currentProfile;

    // runtime → UI 同期
    if (typeof vs.onMicroFXProfileChanged === "function") {
      const cb = (profile) => {
        if (!elMicroProfile) return;
        elMicroProfile.value = profile || "normal";
      };
      const off = vs.onMicroFXProfileChanged(cb);
      if (typeof off === "function") disposers.push(off);
    }

    // UI → runtime
    const onChange = () => {
      const profile = elMicroProfile.value;
      vs.setMicroFXProfile(profile);
      devLog("[viewer-dev settings] microFX profile =", profile);
      showHudMessage(`micro FX: ${profile}`, {
        duration: 700,
        level: "info",
      });
    };
    on(elMicroProfile, "change", onChange);
  }
  return () => disposers.splice(0).forEach((d) => {
    try { d(); } catch (e) { console.warn("[viewer-dev] dispose viewerSettings failed:", e); }
  });
}

// ------------------------------------------------------------
// frame コントロール
// ------------------------------------------------------------
function initFrameControls(hub) {
  const core = getCore(hub);
  if (!core || !core.frame) return;

  const frameAPI = core.frame;

  const slider = document.getElementById("frame-slider");
  const sliderWrapper =
    document.getElementById("frame-slider-wrapper") ||
    document.querySelector(".frame-main") ||
    null;
  const labelCurrent =
    document.getElementById("frame-label-current") ||
    document.getElementById("frame-slider-label") ||
    null;
  const labelMin = document.getElementById("frame-label-min");
  const labelMax = document.getElementById("frame-label-max");
  const labelZero = document.getElementById("frame-label-zero");
  const zeroLine = document.getElementById("frame-zero-line");

  const frameBlock = document.querySelector(".frame-block");
  const frameControls = document.getElementById("frame-controls");

  // "gauge" = パラパラ用ゲージ, "timeline" = 連続再生バー
  let frameUiMode = "gauge";

  const btnRew = document.getElementById("btn-rew");
  const btnPlay = document.getElementById("btn-play");
  const btnFF = document.getElementById("btn-ff");
  const btnStepBack = document.getElementById("btn-step-back");
  const btnStepForward = document.getElementById("btn-step-forward");
  const btnHome = document.getElementById("btn-home");

  const range = frameAPI.getRange();
  const current = frameAPI.getActive();
  const hasMultipleFrames = range.max > range.min;
  const ZERO_FRAME = 0;

  // min/max ラベル初期値
  if (labelMin) labelMin.textContent = String(range.min);
  if (labelMax) labelMax.textContent = String(range.max);

  if (btnHome) {
    btnHome.addEventListener("click", () => {
      frameAPI.setActive(0);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  // フレーム操作用 HUD
  function showFrameToast(kind) {
    if (!hasMultipleFrames) return;

    const cur = frameAPI.getActive();
    let msg = "";

    if (kind === "play-start") {
      msg = `Frame: play [${range.min} … ${range.max}]`;
    } else if (kind === "play-stop") {
      msg = `Frame: stop (frame ${cur})`;
    } else if (kind === "jump") {
      msg = `Frame: ${cur}`;
    }

    if (msg) {
      showHudMessage(msg, { duration: 800, level: "info" });
    }
  }

  // 0 ラベル＋縦線の位置・表示/非表示
  function updateZeroMarker() {
    if (!sliderWrapper) return;

    const span = range.max - range.min;
    const zeroInRange = ZERO_FRAME >= range.min && ZERO_FRAME <= range.max;

    if (!Number.isFinite(span) || span <= 0 || !zeroInRange) {
      sliderWrapper.style.setProperty("--frame-zero-frac", "0.5");
      if (labelZero) labelZero.style.display = "none";
      if (zeroLine) zeroLine.style.display = "none";
      return;
    }

    const zeroIsMin = ZERO_FRAME === range.min;
    const zeroIsMax = ZERO_FRAME === range.max;
    const hideZero = zeroIsMin || zeroIsMax;

    if (hideZero) {
      if (labelZero) labelZero.style.display = "none";
      if (zeroLine) zeroLine.style.display = "none";
    } else {
      const frac = (ZERO_FRAME - range.min) / span;
      const clamped = Math.max(0, Math.min(1, frac));
      sliderWrapper.style.setProperty("--frame-zero-frac", String(clamped));
      if (labelZero) {
        labelZero.style.display = "";
        labelZero.textContent = "0";
      }
      if (zeroLine) {
        zeroLine.style.display = "";
      }
    }
  }

  // 現在値ラベル（丸）と slider value の同期
  function updateLabelFromState() {
    const f = frameAPI.getActive();

    if (slider) slider.value = f;
    if (labelCurrent) labelCurrent.textContent = String(f);

    if (sliderWrapper) {
      const span = range.max - range.min;
      if (!Number.isFinite(span) || span <= 0) {
        sliderWrapper.style.setProperty("--frame-value-frac", "0");
      } else {
        let frac = (f - range.min) / span;
        frac = Math.max(0, Math.min(1, frac));
        sliderWrapper.style.setProperty("--frame-value-frac", String(frac));
      }
    }
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
      btnStepForward,
    ];
    controls.forEach((el) => {
      if (!el) return;
      el.disabled = !hasMultipleFrames;
    });
  }

  // フレーム UI モードを CSS に反映
  function setFrameUiMode(mode) {
    if (!hasMultipleFrames) {
      mode = "gauge";
    }
    frameUiMode = mode;
    if (frameControls) {
      frameControls.classList.toggle(
        "mode-continuous",
        mode === "timeline",
      );
    }
    if (slider) {
      slider.classList.toggle(
        "frame-mode-timeline",
        mode === "timeline",
      );
      slider.classList.toggle(
        "frame-mode-gauge",
        mode === "gauge",
      );
    }
  }

  // Play ボタンの見た目を制御（アイコン入れ替え用）
  function setPlayButtonState(isPlaying) {
    if (!btnPlay) return;
    btnPlay.classList.toggle("is-playing", !!isPlaying);
  }

  // 初期セットアップ
  if (slider) {
    slider.min = range.min;
    slider.max = range.max;
    slider.step = 1;
    slider.value = current;
  }
  updateFrameEnabledState();
  setFrameUiMode("gauge");
  updateZeroMarker();
  updateLabelFromState();
  setPlayButtonState(false);

  // イベントハンドラ
  if (slider) {
    slider.addEventListener("input", (ev) => {
      const v = Number(ev.target.value);
      if (!Number.isFinite(v)) return;
      frameAPI.setActive(v);
      updateLabelFromState();
      setFrameUiMode("gauge");
    });

    slider.addEventListener("change", () => {
      showFrameToast("jump");
    });
  }

  if (btnStepBack) {
    btnStepBack.addEventListener("click", () => {
      frameAPI.prev();
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnStepForward) {
    btnStepForward.addEventListener("click", () => {
      frameAPI.next();
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnRew) {
    btnRew.addEventListener("click", () => {
      frameAPI.setActive(range.min);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnFF) {
    btnFF.addEventListener("click", () => {
      frameAPI.setActive(range.max);
      updateLabelFromState();
      setFrameUiMode("gauge");
      showFrameToast("jump");
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (!hasMultipleFrames) return;

      // 停止側
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;

        setPlayButtonState(false);

        if (typeof frameAPI.stopPlayback === "function") {
          frameAPI.stopPlayback();
        }

        setFrameUiMode("gauge");
        showFrameToast("play-stop");
        return;
      }

      // 開始側
      setPlayButtonState(true);

      if (typeof frameAPI.startPlayback === "function") {
        frameAPI.startPlayback();
      }

      setFrameUiMode("timeline");
      showFrameToast("play-start");

      playTimer = setInterval(() => {
        const r = frameAPI.getRange();
        const cur = frameAPI.getActive();
        if (cur >= r.max) {
          frameAPI.setActive(r.min);
        } else {
          frameAPI.next();
        }
        updateLabelFromState();
      }, 600);
    });
  }

  // 他経路（キーボード等）からの変更を拾って UI を同期
  let lastFrame = frameAPI.getActive();
  return startRafLoop(() => {
    const f = frameAPI.getActive();
    if (f !== lastFrame) {
      lastFrame = f;
      updateLabelFromState();
    }
  });
}

// ------------------------------------------------------------
// mode HUD（モードトースト＋Gizmo 内テキスト）
// ------------------------------------------------------------
function initModeHudLoop(hub) {
  const core = getCore(hub);
  if (!core) return;

  const elModeText = document.getElementById("gizmo-mode-label");
  let lastMode = null;

  return startRafLoop(() => {
    const currentCore = getCore(hub);
    if (!currentCore) return;

    const modeAPI =
      (currentCore.mode && typeof currentCore.mode.get === "function" && currentCore.mode) ||
      (currentCore.modeController &&
        typeof currentCore.modeController.get === "function" &&
        currentCore.modeController);
    if (!modeAPI) return;

    const mode = modeAPI.get();
    if (mode !== lastMode) {
      lastMode = mode;

      if (elModeText) {
        elModeText.textContent = mode === "micro" ? "micro" : "macro";
      }

      let msg = "";
      if (mode === "macro") msg = "MACRO MODE";
      else if (mode === "micro") msg = "MICRO MODE";
      if (msg) showHudMessage(msg, { duration: 800, level: "info" });
    }
  });
}
// ------------------------------------------------------------
// ギズモボタン（HOME / 軸スナップ）
// ------------------------------------------------------------
function initGizmoButtons(hub) {
  const core = getCore(hub);

  devLog(
    "[viewer-dev gizmo] initGizmoButtons start",
    core && core.camera,
  );

  if (!core || !core.camera) {
    console.warn("[viewer-dev gizmo] hub/core.camera not ready");
    return;
  }

  const camera = core.camera;

  const disposers = [];
  const on = (el, type, fn) => {
    if (!el) return;
    el.addEventListener(type, fn);
    disposers.push(() => el.removeEventListener(type, fn));
  };

  // HOME ボタン
  const btnHomeCam = document.getElementById("gizmo-home");
  if (btnHomeCam) {
    devLog("[viewer-dev gizmo] HOME button found", btnHomeCam);
    const onHome = () => {
      devLog("[viewer-dev gizmo] HOME clicked");
      if (typeof camera.stopAutoOrbit === "function") {
        camera.stopAutoOrbit();
      }
      if (typeof camera.reset === "function") {
        camera.reset();
      }
      showHudMessage("Camera: HOME", { duration: 800, level: "info" });
    };
    on(btnHomeCam, "click", onHome);
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

    const onAxis = () => {
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
    };
    on(btn, "click", onAxis);
  });
  return () => disposers.splice(0).forEach((d) => d());
}

// ------------------------------------------------------------
// gizmo そばの座標軸トグルボタン
function initWorldAxesToggle(hub) {
  const btn = document.getElementById("world-axes-toggle");
  if (!btn || !hub || !hub.viewerSettings) {
    console.warn("[viewer-dev gizmo] world-axes toggle button not wired");
    return;
  }

  const vs = hub.viewerSettings;
  if (typeof vs.toggleWorldAxes !== "function") {
    console.warn(
      "[viewer-dev gizmo] viewerSettings.toggleWorldAxes not available",
    );
    return;
  }

  const disposers = [];
  const on = (el, type, fn) => {
    if (!el) return;
    el.addEventListener(type, fn);
    disposers.push(() => el.removeEventListener(type, fn));
  };

  function updateUI(visible) {
    const v = !!visible;
    btn.dataset.visible = v ? "true" : "false";
    btn.setAttribute("aria-pressed", v ? "true" : "false");
  }

  // 初期状態を viewerSettings 側から取得して UI へ反映
  let initialVisible = false;
  if (typeof vs.getWorldAxesVisible === "function") {
    try {
      initialVisible = !!vs.getWorldAxesVisible();
    } catch (_e) {
      initialVisible = false;
    }
  }
  updateUI(initialVisible);

  // runtime → UI 方向は onWorldAxesChanged で同期
  if (typeof vs.onWorldAxesChanged === "function") {
    const cb = (visible) => {
      updateUI(visible);
    };
    const off = vs.onWorldAxesChanged(cb);
    if (typeof off === "function") disposers.push(off);
  }

  // UI → runtime 方向はトグルだけ叩く
  const onClick = (ev) => {
    ev.preventDefault();
    vs.toggleWorldAxes();

    // onWorldAxesChanged が無い古い実装へのフォールバック
    if (typeof vs.onWorldAxesChanged !== "function") {
      if (typeof vs.getWorldAxesVisible === "function") {
        updateUI(vs.getWorldAxesVisible());
      }
    }
  };
  on(btn, "click", onClick);

  return () => disposers.splice(0).forEach((d) => d());
}

// ------------------------------------------------------------
// ぐるり俯瞰（AutoOrbit）コントロール（CW / autoOrbit / CCW）
// ------------------------------------------------------------
function initOrbitControls(hub) {
  const cam = hub?.core?.camera;
  const runtime = hub?.core?.runtime;
  if (!cam) return;

  const pill =
    document.getElementById("auto-orbit-pill") ||
    document.getElementById("auto-orbit-toggle"); // 互換（古いDOM用）

  // 新DOM（rev/stop/fwd）
  const btnRev = document.querySelector('.auto-orbit-btn[data-role="rev"]');
  const btnStop = document.querySelector('.auto-orbit-btn[data-role="stop"]');
  const btnFwd = document.querySelector('.auto-orbit-btn[data-role="fwd"]');

  // 旧DOM（cw/ccw）
  const btnCW = document.querySelector('.auto-orbit-btn-dir[data-dir="cw"]');
  const btnCCW = document.querySelector('.auto-orbit-btn-dir[data-dir="ccw"]');

  // 方向は既存JSの慣習に合わせて "cw"/"ccw" を維持（rev=ccw, fwd=cw）
  let lastDir = "cw";

  const disposers = [];
  const on = (el, type, fn) => {
    if (!el) return;
    el.addEventListener(type, fn);
    disposers.push(() => el.removeEventListener(type, fn));
  };

  const isRunning = () =>
    typeof runtime?.isCameraAuto === "function" ? !!runtime.isCameraAuto() : false; // specにもある

  const setPillState = () => {
    if (!pill) return;
    const on = isRunning();
    pill.classList.toggle("is-on", on);
    pill.dataset.state = on ? "on" : "off";
  };

  const start = (dir) => {
    if (dir) lastDir = dir;
    // startAutoOrbit は macro 強制＋isCameraAuto更新が規範
    if (typeof cam.startAutoOrbit === "function") cam.startAutoOrbit({ dir: lastDir });
    else if (typeof cam.updateAutoOrbitSettings === "function")
      cam.updateAutoOrbitSettings({ dir: lastDir });
    setPillState();
  };

  const stop = () => {
    if (typeof cam.stopAutoOrbit === "function") cam.stopAutoOrbit();
    setPillState();
  };

  const toggle = () => (isRunning() ? stop() : start(lastDir));

  // pill クリックでトグル
  if (pill) {
     const onPill = (e) => {
      e.preventDefault();
      toggle();
    };
    on(pill, "click", onPill);
  }

  // 新DOM wiring
  on(btnRev,  "click", (e) => { e.preventDefault(); start("ccw"); });
  on(btnFwd,  "click", (e) => { e.preventDefault(); start("cw"); });
  on(btnStop, "click", (e) => { e.preventDefault(); stop(); });

  // 旧DOM wiring（残ってても動くように）
  on(btnCW,  "click", (e) => { e.preventDefault(); start("cw"); });
  on(btnCCW, "click", (e) => { e.preventDefault(); start("ccw"); });

  // 初期同期
  setPillState();

  return () => disposers.splice(0).forEach((d) => d());
}

// ------------------------------------------------------------
// キーボードショートカット（Space → Play）
// ------------------------------------------------------------
let keyboardShortcutsInitialized = false;
function initKeyboardShortcuts() {
  if (keyboardShortcutsInitialized) return;
  keyboardShortcutsInitialized = true;

  window.addEventListener("keydown", (ev) => {
    if (!viewerHub || !getCore()) return;

    const tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Space → 再生トグル
    if (ev.code === "Space") {
      ev.preventDefault();
      const btnPlay = document.getElementById("btn-play");
      if (btnPlay) btnPlay.click();
    }
  });
}

// dev 用 logger（bootstrap に渡す）
function devLogger(line) {
  devLog(line);
  appendModelLog(line);
}


// ------------------------------------------------------------
// boot: viewer_dev.html → viewerDevHarness → bootstrapViewerFromUrl
// ------------------------------------------------------------
async function boot() {
  // ★二重boot/HMRで前のが残ると地獄になる
  if (viewerHub) {
    try { viewerHub.stop?.(); } catch (_e) {}
    try { viewerHub.dispose?.(); } catch (_e) {}
    viewerHub = null;
  }

  // ★再bootの前に必ず掃除（これが無いと WebGL context が積み上がる）
  disposeCurrentViewer();
  cacheDomElements();
  devLog("[viewer-dev] boot start", {
    canvas: !!elCanvas,
    metaFile: !!elMetaFile,
    docCaptionTitle: !!elDocCaptionTitle,
    docCaptionBody: !!elDocCaptionBody,
  });

  cleanupHarness();
  clearMetaPanels();

  const canvasId = "viewer-canvas";

  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get("model");
  const jsonUrl = urlParam || DEFAULT_MODEL;

  let bootError = null;

  try {
    viewerHub = await bootstrapViewerFromUrl(canvasId, jsonUrl, {
      devBootLog: true,
      devLabel: "viewer_dev",
      modelUrl: jsonUrl,
      logger: devLogger,
    });
    window.hub = viewerHub; // デバッグ用
  
  // ★これが無いと描画ループ始まらん
  try { viewerHub.start?.(); } catch (e) { console.warn("[viewer-dev] hub.start failed", e); }

  // devtools から触れるように（デバッグ用）
  globalThis.__hub = hub;
  globalThis.__core = hub.core;
  globalThis.__ui = hub.core?.uiState;
  globalThis.__cam = hub.core?.cameraEngine;
  globalThis.__tr = hub.core?.cameraTransition;

   // ドキュメントキャプション更新（hub → core.documentCaption）
   updateDocumentCaptionPanel(viewerHub);

    if (viewerHub && typeof viewerHub.start === "function") {
      viewerHub.start();
    }

    // gizmo 用 canvas を差し込む
    const gizmoSlot = document.getElementById("gizmo-slot");
    if (gizmoSlot && typeof attachGizmo === "function") {
      devLog("[viewer-dev gizmo] attachGizmo", gizmoSlot);
      attachGizmo(gizmoSlot, viewerHub);
    } else {
      console.warn("[viewer-dev gizmo] gizmo-slot missing or attachGizmo NG");
    }

    const detailWrapper = document.getElementById("viewer-detail");
    if (detailWrapper) {
      detailViewHandle = attachDetailView(detailWrapper, viewerHub);
    }

    // gizmo / detailView は上で接続済み。scene_meta は上の一回で十分。

    devLog(
      "[viewer-dev] hub created, core.camera =",
      getCore() && getCore().camera,
    );

    appendModelLog("Viewer boot OK.");

    // File メタ情報
    if (elMetaFile && getCore()) {
      const core = getCore();
      const frameAPI = core.frame || core.frameController || null;

      let range = { min: 0, max: 0 };
      let current = 0;

      if (frameAPI && typeof frameAPI.getRange === "function") {
        const r = frameAPI.getRange();
        if (r && typeof r.min === "number" && typeof r.max === "number") {
          range = r;
        }
      } else if (
        core.uiState &&
        core.uiState.frame &&
        core.uiState.frame.range
      ) {
        range = core.uiState.frame.range;
      }

      if (frameAPI && typeof frameAPI.getActive === "function") {
        current = frameAPI.getActive();
      } else if (
        core.uiState &&
        core.uiState.frame &&
        typeof core.uiState.frame.current === "number"
      ) {
        current = core.uiState.frame.current;
      }

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
    bootError = err;
  }


  if (bootError) {
    const { kind, message } = classifyBootstrapError(bootError);

    showFatalError(kind, message);

    showHudMessage(`Viewer load error: ${kind}`, {
      duration: 3000,
      level: "error",
    });

    return;
  }

  // --- viewerHub が生きている前提で各 UI を接続 ---
  stopFrameUiLoop = initFrameControls(viewerHub) || null;
  stopModeHudLoop = initModeHudLoop(viewerHub) || null;
  initKeyboardShortcuts();
  // Pointer / Keyboard 入力（マウスドラッグ orbit / 矢印キー / click→micro）
  stopUiBindings = wireUiBindings(viewerHub) || null;
  attachInputs(viewerHub);
}
// ついで：コンソールから叩けるデバッグ窓口
globalThis.__viewerDev = globalThis.__viewerDev || {};
globalThis.__viewerDev.dispose = disposeCurrentViewer;

globalThis.__viewerDev.bootLoopTest = async function bootLoopTest(iter = 20, pauseMs = 50) {
  for (let i = 0; i < iter; i++) {
    console.log("[viewer-dev] bootLoopTest", i + 1, "/", iter);
    await boot();
    await new Promise((r) => setTimeout(r, pauseMs));
    disposeCurrentViewer();
    await new Promise((r) => setTimeout(r, pauseMs));
  }
  console.log("[viewer-dev] bootLoopTest done");
};

function wireUiBindings(hub) {
  const disposers = [];
  const push = (d) => { if (typeof d === "function") disposers.push(d); };

  push(initFilterControls(hub));
  push(initViewerSettingsControls(hub));
  push(initGizmoButtons(hub));
  push(initWorldAxesToggle(hub));
  push(initOrbitControls(hub));

  return () => {
    for (const off of disposers.splice(0)) {
      try { off(); } catch (e) { console.warn("[viewer-dev] dispose UI failed:", e); }
    }
  };
}

window.addEventListener("load", boot);
