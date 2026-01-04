// viewer/runtime/core/uiState.js

import { DEFAULT_INPUT_POINTER, DEFAULT_INPUT_KEYBOARD, resolveInputDefaults } from './inputDefaults.js';

const DEFAULT_VIEW_PRESET_INDEX = 3; // iso_ne（方針がこれならここも合わせる）

// ビュー・プリセット index 正規化（0〜6 に丸める）
function normalizeViewPresetIndex(v) {
  const N = 7;
  if (v == null) return DEFAULT_VIEW_PRESET_INDEX;

  let i = Number(v);
  if (!Number.isFinite(i)) return DEFAULT_VIEW_PRESET_INDEX;
  i = Math.floor(i);

  if (i < 0) {
    return ((i % N) + N) % N; // 負数にも対応した mod
  }
  return i % N;
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function int(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function bool(v, fallback) {
  return typeof v === "boolean" ? v : fallback;
}

function clampFov(v, fallback = 50) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(179, Math.max(1, n));
}

function normalizeFrame(frameInit) {
  const min0 = int(frameInit?.range?.min, 0);
  const max0 = int(frameInit?.range?.max, min0);
  const min = Math.min(min0, max0);
  const max = Math.max(min0, max0);
  let current = int(frameInit?.current, min);
  if (current < min) current = min;
  if (current > max) current = max;
  return { current, range: { min, max } };
}

function normalizePlayback(pbInit) {
  const fps = num(pbInit?.fps, 6);
  const accumulator = num(pbInit?.accumulator, 0);
  return {
    fps: Number.isFinite(fps) && fps > 0 ? fps : 6,
    accumulator: Number.isFinite(accumulator) && accumulator >= 0 ? accumulator : 0,
  };
}

function normalizeLineWidthMode(v) {
  return v === "auto" || v === "fixed" || v === "adaptive" ? v : "auto";
}

function normalizeInfoDisplay(v) {
  // enum は仕様に合わせて調整
  return v === "select" || v === "hover" || v === "off" ? v : "select";
}

function normalizeMicroProfile(v) {
  return v === "weak" || v === "normal" || v === "strong" ? v : "normal";
}

function normalizeInputSettings(v, defaults = null) {
  const src = v && typeof v === "object" ? v : {};
  const pointerSrc = src.pointer && typeof src.pointer === "object" ? src.pointer : {};
  const keyboardSrc = src.keyboard && typeof src.keyboard === "object" ? src.keyboard : {};

  const dPointer =
    defaults && typeof defaults === 'object' && defaults.pointer && typeof defaults.pointer === 'object'
      ? defaults.pointer
      : DEFAULT_INPUT_POINTER;
  const dKeyboard =
    defaults && typeof defaults === 'object' && defaults.keyboard && typeof defaults.keyboard === 'object'
      ? defaults.keyboard
      : DEFAULT_INPUT_KEYBOARD;

  // --- pointer ---
  const minDragPx = Math.max(0, int(pointerSrc.minDragPx, dPointer.minDragPx));
  const clickMovePx = Math.max(0, num(pointerSrc.clickMovePx, dPointer.clickMovePx));

  const rotateSpeed = num(pointerSrc.rotateSpeed, dPointer.rotateSpeed);
  const rotateSpeedFast = num(pointerSrc.rotateSpeedFast, dPointer.rotateSpeedFast);

  // orbit damping (0..1). Accept both 0..1 and 1..100(%) inputs.
  let dampingFactor = num(pointerSrc.dampingFactor, dPointer.dampingFactor);
  if (dampingFactor > 1) {
    if (dampingFactor <= 100) dampingFactor = dampingFactor / 100;
    else dampingFactor = dPointer.dampingFactor;
  }
  dampingFactor = Math.min(0.95, Math.max(0, dampingFactor));

  const panSpeed = num(pointerSrc.panSpeed, dPointer.panSpeed);
  const panSpeedFast = num(pointerSrc.panSpeedFast, dPointer.panSpeedFast);
  const panFactor = num(pointerSrc.panFactor, dPointer.panFactor);

  const wheelZoomSpeed = num(pointerSrc.wheelZoomSpeed, dPointer.wheelZoomSpeed);
  const wheelZoomSpeedFast = num(pointerSrc.wheelZoomSpeedFast, dPointer.wheelZoomSpeedFast);

  const pointer = {
    minDragPx,
    clickMovePx,
    rotateSpeed,
    rotateSpeedFast,
    dampingFactor,
    panSpeed,
    panSpeedFast,
    panFactor,
    wheelZoomSpeed,
    wheelZoomSpeedFast,
  };

  // --- keyboard ---
  const keyboard = {
    orbitStep: num(keyboardSrc.orbitStep, dKeyboard.orbitStep),
    orbitStepFast: num(keyboardSrc.orbitStepFast, dKeyboard.orbitStepFast),
    panFactor: num(keyboardSrc.panFactor, dKeyboard.panFactor),
    zoomStep: num(keyboardSrc.zoomStep, dKeyboard.zoomStep),
  };

  return { pointer, keyboard };
}

function normalizeMode(v) {
  return v === "macro" || v === "meso" || v === "micro" ? v : "macro";
}

function normalizeSelection(selInit) {
  if (!selInit || typeof selInit !== "object") return { uuid: null, kind: null };
  const uuid = typeof selInit.uuid === "string" && selInit.uuid ? selInit.uuid : null;
  const kind =
    selInit.kind === "lines" || selInit.kind === "points" || selInit.kind === "aux"
      ? selInit.kind
      : null;
  if (!uuid) return { uuid: null, kind: null };
  return { uuid, kind }; // kind は後で structIndex で確定させる（Phase2）
}

export function createUiState(initial = {}) {
  // --- viewerSettings 初期化（microFX + render/camera まで含める） ---
  const initialViewerSettings =
    initial.viewerSettings && typeof initial.viewerSettings === "object"
      ? initial.viewerSettings
      : {};

  const initialRender =
    initialViewerSettings.render &&
    typeof initialViewerSettings.render === "object"
      ? initialViewerSettings.render
      : {};

  const initialCameraSettings =
    initialViewerSettings.camera &&
    typeof initialViewerSettings.camera === "object"
      ? initialViewerSettings.camera
      : {};

  const initialFx =
    initialViewerSettings.fx && typeof initialViewerSettings.fx === "object"
      ? initialViewerSettings.fx
      : {};

  const initialMicro =
    initialFx.micro && typeof initialFx.micro === "object"
      ? initialFx.micro
      : {};

  // input preset (SSOT)
  const inputPresetRaw =
    typeof initialViewerSettings.inputPreset === 'string' ? initialViewerSettings.inputPreset : null;
  const resolvedInput = resolveInputDefaults(inputPresetRaw);

  const viewerSettings = {
    // もともとの任意項目は生かしたまま上書きしていく
    ...initialViewerSettings,

    // 情報パネルの基本モード（5.2）
    infoDisplay: normalizeInfoDisplay(initialViewerSettings.infoDisplay),

    // 描画まわり（lineWidthMode など）
    render: {
      ...initialRender,
      lineWidthMode: normalizeLineWidthMode(initialRender.lineWidthMode), // "auto" | "fixed" | "adaptive"
      minLineWidth: Math.max(0, num(initialRender.minLineWidth, 1.0)),
      fixedLineWidth: Math.max(0, num(initialRender.fixedLineWidth, 2.0)),
      shadow: {
        ...(initialRender.shadow || {}),
        enabled: bool(initialRender.shadow?.enabled, false),
        intensityScale: Math.max(0, num(initialRender.shadow?.intensityScale, 1.0)),
      },
    },

    // カメラ設定（5.2）
    camera: {
      ...initialCameraSettings,
      fov: clampFov(initialCameraSettings.fov ?? initial.cameraState?.fov, 50),
      // near を一回だけ正規化して使い回す
      // （far >= near + eps を保証）
      // eslint-disable-next-line no-shadow
      ...( (() => {
        const near = Math.max(1e-6, num(initialCameraSettings.near, 0.1));
        const far  = Math.max(near + 1e-3, num(initialCameraSettings.far, 1000));
        return { near, far };
      })() ),
      keyboardStepYaw: num(initialCameraSettings.keyboardStepYaw, 0.1),
      keyboardStepPitch: num(initialCameraSettings.keyboardStepPitch, 0.1),
      panStep: num(initialCameraSettings.panStep, 0.25),
      zoomStep: num(initialCameraSettings.zoomStep, 0.2),
    },

    // 入力設定（UI はここから読む）
    inputPreset: resolvedInput.name,
    input: normalizeInputSettings(initialViewerSettings.input, resolvedInput),

    // エフェクト系（既存の microFX 初期化を 5.2 の fx.micro に寄せる）
    fx: {
      ...initialFx,
      micro: {
        ...initialMicro,
        // microFX 全体の ON/OFF フラグ（デフォルト true）
        enabled: bool(initialMicro.enabled, true),
        profile: normalizeMicroProfile(initialMicro.profile),
        radius: {
          ...(initialMicro.radius || {}),
          inner_ratio: Math.max(0, num(initialMicro.radius?.inner_ratio, 0.1)),
          outer_ratio: Math.max(0, num(initialMicro.radius?.outer_ratio, 0.4)),
        },
        fade: {
          ...(initialMicro.fade || {}),
          min_opacity: Math.max(0, num(initialMicro.fade?.min_opacity, 0.05)),
          hop_boost: Math.max(0, num(initialMicro.fade?.hop_boost, 0.6)),
          far_factor: Math.max(0, num(initialMicro.fade?.far_factor, 0.2)),
        },
      },

      // 将来用フラグ（v1 では基本 false スタート）
      meso: bool(initialFx.meso, false),
      modeTransitions: bool(initialFx.modeTransitions, false),
      depthOfField: bool(initialFx.depthOfField, false),
      glow: bool(initialFx.glow, false),
      flow: bool(initialFx.flow, false),
    },
  };

  // --- selection 初期化（正準形） ---
  const selection = normalizeSelection(initial.selection);
  const baseFrame = normalizeFrame(initial.frame);
  const playback = normalizePlayback(initial.frame?.playback);
  const frame = { ...baseFrame, playback };

  const state = {
    frame,
    // frame 再生UIが uiState を見るなら、最初から形を固定
    // （もしくは controller 内部状態に逃がす）
    // playback: { fps, accumulator } を uiState に置く設計ならここで作る
    // 例:
    // frame: { ...frame, playback: { fps: 6, accumulator: 0 } },
    selection, // 常に {uuid,kind}
    cameraState: {
    theta: num(initial.cameraState?.theta, 0),
    phi: num(initial.cameraState?.phi, 1),
    distance: num(initial.cameraState?.distance, 10),
      target: {
        x: num(initial.cameraState?.target?.x, 0),
        y: num(initial.cameraState?.target?.y, 0),
        z: num(initial.cameraState?.target?.z, 0),
      },
      // A案：viewerSettings.camera.fov が正
      fov: clampFov(viewerSettings.camera?.fov, 50),
    },
    view_preset_index: normalizeViewPresetIndex(initial.view_preset_index),
    mode: normalizeMode(initial.mode),

    // runtime-only（UIは参照するが、保存対象ではない）
    runtime: {
      isFramePlaying: bool(initial.runtime?.isFramePlaying, false),
      isCameraAuto: bool(initial.runtime?.isCameraAuto, false),
    },

    // filters は “types” を正準にして、常に存在させる
    // - 旧互換: filters.points / filters.lines / filters.aux も受け取り、types へ寄せる
    // - 旧互換: UI が root を参照しても壊れないよう mirror も保持する
    filters: (() => {
      const root = (initial.filters && typeof initial.filters === "object") ? initial.filters : {};
      const types = (root.types && typeof root.types === "object") ? root.types : {};

      const points =
        typeof types.points === "boolean"
          ? types.points
          : (typeof root.points === "boolean" ? root.points : true);

      const lines =
        typeof types.lines === "boolean"
          ? types.lines
          : (typeof root.lines === "boolean" ? root.lines : true);

      const aux =
        typeof types.aux === "boolean"
          ? types.aux
          : (typeof root.aux === "boolean" ? root.aux : true);

      const auxModules = (root.auxModules && typeof root.auxModules === "object") ? root.auxModules : {};
      return {
        types: { points, lines, aux },
        points,
        lines,
        aux,
        auxModules: {
          grid: typeof auxModules.grid === "boolean" ? auxModules.grid : false,
          axis: typeof auxModules.axis === "boolean" ? auxModules.axis : false,
        },
      };
    })(),

    // ここに正準 viewerSettings を載せる
    viewerSettings,

    // 方針: derived は recomputeVisibleSet のみ。uiState では基本 null 固定が安全。
    visibleSet: null,
    microState: null,
  };

  return state;
}
