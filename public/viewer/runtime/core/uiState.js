// runtime/core/uiState.js

// ui_state の正準構造を 5.2 に合わせて初期化するヘルパ
// initial は bootstrapViewer 側から渡される初期値（カメラ・frame・runtime 等）

export function createUiState(initial = {}) {
  const selInit   = initial.selection || {};
  const hoverInit = initial.hover || {};

  // ------------------------------
  // frame / frameRange
  // ------------------------------
  const frameInit      = initial.frame || {};
  const frameRangeInit =
    initial.frameRange ||
    frameInit.range ||
    null;

  let activeFrame = null;
  if (typeof frameInit.current === "number") {
    activeFrame = frameInit.current;
  } else if (frameRangeInit && typeof frameRangeInit.min === "number") {
    activeFrame = frameRangeInit.min;
  }

  // ------------------------------
  // filters（types / auxModules）
  // ------------------------------
  const filtersInit = initial.filters || {};
  // 旧形式 { points,lines,aux } も受けつつ、新形式 types.* を優先
  const typesInit = filtersInit.types || filtersInit;

  const filters = {
    types: {
      points:
        typeof typesInit.points === "boolean" ? typesInit.points : true,
      lines:
        typeof typesInit.lines === "boolean" ? typesInit.lines : true,
      aux:
        typeof typesInit.aux === "boolean" ? typesInit.aux : true,
    },
    auxModules: {
      grid:
        filtersInit.auxModules &&
        typeof filtersInit.auxModules.grid === "boolean"
          ? filtersInit.auxModules.grid
          : true,
      axis:
        filtersInit.auxModules &&
        typeof filtersInit.auxModules.axis === "boolean"
          ? filtersInit.auxModules.axis
          : true,
      plate:
        filtersInit.auxModules &&
        typeof filtersInit.auxModules.plate === "boolean"
          ? filtersInit.auxModules.plate
          : true,
      shell:
        filtersInit.auxModules &&
        typeof filtersInit.auxModules.shell === "boolean"
          ? filtersInit.auxModules.shell
          : true,
      hud:
        filtersInit.auxModules &&
        typeof filtersInit.auxModules.hud === "boolean"
          ? filtersInit.auxModules.hud
          : true,
      extension:
        filtersInit.auxModules &&
        typeof filtersInit.auxModules.extension === "boolean"
          ? filtersInit.auxModules.extension
          : true,
    },
  };

  // visibleSet は visibilityController で上書きされる派生値
  const visibleSetInit = initial.visibleSet || {};
  const visibleSet = {
    points: Array.isArray(visibleSetInit.points)
      ? visibleSetInit.points.slice()
      : [],
    lines: Array.isArray(visibleSetInit.lines)
      ? visibleSetInit.lines.slice()
      : [],
    aux: Array.isArray(visibleSetInit.aux)
      ? visibleSetInit.aux.slice()
      : [],
  };

  // ------------------------------
  // camera / cameraState
  // ------------------------------
  const camStateInit = initial.cameraState || {};
  const targetInit   = camStateInit.target || {};

  const camera = {
    position: [0, 0, 0], // 実位置は renderer 側で決定しても OK
    target: [
      typeof targetInit.x === "number" ? targetInit.x : 0,
      typeof targetInit.y === "number" ? targetInit.y : 0,
      typeof targetInit.z === "number" ? targetInit.z : 0,
    ],
    zoom: 1,
    fov:
      typeof camStateInit.fov === "number" ? camStateInit.fov : 50,
    spherical: {
      theta:
        typeof camStateInit.theta === "number"
          ? camStateInit.theta
          : 0,
      phi:
        typeof camStateInit.phi === "number"
          ? camStateInit.phi
          : Math.PI / 2,
      radius:
        typeof camStateInit.distance === "number"
          ? camStateInit.distance
          : 4,
    },
  };

  // ------------------------------
  // mode / microFocus
  // ------------------------------
  const modeInit = initial.mode || "macro";

  const microFocusInit = initial.microFocus || {};
  const microFocus = {
    uuid: microFocusInit.uuid ?? null,
    kind: microFocusInit.kind ?? null,
  };

  // ------------------------------
  // microState（初期値のみ。以降は microController が更新）
  // ------------------------------
  const microStateInit = initial.microState || {};
  const microState = {
    focusUuid: microStateInit.focusUuid ?? null,
    kind: microStateInit.kind ?? null,
    focusPosition:
      Array.isArray(microStateInit.focusPosition) ||
      microStateInit.focusPosition === null
        ? microStateInit.focusPosition
        : null,
    relatedUuids: Array.isArray(microStateInit.relatedUuids)
      ? microStateInit.relatedUuids.slice()
      : [],
    localBounds:
      microStateInit.localBounds && typeof microStateInit.localBounds === "object"
        ? microStateInit.localBounds
        : null,
  };

  // ------------------------------
  // runtime / panels
  // ------------------------------
  const runtimeInit = initial.runtime || {};
  const runtime = {
    isFramePlaying: !!runtimeInit.isFramePlaying,
    isCameraAuto: !!runtimeInit.isCameraAuto,
  };

  const panelsInit = initial.panels || {};
  const panels = {
    infoOpen:
      typeof panelsInit.infoOpen === "boolean"
        ? panelsInit.infoOpen
        : true,
    controlOpen:
      typeof panelsInit.controlOpen === "boolean"
        ? panelsInit.controlOpen
        : true,
  };

  // ------------------------------
  // viewerSettings（5.2 準拠）
  // ------------------------------
  const vsInit      = initial.viewerSettings || {};
  const vsRender    = vsInit.render || {};
  const vsCamera    = vsInit.camera || {};
  const vsFx        = vsInit.fx || {};
  const vsFxMicro   = vsFx.micro || {};
  const vsFxMicroR  = vsFxMicro.radius || {};
  const vsFxMicroF  = vsFxMicro.fade || {};

  const viewerSettings = {
    // 情報パネルの基本モード
    infoDisplay:
      vsInit.infoDisplay === "hover" ||
      vsInit.infoDisplay === "off" ||
      vsInit.infoDisplay === "select"
        ? vsInit.infoDisplay
        : "select",

    render: {
      lineWidthMode:
        vsRender.lineWidthMode === "fixed" ||
        vsRender.lineWidthMode === "adaptive" ||
        vsRender.lineWidthMode === "auto"
          ? vsRender.lineWidthMode
          : "auto",
      minLineWidth:
        typeof vsRender.minLineWidth === "number"
          ? vsRender.minLineWidth
          : 1,
      fixedLineWidth:
        typeof vsRender.fixedLineWidth === "number"
          ? vsRender.fixedLineWidth
          : 2,
      shadow: {
        enabled:
          vsRender.shadow && typeof vsRender.shadow.enabled === "boolean"
            ? vsRender.shadow.enabled
            : false,
        intensityScale:
          vsRender.shadow &&
          typeof vsRender.shadow.intensityScale === "number"
            ? vsRender.shadow.intensityScale
            : 1.0,
      },
    },

    camera: {
      fov:
        typeof vsCamera.fov === "number"
          ? vsCamera.fov
          : (typeof camStateInit.fov === "number"
              ? camStateInit.fov
              : 50),
      near:
        typeof vsCamera.near === "number"
          ? vsCamera.near
          : 0.1,
      far:
        typeof vsCamera.far === "number"
          ? vsCamera.far
          : 10000,
      keyboardStepYaw:
        typeof vsCamera.keyboardStepYaw === "number"
          ? vsCamera.keyboardStepYaw
          : Math.PI / 90, // ≒2deg
      keyboardStepPitch:
        typeof vsCamera.keyboardStepPitch === "number"
          ? vsCamera.keyboardStepPitch
          : Math.PI / 90,
      panStep:
        typeof vsCamera.panStep === "number"
          ? vsCamera.panStep
          : 1,
      zoomStep:
        typeof vsCamera.zoomStep === "number"
          ? vsCamera.zoomStep
          : 0.1,
    },

    fx: {
      micro: {
        enabled:
          typeof vsFxMicro.enabled === "boolean"
            ? vsFxMicro.enabled
            : true,
        profile:
          vsFxMicro.profile === "weak" ||
          vsFxMicro.profile === "strong" ||
          vsFxMicro.profile === "normal"
            ? vsFxMicro.profile
            : "normal",
        radius: {
          inner_ratio:
            typeof vsFxMicroR.inner_ratio === "number"
              ? vsFxMicroR.inner_ratio
              : 0.1,
          outer_ratio:
            typeof vsFxMicroR.outer_ratio === "number"
              ? vsFxMicroR.outer_ratio
              : 0.4,
        },
        fade: {
          min_opacity:
            typeof vsFxMicroF.min_opacity === "number"
              ? vsFxMicroF.min_opacity
              : 0.05,
          hop_boost:
            typeof vsFxMicroF.hop_boost === "number"
              ? vsFxMicroF.hop_boost
              : 0.6,
          far_factor:
            typeof vsFxMicroF.far_factor === "number"
              ? vsFxMicroF.far_factor
              : 0.2,
        },
      },
        meso: false,
        modeTransitions: true,
        depthOfField: false,
        glow: true,
        flow: false,
        ...(initial.viewerSettings && initial.viewerSettings.fx),
    },
  };

  // ------------------------------
  // ui_state 本体構築
  // ------------------------------
  const ui = {
    // selection / hover
    selection: {
      uuid: selInit.uuid ?? null,
      kind: selInit.kind ?? null,
    },
    hover: {
      uuid: hoverInit.uuid ?? null,
      kind: hoverInit.kind ?? null,
    },

    // frame
    activeFrame:
      typeof activeFrame === "number" ? activeFrame : null,
    frameRange: frameRangeInit,

    // filters / visibleSet
    filters,
    visibleSet,

    // camera / mode / micro*
    camera,
    mode: modeInit,
    microFocus,
    microState,

    // runtime / panels / settings
    runtime,
    panels,
    viewerSettings,

    // --------------------------------------------------
    // 互換フィールド（既存コード用）
    // --------------------------------------------------

    // 旧 frame ブロック（frameController 等から参照されている可能性あり）
    frame: {
      current:
        typeof activeFrame === "number"
          ? activeFrame
          : frameRangeInit && typeof frameRangeInit.min === "number"
          ? frameRangeInit.min
          : 0,
      range: frameRangeInit || { min: 0, max: 0 },
    },

    // CameraEngine 初期化用の「生 cameraState」
    cameraState: camStateInit,

    // view preset 巡回用 index（KeyboardInput 用）
    view_preset_index:
      typeof initial.view_preset_index === "number"
        ? initial.view_preset_index
        : 0,
  };

  return ui;
}
