// viewer/runtime/core/microController.js

// microState 仕様（全 microFX 共通）
/**
 * microState = {
 *   focusUuid: string,                        // 選択中オブジェクトの UUID
 *   kind: "points" | "lines" | "aux",        // 3DSS のどの配列か
 *   focusPosition: [number, number, number], // フォーカス位置（ワールド座標）
 *   relatedUuids: string[],                  // 関連する UUID 群（線→端点、点→接続線など）
 *   localBounds: {                           // フォーカス近傍の AABB
 *     center: [number, number, number],
 *     size:   [number, number, number],
 *   } | null,
 *   // axes.js 用：ローカル座標軸
 *   localAxes?: {
 *     origin: [number, number, number],
 *     xDir?:  [number, number, number],
 *     yDir?:  [number, number, number],
 *     zDir?:  [number, number, number],
 *     scale?: number,
 *   },
 * }
 */

export function createMicroController(indices) {
  // indices は今は未使用（将来 structIndex 高速化用）

  function toVec3(arr) {
    if (!Array.isArray(arr) || arr.length < 3) return null;
    const x = Number(arr[0]);
    const y = Number(arr[1]);
    const z = Number(arr[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return null;
    }
    return [x, y, z];
  }

  function findPointByUuid(doc, uuid) {
    const pts = Array.isArray(doc?.points) ? doc.points : [];
    return pts.find((p) => p?.meta?.uuid === uuid) || null;
  }

  function findLineByUuid(doc, uuid) {
    const ls = Array.isArray(doc?.lines) ? doc.lines : [];
    return ls.find((l) => l?.meta?.uuid === uuid) || null;
  }

  function findAuxByUuid(doc, uuid) {
    const ax = Array.isArray(doc?.aux) ? doc.aux : [];
    return ax.find((a) => a?.meta?.uuid === uuid) || null;
  }

  function getEndpointPosition(endpoint, doc) {
    if (!endpoint || typeof endpoint !== "object") return null;

    // 1) 直接座標指定
    if (endpoint.coord) {
      return toVec3(endpoint.coord);
    }

    // 2) ref → point.appearance.position を引き当て
    if (endpoint.ref) {
      const pt = findPointByUuid(doc, endpoint.ref);
      const pos = pt?.appearance?.position;
      return toVec3(pos);
    }

    return null;
  }

  function initBounds() {
    return {
      min: [
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      ],
      max: [
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ],
      count: 0,
    };
  }

  function addToBounds(bounds, pos) {
    if (!pos) return;
    const [x, y, z] = pos;
    const [minX, minY, minZ] = bounds.min;
    const [maxX, maxY, maxZ] = bounds.max;

    bounds.min = [Math.min(minX, x), Math.min(minY, y), Math.min(minZ, z)];
    bounds.max = [Math.max(maxX, x), Math.max(maxY, y), Math.max(maxZ, z)];
    bounds.count += 1;
  }

  function finalizeBounds(bounds) {
    if (!bounds || bounds.count === 0) return null;

    const [minX, minY, minZ] = bounds.min;
    const [maxX, maxY, maxZ] = bounds.max;

    const center = [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ];

    const size = [
      maxX - minX || 0.001,
      maxY - minY || 0.001,
      maxZ - minZ || 0.001,
    ];

    return { center, size };
  }

  // axes 用：フォーカス位置から localAxes を作る
  function makeLocalAxes(focusPosition) {
    const origin = toVec3(focusPosition) || [0, 0, 0];
    // xDir/yDir/zDir は省略可。null のとき axes.js 側でカメラ向きにフォールバックする。
    return {
      origin,
      scale: 1,
    };
  }

  // --- kind = "points" ---

  function computeForPoint(selection, cameraState, doc) {
    const uuid = selection.uuid;
    const point = findPointByUuid(doc, uuid);
    if (!point) return null;

    const pos = toVec3(point.appearance?.position) || [0, 0, 0];

    const lines = Array.isArray(doc?.lines) ? doc.lines : [];
    const relatedUuids = [];

    const bounds = initBounds();
    addToBounds(bounds, pos);

    for (const line of lines) {
      const lineUuid = line?.meta?.uuid;
      if (!lineUuid) continue;

      const endA = line.appearance?.end_a;
      const endB = line.appearance?.end_b;

      const aPos = getEndpointPosition(endA, doc);
      const bPos = getEndpointPosition(endB, doc);

      const aRef = endA?.ref;
      const bRef = endB?.ref;

      const hit = aRef === uuid || bRef === uuid;

      if (hit) {
        relatedUuids.push(lineUuid);
        addToBounds(bounds, aPos);
        addToBounds(bounds, bPos);
      }
    }

    const localBounds = finalizeBounds(bounds) || {
      center: pos,
      size: [1, 1, 1],
    };

    const localAxes = makeLocalAxes(pos);

    return {
      focusUuid: uuid,
      kind: "points",
      focusPosition: pos,
      relatedUuids,
      localBounds,
      localAxes,
    };
  }

  // --- kind = "lines" ---

  function computeForLine(selection, cameraState, doc) {
    const uuid = selection.uuid;
    const line = findLineByUuid(doc, uuid);
    if (!line) return null;

    const endA = line.appearance?.end_a;
    const endB = line.appearance?.end_b;

    const aPos = getEndpointPosition(endA, doc);
    const bPos = getEndpointPosition(endB, doc);

    const bounds = initBounds();
    addToBounds(bounds, aPos);
    addToBounds(bounds, bPos);
    const localBounds = finalizeBounds(bounds);

    let focusPosition = null;
    if (aPos && bPos) {
      focusPosition = [
        (aPos[0] + bPos[0]) / 2,
        (aPos[1] + bPos[1]) / 2,
        (aPos[2] + bPos[2]) / 2,
      ];
    } else {
      focusPosition = aPos || bPos || [0, 0, 0];
    }

    const relatedUuids = [];
    if (endA?.ref) relatedUuids.push(endA.ref);
    if (endB?.ref) relatedUuids.push(endB.ref);

    const localAxes = makeLocalAxes(focusPosition);

    return {
      focusUuid: uuid,
      kind: "lines",
      focusPosition,
      relatedUuids,
      localBounds,
      localAxes,
    };
  }

  // --- kind = "aux" ---

  function computeForAux(selection, cameraState, doc) {
    const uuid = selection.uuid;
    const aux = findAuxByUuid(doc, uuid);
    if (!aux) return null;

    const pos = toVec3(aux.appearance?.position) || [0, 0, 0];

    const bounds = initBounds();
    addToBounds(bounds, pos);
    const localBounds = finalizeBounds(bounds) || {
      center: pos,
      size: [1, 1, 1],
    };

    const localAxes = makeLocalAxes(pos);

    return {
      focusUuid: uuid,
      kind: "aux",
      focusPosition: pos,
      relatedUuids: [],
      localBounds,
      localAxes,
    };
  }

  return {
    /**
     * selection: { kind?, uuid } | null
     * cameraState: CameraEngine.getState() の返り値
     * doc: 3DSS JSON ルート
     * indicesOverride: 将来、構造インデックスを差し替えたい場合用（今は未使用）
     */
    compute(selection, cameraState, doc, indicesOverride) {
      if (!selection || !selection.uuid || !doc) return null;

      let kind = selection.kind || null;
      const uuid = selection.uuid;

      // kind 未指定なら 3DSS から推定
      if (!kind) {
        if (findPointByUuid(doc, uuid)) kind = "points";
        else if (findLineByUuid(doc, uuid)) kind = "lines";
        else if (findAuxByUuid(doc, uuid)) kind = "aux";
      }

      if (kind === "points") return computeForPoint(selection, cameraState, doc);
      if (kind === "lines")  return computeForLine(selection, cameraState, doc);
      if (kind === "aux")    return computeForAux(selection, cameraState, doc);

      return null;
    },
  };
}
