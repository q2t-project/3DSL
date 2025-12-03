// viewer/runtime/core/microController.js

// ------------------------------------------------------------
// microState の想定フォーマット
// ------------------------------------------------------------
//
// {
//   focusUuid: string,                     // フォーカス対象の UUID（microFX の「主役」）
//   kind: "points" | "lines" | "aux" | null,
//   focusPosition: [number, number, number], // marker / glow / axes のアンカーとなる world 座標
//   relatedUuids: string[],               // highlight 等で一緒に扱う 1-hop 近傍 UUID 群
//   localBounds: {                        // bounds 用のローカル AABB（world 単位）
//     center: [number, number, number],
//     size:   [number, number, number],
//   } | null,
// }
//
// microController は：
//   selection + cameraState + structIndex
// → microState を計算するだけの「変換レイヤ」。
// three.js のオブジェクトや UI とは直接関わらない。

// ------------------------------------------------------------
// 共通ヘルパ
// ------------------------------------------------------------

function sanitizeVec3(raw) {
  if (!Array.isArray(raw) || raw.length < 3) return null;

  const x = Number(raw[0]);
  const y = Number(raw[1]);
  const z = Number(raw[2]);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return [x, y, z];
}

// structIndex.uuidToItem から 3DSS ノード本体を取ってくる
function getItemByUuid(indices, uuid) {
  if (!indices) return null;
  const map = indices.uuidToItem;
  if (!(map instanceof Map)) return null;

  const rec = map.get(uuid);
  if (!rec || !rec.item) return null;
  return rec.item;
}

// 3DSS ノードから position を抜き出して Vec3 に正規化
function getNodePositionFromItem(node) {
  if (!node || typeof node !== "object") return null;

  // appearance.position 優先
  if (Array.isArray(node?.appearance?.position)) {
    const v = sanitizeVec3(node.appearance.position);
    if (v) return v;
  }

  // 古いフィールド用のフォールバック（あれば）
  if (Array.isArray(node.position)) {
    const v = sanitizeVec3(node.position);
    if (v) return v;
  }

  return null;
}

// line の end_a / end_b から 3D 座標を解決
// - end.ref があれば pointPosition / uuidToItem 経由で解決
// - end.coord があればそれをそのまま使う
function resolveEndpointPosition(end, indices) {
  if (!end || !indices) return null;

  // 参照（ref）優先
  const ref = typeof end.ref === "string" ? end.ref : null;
  if (ref) {
    const posMap = indices.pointPosition;
    if (posMap instanceof Map) {
      const p = posMap.get(ref);
      if (p) return p;
    }

    const pointItem = getItemByUuid(indices, ref);
    const pos = getNodePositionFromItem(pointItem);
    if (pos) return pos;
  }

  // 直接座標指定
  if (Array.isArray(end.coord)) {
    const v = sanitizeVec3(end.coord);
    if (v) return v;
  }

  return null;
}

// line ノード（3DSS）から AABB ベースの center / size を計算するフォールバック
function computeLineBoundsFromVertices(lineItem) {
  if (!lineItem || !Array.isArray(lineItem.vertices)) return null;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let count = 0;

  for (const v of lineItem.vertices) {
    const p = sanitizeVec3(v);
    if (!p) continue;
    const [x, y, z] = p;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
    count += 1;
  }

  if (count <= 0) return null;

  const center = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ];

  const size = [
    Math.max(maxX - minX, 0.1),
    Math.max(maxY - minY, 0.1),
    Math.max(maxZ - minZ, 0.1),
  ];

  return { center, size };
}

// ------------------------------------------------------------
// kind 解決
// ------------------------------------------------------------

function resolveKind(uuid, explicitKind, indices) {
  if (
    explicitKind === "points" ||
    explicitKind === "lines" ||
    explicitKind === "aux"
  ) {
    return explicitKind;
  }

  if (!indices) return null;

  const map = indices.uuidToKind;
  if (!(map instanceof Map)) return null;

  const k = map.get(uuid);
  if (k === "points" || k === "lines" || k === "aux") return k;

  return null;
}

// ------------------------------------------------------------
// kind ごとの microState 計算
// ------------------------------------------------------------

function computePointMicroState(base, indices) {
  if (!indices) return null;

  const posMap = indices.pointPosition;
  let pos = null;

  if (posMap instanceof Map) {
    pos = posMap.get(base.focusUuid) || null;
  }
  if (!pos) {
    const item = getItemByUuid(indices, base.focusUuid);
    if (item) {
      pos = getNodePositionFromItem(item);
    }
  }
  if (!pos) return null;

  const related = [base.focusUuid];

  const adj = indices.adjacency && indices.adjacency.pointToLines;
  if (adj instanceof Map) {
    const lineSet = adj.get(base.focusUuid);
    if (lineSet instanceof Set) {
      for (const l of lineSet) {
        related.push(l);
      }
    }
  }

  const localBounds = {
    center: pos.slice(),
    size: [0.5, 0.5, 0.5], // とりあえず固定。あとで microFXConfig と合わせて調整。
  };

  return {
    ...base,
    focusPosition: pos,
    relatedUuids: related,
    localBounds,
  };
}

