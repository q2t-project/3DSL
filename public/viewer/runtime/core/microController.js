// viewer/runtime/core/microController.js

// ------------------------------------------------------------
// microState の想定フォーマット（viewer v1 現行）
// ------------------------------------------------------------
//
// {
//   // --- 主役 ---
//   focusUuid: string,                        // フォーカス対象の UUID
//   kind: "points" | "lines" | "aux" | null,  // フォーカス対象の種別
//
//   // --- 位置・範囲 ---
//   focusPosition: [number, number, number] | null, // marker / glow / axes の基準位置（world）
//   localBounds: {
//     center: [number, number, number],       // micro 用ローカル AABB の中心（world）
//     size:   [number, number, number],       // AABB サイズ（world）
//   } | null,
//
//   // --- 近傍構造 ---
//   relatedUuids: string[],                   // 1-hop 近傍（focus と一緒に扱う UUID 群）
//   degreeByUuid?: { [uuid: string]: number } // 任意: ラベル Fader 用の「何親等」情報
//
//   // --- ローカル座標系（任意） ---
//   localAxes?: {
//     origin: [number, number, number],
//     xDir:   [number, number, number] | null,
//     yDir:   [number, number, number] | null,
//     zDir:   [number, number, number] | null,
//     scale?: number,     // unitless
//   },
//
//   // --- 状態フラグ（任意・将来拡張含む） ---
//   isHover?: boolean,    // hover 中かどうか（bounds のハイライト用）
//   editing?: boolean,    // 編集モードかどうか（viewer では通常 false）
// }
//
// microController は：
//   selection + cameraState + structIndex
// → microState を計算するだけの「変換レイヤ」。
// three.js のオブジェクトや UI とは直接関わらない。

// ------------------------------------------------------------
// 共通ヘルパ
// ------------------------------------------------------------

const DEBUG_MICRO = false;
function debugMicro(...args) {
  if (!DEBUG_MICRO) return;
  console.log(...args);
}

debugMicro("[micro] microController loaded v2");

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

