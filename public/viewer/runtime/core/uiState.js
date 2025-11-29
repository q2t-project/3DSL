// viewer/runtime/core/uiState.js
// UI 全体の状態コンテナ（唯一のソース・オブ・トゥルース）

export function createUiState(initial = {}) {
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
    selection:
      initial.selection === undefined
        ? null
        : {
            uuid: initial.selection.uuid ?? null,
            kind:
              initial.selection.kind === "lines" ||
              initial.selection.kind === "points" ||
              initial.selection.kind === "aux"
                ? initial.selection.kind
                : null,
          },

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
    viewerSettings: initial.viewerSettings ?? {},

    // 現在可視な要素 UUID の集合（visibilityController が管理）
    // まだ「null = 全部表示」に依存してるので、ここでは null を維持
    // visibleSet:
    //   - null   ... フレームフィルタ無し（全部表示）
    //   - Set<>  ... 含まれている uuid だけ表示
    visibleSet:
      initial.visibleSet === undefined
        ? null
        : initial.visibleSet,
  };

  // ============================================================
  // 旧実装との互換 alias（既存コードを壊さんための一時レイヤ）
  // 呼び出し側から順次置き換えが終わったら消していく。
  // ============================================================

  // 旧: uiState.currentFrame -> 新: uiState.frame.current
  Object.defineProperty(state, "currentFrame", {
    get() {
      return state.selection?.uuid ?? null;
    },
    set(v) {
      if (typeof v === "number") state.frame.current = v;
    },
    enumerable: false,
    configurable: true,
  });

  // 旧: uiState.selectedUuid -> 新: uiState.selection.uuid
  Object.defineProperty(state, "selectedUuid", {
    get() {
      return state.selection.uuid;
    },
    set(v) {
      if (!v) {
        // falsy（null/undefined/空文字）は「未選択」に倒す
        state.selection = null;
        return;
      }
      if (!state.selection) {
        state.selection = { uuid: null, kind: null };
      }
      state.selection.uuid = v;
    },
    enumerable: false,
    configurable: true,
  });

  // 旧: uiState.selectionKind -> 新: uiState.selection.kind
  Object.defineProperty(state, "selectionKind", {
    get() {
      return state.selection?.kind ?? null;
    },
    set(v) {
      if (!v) {
        if (state.selection) state.selection.kind = null;
        return;
      }
      if (!state.selection) {
        state.selection = { uuid: null, kind: null };
      }
      state.selection.kind = v;
    },
    enumerable: false,
    configurable: true,
  });

  // 旧: トップレベルに isFramePlaying があった場合
  Object.defineProperty(state, "isFramePlaying", {
    get() {
      return state.runtime.isFramePlaying;
    },
    set(v) {
      state.runtime.isFramePlaying = !!v;
    },
    enumerable: false,
    configurable: true,
  });

  // 旧: フィルタが showPoints / showLines / showAux だった場合
  Object.defineProperty(state, "showPoints", {
    get() {
      return state.filters.points;
    },
    set(v) {
      state.filters.points = !!v;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(state, "showLines", {
    get() {
      return state.filters.lines;
    },
    set(v) {
      state.filters.lines = !!v;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(state, "showAux", {
    get() {
      return state.filters.aux;
    },
    set(v) {
      state.filters.aux = !!v;
    },
    enumerable: false,
    configurable: true,
  });

  // 旧: カメラがトップレベル散在してた場合の保険
  Object.defineProperty(state, "cameraTheta", {
    get() {
      return state.cameraState.theta;
    },
    set(v) {
      if (typeof v === "number") state.cameraState.theta = v;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(state, "cameraPhi", {
    get() {
      return state.cameraState.phi;
    },
    set(v) {
      if (typeof v === "number") state.cameraState.phi = v;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(state, "cameraDistance", {
    get() {
      return state.cameraState.distance;
    },
    set(v) {
      if (typeof v === "number") state.cameraState.distance = v;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(state, "cameraTarget", {
    get() {
      return state.cameraState.target;
    },
    set(v) {
      if (!v || typeof v !== "object") return;
      if (typeof v.x === "number") state.cameraState.target.x = v.x;
      if (typeof v.y === "number") state.cameraState.target.y = v.y;
      if (typeof v.z === "number") state.cameraState.target.z = v.z;
    },
    enumerable: false,
    configurable: true,
  });

  return state;
}
