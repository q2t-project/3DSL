// viewerDevHarness.js

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";
import { attachDetailView } from "./ui/detailView.js";
import { attachUiProfile } from "./ui/attachUiProfile.js";
import { startHub } from "./ui/hubOps.js";
import { teardownPrev, setOwnedHandle } from "./ui/ownedHandle.js";


// baseline 起動時のデフォルト 3DSS
const DEFAULT_MODEL = "/3dss/scene/default/default.3dss.json";
// const DEFAULT_MODEL = "/3dss/sample/glb_lefthand_righthand.3dss.json";

let viewerHub = null;
let detailViewHandle = null;

let uiHandle = null;

// owned handle（既存の変数はそのまま使い、teardown 儀式だけ共通化）
const owned = {
  get hub() { return viewerHub; },
  set hub(v) { viewerHub = v; },
  get ui() { return uiHandle; },
  set ui(v) { uiHandle = v; },
  get detailView() { return detailViewHandle; },
  set detailView(v) { detailViewHandle = v; },
};

function disposeUi() {
  teardownPrev(owned, "ui");
}

function disposeDetailView() {
  teardownPrev(owned, "detailView");
}

function stopHub() {
  teardownPrev(owned, "hub");
}

function exposeDevGlobals(hub, handle) {
  window.viewerHub = hub || null;
  window.hub = hub || null; // 互換
  window.__viewerHub = hub || null; // dev harness hook (stable)
  window.pointerInput  = handle?.pointerInput  || null;
  window.keyboardInput = handle?.keyboardInput || null;
  window.picker        = handle?.picker        || null;
  window.timeline      = handle?.timeline      || null;
}
function clearDevGlobals() {
  window.viewerHub = null;
  window.hub = null;
  window.__viewerHub = null;
  window.pointerInput = null;
  window.keyboardInput = null;
  window.picker = null;
  window.timeline = null;
}


function shutdown({ clearPanels = true } = {}) {
  disposeUi();
  disposeDetailView();
  stopHub();
  clearDevGlobals();
}

// ------------------------------------------------------------
// DOM キャッシュ（window load 後にまとめて取得）
// ------------------------------------------------------------
let elCanvas = null;
let elMetaFile = null;
let elMetaModel = null;
let elMetaModelLog = null;
let elHud = null;


function cacheDomElements() {
  elCanvas = document.getElementById("viewer-canvas");
  elMetaFile = document.getElementById("meta-file");
  elMetaModel = document.getElementById("meta-model");
  elMetaModelLog = document.getElementById("meta-model-log");
  elHud = document.getElementById("viewer-hud");
}

// ------------------------------------------------------------------
// ドキュメントキャプション更新（右上オーバーレイ）
//   - runtime/bootstrap が用意した hub.core.documentCaption を使う
//   - host 側は 3DSS のフィールド名を一切知らない
// ------------------------------------------------------------------

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

// ------------------------------------------------------------
// Pointer / Keyboard 入力
// ------------------------------------------------------------

// ------------------------------------------------------------
// エラー表示 / メタパネル初期化
// ------------------------------------------------------------
function showFatalError(kind, message) {
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

  // hub の stop/破棄は shutdown() に任せる（ここで null にしない）
}

function classifyBootstrapError(err) {
  const raw = String(err || "");
  const code = err && (err.kind || err.code || err.name);
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
let hudTimerId = null;
function showHudMessage(text, { duration = 1600, level = "info" } = {}) {
  if (!elHud) return;

  if (hudTimerId) { clearTimeout(hudTimerId); hudTimerId = null; }

  elHud.textContent = text;

  elHud.classList.remove(
    "hud-hidden",
    "hud-visible",
    "hud-info",
    "hud-warn",
    "hud-error"
  );
  elHud.classList.add("hud-visible", `hud-${level}`);

  hudTimerId = setTimeout(() => {
    elHud.classList.remove("hud-visible", `hud-${level}`);
    elHud.classList.add("hud-hidden");
  }, duration);
}

window.viewerToast = showHudMessage;


// ------------------------------------------------------------
// boot: viewer_dev.html → viewerDevHarness → bootstrapViewerFromUrl
// ------------------------------------------------------------
async function boot() {
  cacheDomElements();
  shutdown({ clearPanels: true });

  const params = new URLSearchParams(window.location.search);
  const jsonUrl = params.get("model") || DEFAULT_MODEL;
  const uiProfile = params.get("profile") || "devHarness_min";

  // 1) hub は最優先で立てて、失敗したらここで終了
  try {
    setOwnedHandle(owned, "hub", await bootstrapViewerFromUrl("viewer-canvas", jsonUrl, {
      devBootLog: true,
      devLabel: "viewer_dev",
      modelUrl: jsonUrl,
    }));
    // UI が無くても hub は公開する（runner が回せる）
    exposeDevGlobals(owned.hub, null);
    startHub(owned.hub);
  } catch (err) {
  console.error("[viewer-dev] boot failed:", err);
    const { kind, message } = classifyBootstrapError(err);
    showFatalError(kind, message);
    // 画面のエラー表示は残したいからパネルは消さない
    shutdown({ clearPanels: false });
    return;
  }

  // 2) UI は失敗しても hub を殺さない
  try {
    setOwnedHandle(owned, "ui", attachUiProfile(owned.hub, {
      profile: uiProfile,
      canvas: elCanvas,
      win: window,
      doc: document,
      gizmoWrapper: document.getElementById("gizmo-slot"),
      timelineRoot: document,
      force: true,
      toast: window.viewerToast,
      log: (...a) => console.log(...a),
    }));
    exposeDevGlobals(owned.hub, owned.ui);
  } catch (e) {
    console.warn("[viewer-dev] ui attach failed (continuing):", e);
  }

  // 3) detail view も任意（失敗しても hub 生存）
  try {
    const detailWrapper = document.getElementById("viewer-detail");
    if (detailWrapper) {
      setOwnedHandle(owned, "detailView", attachDetailView(detailWrapper, owned.hub));
    }
  } catch (e) {
    console.warn("[viewer-dev] detail attach failed (continuing):", e);
  }
}

// viewerDevHarness.js の末尾に追加
window.addEventListener("load", () => {
  boot();
});
