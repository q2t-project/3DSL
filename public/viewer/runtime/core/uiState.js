// viewer/runtime/core/uiState.js

const VIEW_PRESET_COUNT = 7;
const DEFAULT_VIEW_PRESET_INDEX = 3; // iso_ne（方針がこれならここも合わせる）

// ビュー・プリセット index 正規化（0〜6 に丸める）
function normalizeViewPresetIndex(v) {
  if (v == null) return DEFAULT_VIEW_PRESET_INDEX;

  let i = Number(v);
  if (!Number.isFinite(i)) return DEFAULT_VIEW_PRESET_INDEX;
  i = Math.floor(i);

  if (i < 0) {
    return ((i % VIEW_PRESET_COUNT) + VIEW_PRESET_COUNT) % VIEW_PRESET_COUNT; // 負数にも対応した mod
  }
  return i % VIEW_PRESET_COUNT;
}

function num(v, fallback) {
  if (v == null) return fallback; // ★ null/undefined は fallback
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function int(v, fallback) {
  if (v == null) return fallback; // ★ null/undefined は fallback
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function bool(v, fallback) {
  return typeof v === "boolean" ? v : fallback;
}

function clampFov(v, fallback = 50) {
  if (v == null) return fallback; // ★ null/undefined は fallback
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

function normalizeInfoDisplay(v) {
  // enum は仕様に合わせて調整
  return v === "select" || v === "hover" || v === "off" ? v : "select";
}

function normalizeMicroProfile(v) {
  return v === "weak" || v === "normal" || v === "strong" ? v : "normal";
}

function normalizeMode(v) {
  return v === "macro" || v === "meso" || v === "micro" ? v : "macro";
}

// 注意：
// - recomputeVisibleSet は ./normalizeSelection.js を使う
// - ここは「初期値の形を整えるだけ」専用（同名を避ける）
function normalizeSelectionInit(selInit) {
  if (!selInit || typeof selInit !== "object") return { uuid: null, kind: null };
  const uuid = typeof selInit.uuid === "string" && selInit.uuid ? selInit.uuid : null;
  const kind =
    selInit.kind === "lines" || selInit.kind === "points" || selInit.kind === "aux"
      ? selInit.kind
      : null;
  if (!uuid) return { uuid: null, kind: null };
  return { uuid, kind }; // kind は後で structIndex で確定させる（Phase2）
}

function asObject(v) {
  return v && typeof v === "object" ? v : {};
}

export function createUiState(initial = {}) {
  // 参照元を先に固定（?. の連打を減らす）
  const initialCameraState = asObject(initial.cameraState);
  const initialRuntime = asObject(initial.runtime);
  const initialFilters = asObject(initial.filters);
  const initialFrame = asObject(initial.frame);

  // --- viewerSettings 初期化（microFX + render/camera まで含める） ---
  const initialViewerSettings = asObject(initial.viewerSettings);

  const initialRender = asObject(initialViewerSettings.render);

  const initialCameraSettings = asObject(initialViewerSettings.camera);

  const initialFx = asObject(initialViewerSettings.fx);

  const initialMicro = asObject(initialFx.micro);

  // --- micro settings を先に作って legacy key を掃除 ---
  const rawMicroProfile =
    initialMicro.profile ??
    initialMicro.microFXProfile ??
    initialMicro.microFxProfile ??
    initialMicro.micro_fx_profile ??
    initialFx.microFXProfile ??
    initialFx.microFxProfile ??
    initialFx.micro_fx_profile ??           // ← 追加
    initialViewerSettings.microFXProfile ??
    initialViewerSettings.microFxProfile ??
    initialViewerSettings.micro_fx_profile ?? // ← 追加
    null;

  // legacy keys を分離して残さへん（delete 連打をやめる）
  // eslint-disable-next-line no-unused-vars
  const {
    microFXProfile: _m1,
    microFxProfile: _m2,
    micro_fx_profile: _m3,
    ...microRest
  } = initialMicro;

  const microSettings = {
    ...microRest,
    enabled: bool(microRest.enabled, true),
    profile: normalizeMicroProfile(rawMicroProfile),
    radius: {
      ...(microRest.radius || {}),
      inner_ratio: Math.max(0, num(microRest.radius?.inner_ratio, 0.1)),
      outer_ratio: Math.max(0, num(microRest.radius?.outer_ratio, 0.4)),
     },
    fade: {
      ...(microRest.fade || {}),
      min_opacity: Math.max(0, num(microRest.fade?.min_opacity, 0.05)),
      hop_boost: Math.max(0, num(microRest.fade?.hop_boost, 0.6)),
      far_factor: Math.max(0, num(microRest.fade?.far_factor, 0.2)),
    },
  };
  // eslint-disable-next-line no-unused-vars
  const { microFXProfile: _fx1, microFxProfile: _fx2, micro_fx_profile: _fx3, ...fxRest } = initialFx;

  const fxSettings = {
    ...fxRest,
    micro: microSettings,
    meso: bool(initialFx.meso, false),
    modeTransitions: bool(initialFx.modeTransitions, false),
    depthOfField: bool(initialFx.depthOfField, false),
    glow: bool(initialFx.glow, false),
    flow: bool(initialFx.flow, false),
  };

  // --- render settings を先に作って legacy key を掃除 ---
  const renderSettings = {
    ...initialRender,
    minLineWidth: Math.max(0, num(initialRender.minLineWidth, 1.0)),
    fixedLineWidth: Math.max(0, num(initialRender.fixedLineWidth, 2.0)),
    shadow: {
      ...(initialRender.shadow || {}),
      enabled: bool(initialRender.shadow?.enabled, false),
      intensityScale: Math.max(0, num(initialRender.shadow?.intensityScale, 1.0)),
    },
  };

  // eslint-disable-next-line no-unused-vars
  const {
    micro_fx_profile: _vs1, microFXProfile: _vs2, microFxProfile: _vs3,
    ...viewerSettingsRest
  } = initialViewerSettings;

  const viewerSettings = {
    // もともとの任意項目は生かしたまま上書きしていく
    ...viewerSettingsRest,

    // 情報パネルの基本モード（5.2）
    infoDisplay: normalizeInfoDisplay(initialViewerSettings.infoDisplay),

    // 描画まわり
    render: renderSettings,

    // カメラ設定（5.2）
    camera: {
      ...initialCameraSettings,
      fov: clampFov(initialCameraSettings.fov ?? initialCameraState.fov, 50),      // near を一回だけ正規化して使い回す
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

    // エフェクト系（既存の microFX 初期化を 5.2 の fx.micro に寄せる）
    fx: fxSettings,
  };

  // --- selection 初期化（正準形） ---
  const selection = normalizeSelectionInit(initial.selection);
  const baseFrame = normalizeFrame(initialFrame);
  const playback = normalizePlayback(initialFrame.playback);
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
      // ★ 未指定は null にして、cameraEngine 側の metrics デフォルトを殺さない
      theta: num(initialCameraState.theta, null),
      phi: num(initialCameraState.phi, null),
      distance: num(initialCameraState.distance, null),
      target: {
        x: num(initialCameraState.target?.x, null),
        y: num(initialCameraState.target?.y, null),
        z: num(initialCameraState.target?.z, null),
      },
      // A案：viewerSettings.camera.fov が正
      fov: viewerSettings.camera?.fov ?? 50,
    },
    view_preset_index: normalizeViewPresetIndex(initial.view_preset_index),
    mode: normalizeMode(initial.mode),

    // runtime-only（UIは参照するが、保存対象ではない）
    runtime: {
      isFramePlaying: bool(initialRuntime.isFramePlaying, false),
      isCameraAuto: bool(initialRuntime.isCameraAuto, false),
    },

    // filters は “types” を正準にして、常に存在させる
    filters: {
      types: {
        // ★ legacy: filters.points / filters.lines / filters.aux も拾う
        points: bool(initialFilters.types?.points ?? initialFilters.points, true),
        lines:  bool(initialFilters.types?.lines  ?? initialFilters.lines,  true),
        aux:    bool(initialFilters.types?.aux    ?? initialFilters.aux,    true),
      },
      auxModules: {
        grid: bool(initialFilters.auxModules?.grid, false),
        axis: bool(initialFilters.auxModules?.axis, false),
      },
    },

    // ここに正準 viewerSettings を載せる
    viewerSettings,



    // 方針: derived は recomputeVisibleSet のみ。uiState では基本 null 固定が安全。
    visibleSet: null,
    microState: null,
  };

  return state;
}
