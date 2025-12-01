// runtime/core/visibilityController.js

// uiState + structIndex から「今この瞬間に見せる UUID の集合」を計算する。
// A-5 対応ポイント：
//   - フィルタ変更時に、外から差し込まれた再計算ルート（core.recomputeVisibleSet）を
//     優先して呼び出せるよう、フックを用意する。
// - frame.current
// - filters.{points,lines,aux}
// - indices.uuidToKind / uuidToFrames / frameIndex
//
// ポリシー：
// - 種別フィルタ OFF の kind は常に非表示
// - appearance.frames が付いている要素は、framesSet に currentFrame が含まれるときだけ表示
// - appearance.frames が無い要素は「全フレーム共通」で表示対象

export function createVisibilityController(uiState, document, indices) {
  const uuidToKind =
    indices && indices.uuidToKind instanceof Map ? indices.uuidToKind : new Map();

  const uuidToFrames =
    indices && indices.uuidToFrames instanceof Map ? indices.uuidToFrames : new Map();

  const frameIndex =
    indices && indices.frameIndex && typeof indices.frameIndex === "object"
      ? indices.frameIndex
      : null;

  const allUuids = Array.from(uuidToKind.keys());

  // A-5: frame/filter 変更トリガから「正規の再計算ルート」
  // （core.recomputeVisibleSet 想定）を呼べるようにするためのフック。
  let recomputeHandler = null;

  // frames 未指定（= 全フレーム共通）の要素
  const uuidsWithoutFrames = allUuids.filter((uuid) => !uuidToFrames.has(uuid));

  function getCurrentFrame() {
    const n = Number(uiState?.frame?.current);
    return Number.isFinite(n) ? n : 0;
  }

  function typeEnabled(filters, kind) {
    if (kind !== "points" && kind !== "lines" && kind !== "aux") return true;
    const enabled = filters[kind];
    return enabled !== false;
  }

  // frameIndex を使った最適化パス
  function recomputeWithFrameIndex(frame, filters) {
    const visible = new Set();

    const tryKind = (kind) => {
      const perKindIndex = frameIndex && frameIndex[kind];
      if (!(perKindIndex instanceof Map)) return;
      if (!typeEnabled(filters, kind)) return;

      const set = perKindIndex.get(frame);
      if (!(set instanceof Set)) return;

      for (const uuid of set) {
        visible.add(uuid);
      }
    };

    // frames を持つ要素は frameIndex 経由で拾う
    tryKind("points");
    tryKind("lines");
    tryKind("aux");

    // frames を持たない要素は「全フレーム共通」扱いで種別フィルタだけ見る
    for (const uuid of uuidsWithoutFrames) {
      const kind = uuidToKind.get(uuid);
      if (!typeEnabled(filters, kind)) continue;
      visible.add(uuid);
    }

    return visible;
  }

  // 旧ロジック（uuidToFrames を総なめ）へのフォールバック
  function recomputeFallback(frame, filters) {
    const visible = new Set();

    for (const uuid of allUuids) {
      const kind = uuidToKind.get(uuid);

      // 種別フィルタ（points / lines / aux）
      if (!typeEnabled(filters, kind)) {
        continue;
      }

      // frame フィルタ
      const framesSet = uuidToFrames.get(uuid);
      if (framesSet && framesSet.size > 0) {
        if (!framesSet.has(frame)) {
          continue; // この frame では表示しない
        }
      }

      visible.add(uuid);
    }

    return visible;
  }

  function recompute() {
    // ここは「純粋に visibleSet を作り直す」ベースロジックとして残す。
    const frame = getCurrentFrame();
    const filters = uiState.filters || {};

    let visible;

    if (
      frameIndex &&
      frameIndex.points instanceof Map &&
      frameIndex.lines instanceof Map &&
      frameIndex.aux instanceof Map
    ) {
      // structIndex.frameIndex が揃っている場合はそっち優先
      visible = recomputeWithFrameIndex(frame, filters);
    } else {
      // 無ければ従来どおり uuidToFrames を総なめ
      visible = recomputeFallback(frame, filters);
    }

    uiState.visibleSet = visible;
    return uiState.visibleSet;
  }

  function isVisible(uuid) {
    if (!uuid) return false;
    const vs = uiState.visibleSet;
    if (!(vs instanceof Set)) return true; // null or 不正 → 全部表示扱い
    return vs.has(uuid);
  }

  function getFilters() {
    return { ...(uiState.filters || {}) };
  }

  function setTypeFilter(kind, enabled) {
    if (kind !== "points" && kind !== "lines" && kind !== "aux") return;
    if (!uiState.filters) uiState.filters = {};
    uiState.filters[kind] = !!enabled;

    // A-5:
    //  フィルタ変更 → まず「正規ルート」があればそちらを呼ぶ。
    //  （core.recomputeVisibleSet が差し込まれている前提）
    if (typeof recomputeHandler === "function") {
      const next = recomputeHandler();
      if (next) {
        uiState.visibleSet = next;
      }
    } else {
      // まだフック未設定の場合は従来どおりローカル再計算。
      recompute();
    }
  }

  function setRecomputeHandler(fn) {
    recomputeHandler = typeof fn === "function" ? fn : null;
  }

  return {
    recompute,
    isVisible,
    getFilters,
    setTypeFilter,
    setRecomputeHandler,
  };
}
