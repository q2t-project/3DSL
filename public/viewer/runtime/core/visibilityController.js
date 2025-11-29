// runtime/core/visibilityController.js

export function createVisibilityController(uiState, document, indices) {
  const uuidToKind =
    indices && indices.uuidToKind instanceof Map ? indices.uuidToKind : new Map();

  const uuidToFrames =
    indices && indices.uuidToFrames instanceof Map ? indices.uuidToFrames : new Map();

  const allUuids = Array.from(uuidToKind.keys());

  function getCurrentFrame() {
    const n = Number(uiState?.frame?.current);
    return Number.isFinite(n) ? n : 0;
  }

  function recompute() {
    const frame = getCurrentFrame();
    const filters = uiState.filters || {};

    const visible = new Set();

    for (const uuid of allUuids) {
      const kind = uuidToKind.get(uuid);

      // 種別フィルタ（points / lines / aux）
      if (kind === "points" || kind === "lines" || kind === "aux") {
        const enabled = filters[kind];
        if (enabled === false) {
          continue; // この kind は全部非表示
        }
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

    // null = 「全部表示」ポリシーを維持したいならここで分岐してもOKやけど、
    // Set でも実害ないので、そのまま Set を持たせておく。
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
    return { ...uiState.filters };
  }

  function setTypeFilter(kind, enabled) {
    if (kind !== "points" && kind !== "lines" && kind !== "aux") return;
    if (!uiState.filters) uiState.filters = {};
    uiState.filters[kind] = !!enabled;
    recompute();
  }

  return {
    recompute,
    isVisible,
    getFilters,
    setTypeFilter,
  };
}
