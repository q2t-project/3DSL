// viewer/runtime/core/microController.js

// 3DSS ノード共通ヘルパ
function getNodeUuid(node) {
  if (!node) return null;
  if (node.meta && typeof node.meta.uuid === "string") return node.meta.uuid;
  if (typeof node.uuid === "string") return node.uuid;
  return null;
}

function getNodePosition(node) {
  if (!node) return null;

  let pos = null;

  if (Array.isArray(node?.appearance?.position) && node.appearance.position.length === 3) {
    pos = node.appearance.position;
  } else if (Array.isArray(node?.position) && node.position.length === 3) {
    pos = node.position;
  }

  if (!pos) return null;

  const x = Number(pos[0]);
  const y = Number(pos[1]);
  const z = Number(pos[2]);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return [x, y, z];
}

function findNodeByUuid(array, uuid) {
  if (!Array.isArray(array)) return null;
  for (const n of array) {
    if (getNodeUuid(n) === uuid) return n || null;
  }
  return null;
}

function computePointFocus(document3dss, uuid) {
  const node = findNodeByUuid(document3dss?.points, uuid);
  if (!node) return null;
  return getNodePosition(node);
}

function computeAuxFocus(document3dss, uuid) {
  const node = findNodeByUuid(document3dss?.aux, uuid);
  if (!node) return null;
  return getNodePosition(node);
}

function computeLineFocus(document3dss, uuid) {
  const line = findNodeByUuid(document3dss?.lines, uuid);
  if (!line) return null;

  const refA = line?.appearance?.end_a?.ref;
  const refB = line?.appearance?.end_b?.ref;

  let posA = null;
  let posB = null;

  if (typeof refA === "string") {
    posA = computePointFocus(document3dss, refA);
  }
  if (typeof refB === "string") {
    posB = computePointFocus(document3dss, refB);
  }

  if (posA && posB) {
    return [
      (posA[0] + posB[0]) / 2,
      (posA[1] + posB[1]) / 2,
      (posA[2] + posB[2]) / 2,
    ];
  }

  // fallback: vertices の重心
  if (Array.isArray(line.vertices) && line.vertices.length > 0) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let count = 0;
    for (const v of line.vertices) {
      if (!Array.isArray(v) || v.length !== 3) continue;
      const x = Number(v[0]);
      const y = Number(v[1]);
      const z = Number(v[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      sx += x;
      sy += y;
      sz += z;
      count += 1;
    }
    if (count > 0) {
      return [sx / count, sy / count, sz / count];
    }
  }

  return null;
}

function computeFocusPosition(base, document3dss) {
  if (!base || !document3dss) return null;

  const uuid = base.focusUuid;
  const kind = base.kind;

  let pos = null;

  if (!kind || kind === "points") {
    pos = computePointFocus(document3dss, uuid);
    if (pos) return pos;
  }

  if (!kind || kind === "lines") {
    pos = computeLineFocus(document3dss, uuid);
    if (pos) return pos;
  }

  if (!kind || kind === "aux") {
    pos = computeAuxFocus(document3dss, uuid);
    if (pos) return pos;
  }

  return null;
}

// ------------------------------------------------------------
// microController 本体
// ------------------------------------------------------------
export function createMicroController(uiState, indices) {
  const uuidToKind =
    indices && indices.uuidToKind instanceof Map ? indices.uuidToKind : null;

  const state = {
    microState: uiState.microState ?? null,
  };

  function resolveKind(uuid, explicitKind) {
    if (
      explicitKind === "points" ||
      explicitKind === "lines" ||
      explicitKind === "aux"
    ) {
      return explicitKind;
    }

    if (!uuidToKind) return null;
    const k = uuidToKind.get(uuid);
    if (k === "points" || k === "lines" || k === "aux") return k;
    return null;
  }

  function buildBaseMicroState(selection) {
    if (!selection || !selection.uuid) return null;

    const kind = resolveKind(selection.uuid, selection.kind);

    return {
      focusUuid: selection.uuid,
      kind,
      focusPosition: null,
      relatedUuids: [],
      localBounds: null,
    };
  }

  function set(microState) {
    state.microState = microState;
    uiState.microState = microState;
    return microState;
  }

  function clear() {
    state.microState = null;
    uiState.microState = null;
    return null;
  }

  function get() {
    return state.microState;
  }

  // modeController から呼ばれる entry point
  function compute(selection, cameraState, document3dss, _indices) {
    const base = buildBaseMicroState(selection);
    if (!base) return null;

    const pos = computeFocusPosition(base, document3dss);
    if (!pos || pos.length !== 3) return null;

    const microState = { ...base, focusPosition: pos };
    return set(microState);
  }

  const controller = {
    compute,
    clear,
    get,
  };

  // 旧 API: controller.microState で直接アクセス
  Object.defineProperty(controller, "microState", {
    get() {
      return state.microState;
    },
    set(v) {
      set(v);
    },
    enumerable: false,
    configurable: true,
  });

  return controller;
}
