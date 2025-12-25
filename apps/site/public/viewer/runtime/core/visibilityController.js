// viewer/runtime/core/visibilityController.js
// 役割：filters の正準化／更新、isVisible の問い合わせ
// 禁止：visibleSet の計算（それは recomputeVisibleSet の仕事）

const VALID_KIND = new Set(["points", "lines", "aux"]);

function getKind(structIndex, uuid) {
  if (!structIndex || !uuid) return null;

  if (typeof structIndex.getKind === "function") {
    const k = structIndex.getKind(uuid);
    return VALID_KIND.has(k) ? k : null;
  }

  const hit =
    (structIndex.byUuid instanceof Map && structIndex.byUuid.get(uuid)) ||
    (structIndex.byUuid && typeof structIndex.byUuid === "object" && structIndex.byUuid[uuid]) ||
    (structIndex.uuidToItem instanceof Map && structIndex.uuidToItem.get(uuid)) ||
    (structIndex.uuidToItem && typeof structIndex.uuidToItem === "object" && structIndex.uuidToItem[uuid]) ||
    null;

  const k = hit?.kind || hit?.type || null;
  return VALID_KIND.has(k) ? k : null;
}

export function createVisibilityController(uiState, a = null, b = null, c = null) {
  // 互換：
  // - (uiState, {structIndex, onChanged})
  // - (uiState, struct, structIndex)  ← 旧 bootstrap 互換
  let structIndex = null;
  let onChanged = null;

  if (a && typeof a === "object" && ("structIndex" in a || "onChanged" in a)) {
    structIndex = a.structIndex || null;
    onChanged = typeof a.onChanged === "function" ? a.onChanged : null;
  } else {
    // 旧: (uiState, struct, structIndex)
    structIndex = b || null;
  }

  function setRecomputeHandler(fn) {
    onChanged = typeof fn === "function" ? fn : null;
  }

  function assertFilters() {
    const f = uiState.filters;
    if (!f || typeof f !== "object") throw new Error("visibilityController: uiState.filters missing");
    const t = f.types;
    if (!t || typeof t !== "object") throw new Error("visibilityController: uiState.filters.types missing");
    if (typeof t.points !== "boolean" || typeof t.lines !== "boolean" || typeof t.aux !== "boolean") {
      throw new Error("visibilityController: filters.types flags missing");
    }
    const m = f.auxModules;
    if (!m || typeof m !== "object") throw new Error("visibilityController: filters.auxModules missing");
    return f;
  }

  function getFilters() {
    const f = assertFilters();
    return {
      ...f,
      types: { ...(f.types || {}) },
      auxModules: { ...(f.auxModules || {}) },
    };
  }

  function setTypeFilter(kind, enabled) {
    if (!VALID_KIND.has(kind)) return;

    const root = assertFilters();
    const flag = !!enabled;

    root.types[kind] = flag;

    if (onChanged) onChanged("filters");
  }

  function setAuxModule(name, enabled) {
    const root = assertFilters();
    root.auxModules[name] = !!enabled;

    if (onChanged) onChanged("filters");
  }

  function isVisible(uuid) {
    if (!uuid) return false;

    const vs = uiState.visibleSet;

    // derived 未設定 → 互換で全部 visible
    if (!vs) return true;

    // 旧: Set<uuid>
    if (vs instanceof Set) return vs.has(uuid);

    // 新: { points:Set, lines:Set, aux:Set, all?:Set }
    if (typeof vs === "object") {
      const kind = getKind(structIndex, uuid);

      if (kind && vs[kind] instanceof Set) {
        return vs[kind].has(uuid);
      }
      if (vs.all instanceof Set) {
        return vs.all.has(uuid);
      }

      // visibleSet があるのに情報不足 → strict 側で false
      return false;
    }

    return true;
  }

  return {
    getFilters,
    setTypeFilter,
    setAuxModule,
    isVisible,
    setRecomputeHandler, // ★ bootstrap 互換
  };
}
