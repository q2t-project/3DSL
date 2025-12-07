// viewer/runtime/core/uiState.js

// ビュー・プリセット index 正規化（0〜6 に丸める）
function normalizeViewPresetIndex(v) {
  const N = 7;
  if (v == null) return 0; // デフォルトは 0 = 西

  let i = Number(v);
  if (!Number.isFinite(i)) return 0;
  i = Math.floor(i);

  if (i < 0) {
    return ((i % N) + N) % N; // 負数にも対応した mod
  }
  return i % N;
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

  const viewerSettings = {
    // もともとの任意項目は生かしたまま上書きしていく
    ...initialViewerSettings,

    // 情報パネルの基本モード（5.2）
    infoDisplay: initialViewerSettings.infoDisplay ?? "select",

    // 描画まわり（lineWidthMode など）
    render: {
      ...initialRender,
      lineWidthMode: initialRender.lineWidthMode ?? "auto", // "auto" | "fixed" | "adaptive"
      minLineWidth: initialRender.minLineWidth ?? 1.0,      // px
      fixedLineWidth: initialRender.fixedLineWidth ?? 2.0,  // px
      shadow: {
        ...(initialRender.shadow || {}),
        enabled: initialRender.shadow?.enabled ?? false,
        intensityScale: initialRender.shadow?.intensityScale ?? 1.0,
      },
    },

    // カメラ設定（5.2）
    camera: {
      ...initialCameraSettings,
      fov:
        initialCameraSettings.fov ??
        initial.cameraState?.fov ??
        50,
      near: initialCameraSettings.near ?? 0.1,
      far: initialCameraSettings.far ?? 1000,
      // キーボード操作ステップ（ざっくりデフォルト値。仕様に合わせて後で微調整可）
      keyboardStepYaw: initialCameraSettings.keyboardStepYaw ?? 0.1,   // rad
      keyboardStepPitch: initialCameraSettings.keyboardStepPitch ?? 0.1, // rad
      panStep: initialCameraSettings.panStep ?? 0.25,
      zoomStep: initialCameraSettings.zoomStep ?? 0.2,
    },

    // エフェクト系（既存の microFX 初期化を 5.2 の fx.micro に寄せる）
    fx: {
      ...initialFx,
      micro: {
        ...initialMicro,
        // microFX 全体の ON/OFF フラグ（デフォルト true）
        enabled:
          initialMicro.enabled !== undefined ? !!initialMicro.enabled : true,
        profile: initialMicro.profile ?? "normal", // "weak" | "normal" | "strong"
        radius: {
          ...(initialMicro.radius || {}),
          inner_ratio: initialMicro.radius?.inner_ratio ?? 0.1,
          outer_ratio: initialMicro.radius?.outer_ratio ?? 0.4,
        },
        fade: {
          ...(initialMicro.fade || {}),
          min_opacity: initialMicro.fade?.min_opacity ?? 0.05,
          hop_boost: initialMicro.fade?.hop_boost ?? 0.6,
          far_factor: initialMicro.fade?.far_factor ?? 0.2,
        },
      },

      // 将来用フラグ（v1 では基本 false スタート）
      meso: initialFx.meso !== undefined ? !!initialFx.meso : false,
      modeTransitions:
        initialFx.modeTransitions !== undefined
          ? !!initialFx.modeTransitions
          : false,
      depthOfField:
        initialFx.depthOfField !== undefined
          ? !!initialFx.depthOfField
          : false,
      glow: initialFx.glow !== undefined ? !!initialFx.glow : false,
      flow: initialFx.flow !== undefined ? !!initialFx.flow : false,
    },
  };

  // --- selection 初期化（以下、既存ロジックはそのまま） ---
  let selection = null;
  const selInit = initial.selection;
  if (selInit && typeof selInit === "object") {
    selection = {
      uuid: selInit.uuid ?? null,
      kind:
        selInit.kind === "lines" ||
        selInit.kind === "points" ||
        selInit.kind === "aux"
          ? selInit.kind
          : null,
    };
  }

  const state = {
    frame: {
      current: initial.frame?.current ?? 0,
      range: {
        min: initial.frame?.range?.min ?? 0,
        max: initial.frame?.range?.max ?? 0,
      },
    },
    selection,
    cameraState: {
      theta: initial.cameraState?.theta ?? 0,
      phi: initial.cameraState?.phi ?? 0,
      distance: initial.cameraState?.distance ?? 10,
      target: {
        x: initial.cameraState?.target?.x ?? 0,
        y: initial.cameraState?.target?.y ?? 0,
        z: initial.cameraState?.target?.z ?? 0,
      },
      fov: initial.cameraState?.fov ?? 50,
    },
    view_preset_index: normalizeViewPresetIndex(initial.view_preset_index),
    mode: initial.mode ?? "macro",
    filters: {
      lines: initial.filters?.lines ?? true,
      points: initial.filters?.points ?? true,
      aux: initial.filters?.aux ?? true,
    },
    runtime: {
      isFramePlaying: initial.runtime?.isFramePlaying ?? false,
      isCameraAuto: initial.runtime?.isCameraAuto ?? false,
    },
    microState: initial.microState ?? null,

    // ここに正準 viewerSettings を載せる
    viewerSettings,

    visibleSet:
      initial.visibleSet === undefined ? null : initial.visibleSet,
  };

  return state;
}
