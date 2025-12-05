// viewer/runtime/core/uiState.js
// UI 全体の状態コンテナ（唯一のソース・オブ・トゥルース）

export function createUiState(initial = {}) {
  // --- viewerSettings 初期化（microFX まわりのデフォルト込み） ---
  const initialViewerSettings =
    initial.viewerSettings && typeof initial.viewerSettings === "object"
      ? initial.viewerSettings
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
    ...initialViewerSettings,
    fx: {
      ...initialFx,
      micro: {
        ...initialMicro,
        // microFX 全体の ON/OFF フラグ（デフォルト true）
        enabled:
          initialMicro.enabled !== undefined ? !!initialMicro.enabled : true,
        profile: initialMicro.profile ?? "normal",
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

  // --- selection 初期化（null/undefined も安全に扱う） ---
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

  // --- スケルトン準拠の正規フィールド ----------------------
  const state = {
    // 再生フレーム情報
    frame: {
      current: initial.frame?.current ?? 0,
      range: {
        min: initial.frame?.range?.min ?? 0,
        max: initial.frame?.range?.max ?? 0,
      },
    },

    // 選択状態（詳細は selectionController が管理）
    // selection: null | { uuid, kind? }
    selection,

    // カメラ状態（初期値 & スナップショット用途）
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

    // 表示モード（"macro" / "micro" / …）
    mode: initial.mode ?? "macro",

    // 種別フィルタ（lines / points / aux の ON/OFF）
    filters: {
      lines: initial.filters?.lines ?? true,
      points: initial.filters?.points ?? true,
      aux: initial.filters?.aux ?? true,
    },

    // 再生・自動カメラなどランタイムフラグ
    runtime: {
      isFramePlaying: initial.runtime?.isFramePlaying ?? false,
      isCameraAuto: initial.runtime?.isCameraAuto ?? false,
    },

    // microFX まわりの状態（renderer 側と契約）
    microState: initial.microState ?? null,

    // ユーザ設定（未定義項目はどんどんここにぶら下げる）
    viewerSettings,

    // 現在可視な要素 UUID の集合（visibilityController が管理）
    // まだ「null = 全部表示」に依存してるので、ここでは null を維持
    // visibleSet:
    //   - null   ... フレームフィルタ無し（全部表示）
    //   - Set<>  ... 含まれている uuid だけ表示
    visibleSet:
      initial.visibleSet === undefined ? null : initial.visibleSet,
  };

  return state;
}
