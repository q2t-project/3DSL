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

  // まず kind を持ってる索引を優先（byUuid は node 本体なので kind を持たない）
  if (structIndex.uuidToKind instanceof Map) {
    const k = structIndex.uuidToKind.get(uuid);
    return VALID_KIND.has(k) ? k : null;
  }
  if (structIndex.uuidToItem instanceof Map) {
    const hit = structIndex.uuidToItem.get(uuid);
    const k = hit?.kind || null;
    return VALID_KIND.has(k) ? k : null;
  }
  if (structIndex.uuidToItem && typeof structIndex.uuidToItem === "object") {
    const hit = structIndex.uuidToItem[uuid] || null;
    const k = hit?.kind || null;
    return VALID_KIND.has(k) ? k : null;
  }
  return null;
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
    // “正準化／更新” が役割やから、無ければ作って形を固定する
    let f = uiState.filters;
    if (!f || typeof f !== "object") f = uiState.filters = {};

    let t = f.types;
    if (!t || typeof t !== "object") t = f.types = {};
    if (typeof t.points !== "boolean") t.points = true;
    if (typeof t.lines  !== "boolean") t.lines  = true;
    if (typeof t.aux    !== "boolean") t.aux    = true;

    let m = f.auxModules;
    if (!m || typeof m !== "object") m = f.auxModules = {};
    if (typeof m.grid !== "boolean") m.grid = false;
    if (typeof m.axis !== "boolean") m.axis = false;

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
      // ★ kind が取れない互換ケース（structIndex 渡し忘れ等）救済
      if (vs.points instanceof Set && vs.points.has(uuid)) return true;
      if (vs.lines  instanceof Set && vs.lines.has(uuid))  return true;
      if (vs.aux    instanceof Set && vs.aux.has(uuid))    return true;

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