// indices から 3DSS ノード本体を取ってくる（形の揺れに強く）
function getItemByUuid(indices, uuid) {
  if (!indices || !uuid) return null;

  // 1) Contract A / 互換 API
  if (typeof indices.getItem === "function") {
    try {
      return indices.getItem(uuid) || null;
    } catch (_e) {}
  }

  // 2) Contract A: byUuid: Map<uuid,node>
  const byUuid = indices.byUuid;
  if (byUuid && typeof byUuid.get === "function") {
    try {
      return byUuid.get(uuid) || null;
    } catch (_e) {}
  }

  // 3) 旧: uuidToItem: Map<uuid,{item,...}> / object
  const map = indices.uuidToItem;
  if (map && typeof map.get === "function") {
    try {
      const rec = map.get(uuid);
      return (rec && (rec.item ?? rec)) || null;
    } catch (_e) {}
  }
  if (map && typeof map === "object") {
    const rec = map[uuid];
    return (rec && (rec.item ?? rec)) || null;
  }

  return null;
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
    const pointPos = indices.pointPosition;
    if (pointPos instanceof Map) {
      const p = pointPos.get(ref);
      const v = sanitizeVec3(p) || (p && typeof p.x === "number" ? [p.x, p.y, p.z] : null);
      if (v) return v;
    }
    const auxPos = indices.auxPosition;
    if (auxPos instanceof Map) {
      const p = auxPos.get(ref);
      const v = sanitizeVec3(p) || (p && typeof p.x === "number" ? [p.x, p.y, p.z] : null);
      if (v) return v;
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

  // 関数 API があれば最優先
  if (typeof indices.getKind === "function") {
    try {
      const k = indices.getKind(uuid);
      return (k === "points" || k === "lines" || k === "aux") ? k : null;
    } catch (_e) {}
  }
  if (typeof indices.kindOf === "function") {
    try {
      const k = indices.kindOf(uuid);
      return (k === "points" || k === "lines" || k === "aux") ? k : null;
    } catch (_e) {}
  }

  const map = indices.uuidToKind;
  if (!map) return null;

  if (typeof map.get === "function") {
    try {
      const k = map.get(uuid);
      return (k === "points" || k === "lines" || k === "aux") ? k : null;
    } catch (_e) {}
  }
  if (typeof map === "object") {
    const k = map[uuid];
    return (k === "points" || k === "lines" || k === "aux") ? k : null;
  }

  return null;
}

// ------------------------------------------------------------
// kind ごとの microState 計算
// ------------------------------------------------------------

function computePointMicroState(base, indices) {
  if (!indices) return null;

  const posMap = indices.pointPosition;
  let pos = null;

  // 1) structIndex で事前計算されている座標（あれば）
  if (posMap instanceof Map) {
    const raw = posMap.get(base.focusUuid) || null;
    pos = sanitizeVec3(raw) || (raw && typeof raw.x === "number" ? [raw.x, raw.y, raw.z] : null);
  }

  // 2) まだ無ければ 3DSS ノード側から拾う
  if (!pos) {
    const item = getItemByUuid(indices, base.focusUuid);
    if (item) {
      pos = getNodePositionFromItem(item);
    }
  }

  debugMicro("[micro] point micro", {
    uuid: base.focusUuid,
    pos,
  });

  // ★ ここで「pos ないから null 返す」はやめる
  //    → micro モード自体は成立させて、カメラ lerp / marker だけ抑止する

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

  let localBounds = null;
  if (pos) {
    localBounds = {
      center: pos.slice(),
      size: [0.5, 0.5, 0.5], // あとで microFXConfig と揃えて調整
    };
  }

  return {
    ...base,
    // 位置が取れなかったら null のまま（modeController 側で lerp だけ抑止）
    focusPosition: pos || null,
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

  debugMicro("[micro] line micro", {
    uuid: base.focusUuid,
    posA,
    posB,
  });

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
    if (bounds) {
      center = bounds.center;
      size = bounds.size;
    }
    // bounds も取れへん場合は center/size は null のまま
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

  let localBounds = null;
  if (center && size) {
    localBounds = { center, size };
  }

  return {
    ...base,
    // center が無ければ focusPosition は null（micro モードは有効、カメラ lerp なし）
    focusPosition: center || null,
    relatedUuids: related,
    localBounds,
  };
}

function computeAuxMicroState(base, indices) {
  if (!indices) return null;

  const item = getItemByUuid(indices, base.focusUuid);

  if (!item) {
    // 位置情報ゼロでも、とりあえず highlight 用だけ成立させる
    return {
      ...base,
      focusPosition: null,
      relatedUuids: [base.focusUuid],
      localBounds: null,
    };
  }

  const pos = getNodePositionFromItem(item);

  let localBounds = null;
  if (pos) {
    localBounds = {
      center: pos.slice(),
      size: [2, 2, 2], // HUD/補助オブジェクト用に少し大きめ
    };
  }

  return {
    ...base,
    focusPosition: pos || null,
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
  if (!selection || !selection.uuid) return null;

  const effectiveIndices = indices || null;

  const base = buildBaseMicroState(selection, effectiveIndices);

  debugMicro("[micro] computeMicroState input", {
    selection,
    base,
    hasIndices: !!effectiveIndices,
  });

  if (!base) return null;

  // kind/indices が弱い場合でも、最低限「focusUuid は維持」して返す（microFX/選択連動のため）
  if (!base.kind || !effectiveIndices) {
    return {
      ...base,
      relatedUuids: [base.focusUuid],
      focusPosition: null,
      localBounds: null,
    };
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

  // Phase2: micro の副作用ハンドラ（renderer/hub 側から注入）
  // refresh()/clear() は基本ここだけを見る
  let effectHandlers = { apply: null, clear: null };

  debugMicro("[micro] createMicroController", {
    hasIndices: !!baseIndices,
    hasUuidToKind: baseIndices?.uuidToKind instanceof Map,
    uuidToKindSize: baseIndices?.uuidToKind?.size,
  });

  function get() {
    return uiState.microState ?? null;
  }

  // 旧来の compute:
  // Phase2: compute は “計算だけ”（uiState には書かない）
  function compute(selection, cameraState, _indices) {
    const effectiveIndices = _indices || baseIndices;

    debugMicro("[micro] compute()", {
      selection,
      hasBaseIndices:
        !!baseIndices && baseIndices.uuidToKind instanceof Map,
      hasEffectiveIndices:
        !!effectiveIndices && effectiveIndices.uuidToKind instanceof Map,
    });

    const microState = computeMicroState(
      selection,
      cameraState,
      effectiveIndices
    );

    debugMicro("[micro] compute() result", { microState });

    return microState || null;
  }

  // Phase2: refresh は “副作用だけ”
  // - uiState.microState は recomputeVisibleSet が確定
  // - ここは「今の状態に同期」するだけ
  // 互換: refresh({apply,clear}) でも refresh("reason") でも動く
  function refresh(arg = undefined) {
    const deps = (arg && typeof arg === "object") ? arg : null;
    const mode = uiState?.mode || "macro";
    const ms = uiState?.microState ?? null;

    const apply =
      (deps && typeof deps.apply === "function") ? deps.apply :
      (typeof effectHandlers.apply === "function") ? effectHandlers.apply :
      null;
    const clearFx =
      (deps && typeof deps.clear === "function") ? deps.clear :
      (typeof effectHandlers.clear === "function") ? effectHandlers.clear :
      null;

    // micro 以外 or microState 無し → 副作用はクリア
    if (mode !== "micro" || !ms) {
      if (clearFx) clearFx();
      return null;
    }

    if (apply) apply(ms);
    return ms;
  }

  // Phase2: clear は「uiState を触らず」副作用だけ消す（互換）
  function clear(arg = undefined) {
    const deps = (arg && typeof arg === "object") ? arg : null;
    const clearFx =
      (deps && typeof deps.clear === "function") ? deps.clear :
      (typeof effectHandlers.clear === "function") ? effectHandlers.clear :
      null;
    if (clearFx) clearFx();
    return null;
  }

  const controller = {
    compute,
    clear,
    get,
    refresh,
    // Phase2: 副作用ハンドラを外から注入（renderer/hub 側で握る）
    setEffectHandlers(h = {}) {
      effectHandlers = {
        apply: (typeof h.apply === "function") ? h.apply : effectHandlers.apply,
        clear: (typeof h.clear === "function") ? h.clear : effectHandlers.clear,
      };
    },
  };

  // Phase2: 直書き禁止（getter のみにする）
  Object.defineProperty(controller, "microState", {
    get() { return uiState.microState ?? null; },
    set() {
      console.warn("[micro] microState is derived; update via recomputeVisibleSet()");
    },
    enumerable: false,
    configurable: true,
  });

  return controller;
}