function computeLineMicroState(base, indices) {
  if (!indices) return null;

  const endpointsMap = indices.lineEndpoints;
  let posA = null;
  let posB = null;

  if (endpointsMap instanceof Map) {
    const endpoints = endpointsMap.get(base.focusUuid);
    if (endpoints) {
      posA = resolveEndpointPosition(endpoints.endA, indices);
      posB = resolveEndpointPosition(endpoints.endB, indices);
    }
  }

  let center = null;
  let size = null;

  if (posA && posB) {
    center = [
      (posA[0] + posB[0]) / 2,
      (posA[1] + posB[1]) / 2,
      (posA[2] + posB[2]) / 2,
    ];

    size = [
      Math.abs(posA[0] - posB[0]) || 0.1,
      Math.abs(posA[1] - posB[1]) || 0.1,
      Math.abs(posA[2] - posB[2]) || 0.1,
    ];
  } else {
     // 端点から取れへん場合は頂点群の AABB にフォールバック
    const item = getItemByUuid(indices, base.focusUuid);
    const bounds = computeLineBoundsFromVertices(item);
    if (!bounds) return null;

    center = bounds.center;
    size = bounds.size;
  }

  const related = [base.focusUuid];

  const adj = indices.adjacency && indices.adjacency.lineToPoints;
  if (adj instanceof Map) {
    const pair = adj.get(base.focusUuid);
    if (pair && Array.isArray(pair)) {
      const [pA, pB] = pair;
      if (pA) related.push(pA);
      if (pB && pB !== pA) related.push(pB);
    }
  }

  const localBounds = { center, size };

  return {
    ...base,
    focusPosition: center,
    relatedUuids: related,
    localBounds,
  };
}

function computeAuxMicroState(base, indices) {
  if (!indices) return null;

  const item = getItemByUuid(indices, base.focusUuid);
  if (!item) return null;

  const pos = getNodePositionFromItem(item);
  if (!pos) return null;

  const localBounds = {
    center: pos.slice(),
    size: [2, 2, 2], // HUD/補助オブジェクト用に少し大きめ
  };

  return {
    ...base,
    focusPosition: pos,
    relatedUuids: [base.focusUuid],
    localBounds,
  };
}

// ------------------------------------------------------------
// microController 本体（共通ベース + 純計算関数）
// ------------------------------------------------------------

// selection + indices から microState のベース形を作る
function buildBaseMicroState(selection, indices) {
  if (!selection || !selection.uuid) return null;

  const kind = resolveKind(selection.uuid, selection.kind, indices);

  return {
    focusUuid: selection.uuid,
    kind,
    focusPosition: null,
    relatedUuids: [],
    localBounds: null,
  };
}


// 純計算版 microState 生成関数
//
// - uiState を触らへん「ただの関数」
// - modeController / viewerHub から直接呼び出しても OK
// - いまのところ cameraState は使っていない（将来の拡張用に残す）
export function computeMicroState(selection, _cameraState, indices) {
  const effectiveIndices =
    indices && indices.uuidToKind instanceof Map ? indices : null;

  const base = buildBaseMicroState(selection, effectiveIndices);
  if (!base || !base.kind || !effectiveIndices) {
    return null;
  }

  if (base.kind === "points") {
    return computePointMicroState(base, effectiveIndices);
  }
  if (base.kind === "lines") {
    return computeLineMicroState(base, effectiveIndices);
  }
  if (base.kind === "aux") {
    return computeAuxMicroState(base, effectiveIndices);
  }

  return null;
}

/**
 * stateful microController
 * - uiState.microState を実際に更新するラッパ
 */
export function createMicroController(uiState, indices) {
  const baseIndices = indices || null;

  const state = {
    microState: uiState.microState ?? null,
  };

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

  // 旧来の compute:
  // いまは computeMicroState(...) を呼んで結果を uiState に流し込むだけ
  function compute(selection, cameraState, _indices) {
    const effectiveIndices =
      _indices && _indices.uuidToKind instanceof Map ? _indices : baseIndices;

    const microState = computeMicroState(
      selection,
      cameraState,
      effectiveIndices
    );

    if (!microState) {
      return null; // 失敗時は clear せず、前回値を保持
    }

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
