// viewer/runtime/core/selectionController.js

const DEBUG_SELECTION = false;
function debugSel(...args) {
  if (!DEBUG_SELECTION) return;
  console.warn(...args);
}

const VALID_KIND = new Set(["points", "lines", "aux"]);

export function createSelectionController(uiState, structIndex, highlightApi = {}) {
  const uuidToKind =
    structIndex && structIndex.uuidToKind instanceof Map ? structIndex.uuidToKind : null;

  const uuidToItem =
    structIndex && structIndex.uuidToItem instanceof Map ? structIndex.uuidToItem : null;

  const { setHighlight, clearAllHighlights, onChanged } = highlightApi || {};

  function resolveKind(uuid, explicitKind) {
    if (VALID_KIND.has(explicitKind)) return explicitKind;

    if (structIndex && typeof structIndex.getKind === "function") {
      const k = structIndex.getKind(uuid);
      return VALID_KIND.has(k) ? k : null;
    }

    if (uuidToKind) {
      const k = uuidToKind.get(uuid);
      return VALID_KIND.has(k) ? k : null;
    }

    return null;
  }

  function existsUuid(uuid) {
    if (!uuid) return false;

    if (uuidToKind && uuidToKind.has(uuid)) return true;
    if (uuidToItem && uuidToItem.has(uuid)) return true;

    // フォールバック（実装差の保険）
    const byUuid = structIndex && structIndex.byUuid;
    if (byUuid instanceof Map) return byUuid.has(uuid);
    if (byUuid && typeof byUuid === "object") return uuid in byUuid;

    if (structIndex && typeof structIndex.hasUuid === "function") {
      return !!structIndex.hasUuid(uuid);
    }

    return false;
  }

  // 正準形：
  // - 未選択: null
  // - 選択: { uuid: string, kind: "points"|"lines"|"aux"|null }
  function sanitize(uuid, kind) {
    if (typeof uuid !== "string") return null;
    const u = uuid.trim();
    if (!u) return null;

    // Phase2: index 不整合は容赦なく弾く（null整合優先）
    if (!existsUuid(u)) return null;

    const k = resolveKind(u, kind);
    return { uuid: u, kind: k }; // kind は null でも持つ
  }

  function clear() {
    debugSel("[selection] clear()");
    uiState.selection = null;

    if (typeof clearAllHighlights === "function") {
      clearAllHighlights();
    }
    if (typeof onChanged === "function") onChanged("selection");
    return null;
  }

  function select(uuid, kind) {
    if (!uuid) {
      debugSel("[selection] clear via select(null)");
      return clear();
    }

    const clean = sanitize(uuid, kind);
    if (!clean) {
      debugSel("[selection] sanitize failed -> clear", { uuid, kind });
      return clear();
    }

    uiState.selection = clean;
    debugSel("[selection] select", uiState.selection);

    // --- ハイライト反映（A-7：macro 限定） ---
    if (typeof setHighlight === "function" || typeof clearAllHighlights === "function") {
      if (uiState.mode === "macro") {
        if (typeof setHighlight === "function") {
          // kind も渡しておく（renderer 側での解決を安定させる）
          setHighlight({ uuid: clean.uuid, kind: clean.kind, level: 1 });
        }
      } else if (typeof clearAllHighlights === "function") {
        clearAllHighlights();
      }
    }

    // NOTE: ここで recomputeVisibleSet を叩く（唯一ルート）
    if (typeof onChanged === "function") onChanged("selection");
    return uiState.selection;
  }

  function get() {
    return uiState.selection ? uiState.selection : null;
  }

  const controller = {
    select,
    clear,
    get,
    sanitize,
  };

  Object.defineProperty(controller, "selection", {
    get() {
      return uiState.selection ? uiState.selection : null;
    },
    set(v) {
      if (!v || !v.uuid) {
        clear();
      } else {
        select(v.uuid, VALID_KIND.has(v.kind) ? v.kind : undefined);
      }
    },
    enumerable: false,
    configurable: true,
  });

  return controller;
}
