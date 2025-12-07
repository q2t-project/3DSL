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

export function createVisibilityController(uiState, _document, indices) {
  // _document は現状未使用だが、将来の拡張（例えば struct 全体の統計）用に残している。
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

  function createEmptyVisibleSets() {
    return {
      points: new Set(),
      lines:  new Set(),
      aux:    new Set(),
    };
  }

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
    const result = createEmptyVisibleSets();

    const tryKind = (kind) => {
      const perKindIndex = frameIndex && frameIndex[kind];
      if (!(perKindIndex instanceof Map)) return;
      if (!typeEnabled(filters, kind)) return;

      const set = perKindIndex.get(frame);
      if (!(set instanceof Set)) return;

      const dst = result[kind];
      if (!dst) return;

      for (const uuid of set) {
        dst.add(uuid);
      }
    };

    // frames を持つ要素は frameIndex 経由で拾う
    tryKind("points");
    tryKind("lines");
    tryKind("aux");

    // frames を持たない要素は「全フレーム共通」扱い
    for (const uuid of uuidsWithoutFrames) {
      const kind = uuidToKind.get(uuid);
      if (!typeEnabled(filters, kind)) continue;

      const dst = result[kind];
      if (dst) dst.add(uuid);
    }

    return result;
  }

  // 旧ロジック（uuidToFrames を総なめ）へのフォールバック
  function recomputeFallback(frame, filters) {
    const result = createEmptyVisibleSets();

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

      const dst = result[kind];
      if (dst) dst.add(uuid);
    }

    return result;
  }

  function recompute() {
    const frame = getCurrentFrame();
    const filters = uiState.filters || {};

    let subsets;

    if (
      frameIndex &&
      frameIndex.points instanceof Map &&
      frameIndex.lines instanceof Map &&
      frameIndex.aux instanceof Map
    ) {
      // structIndex.frameIndex が揃っている場合はそっち優先
      subsets = recomputeWithFrameIndex(frame, filters);
    } else {
      // 無ければ従来どおり uuidToFrames を総なめ
      subsets = recomputeFallback(frame, filters);
    }

    // union（全部まとめた Set）も作っておくと便利
    const all = new Set();
    for (const kind of ["points", "lines", "aux"]) {
      const set = subsets[kind];
      if (!(set instanceof Set)) continue;
      for (const uuid of set) {
        all.add(uuid);
      }
    }

    const visibleSet = {
      points: subsets.points,
      lines:  subsets.lines,
      aux:    subsets.aux,
      all,
    };

    uiState.visibleSet = visibleSet;
    return visibleSet;
  }

  function isVisible(uuid) {
    if (!uuid) return false;
    const vs = uiState.visibleSet;

    // 未設定 → 全部見える扱い（従来どおり）
    if (!vs) return true;

    // 旧形式: Set<uuid>
    if (vs instanceof Set) {
      return vs.has(uuid);
    }

    // 新形式: { points:Set, lines:Set, aux:Set, all?:Set }
    if (typeof vs === "object") {
      const kind = uuidToKind.get(uuid);

      // kind が分かってて、その kind 用 Set があればそれを見る
      if (kind && vs[kind] instanceof Set) {
        return vs[kind].has(uuid);
      }

      // all Set があればそれを見る
      if (vs.all instanceof Set) {
        return vs.all.has(uuid);
      }

      // ここまで来たら情報不足 → とりあえず見える扱いに倒す
      return true;
    }

    // よく分からん値が入ってた場合も安全側に倒す
    return true;
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
