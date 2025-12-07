// runtime/core/selectionController.js

export function createSelectionController(uiState, structIndex, handlers = {}) {
  const { setHighlight, clearAllHighlights } = handlers;

  // 内部的に持つ「現在の selection」
  let current = {
    uuid: uiState?.selection?.uuid ?? null,
    kind: uiState?.selection?.kind ?? null,
  };

  // --------------------------------------------------
  // macro 専用 selection ハイライト
  // --------------------------------------------------
  function applySelectionHighlight() {
    // renderer 側ハンドラが無いなら何もしない
    if (!clearAllHighlights && !setHighlight) return;

    // まずは一旦全部クリア
    if (typeof clearAllHighlights === "function") {
      clearAllHighlights();
    }

    // macro 以外（micro / meso / 不明）は selection ハイライトを出さない
    if (uiState.mode !== "macro") {
      return;
    }

    // uuid / kind が揃ってなければ何も描かない
    if (!current || !current.uuid || !current.kind) {
      return;
    }

    if (typeof setHighlight === "function") {
      // payload の形は renderer.setHighlight の期待に合わせる
      // 例：{ kind: "lines", uuids: [uuid] }
      setHighlight({
        kind: current.kind,
        uuids: [current.uuid],
      });
    }
  }

  // --------------------------------------------------
  // selection API 本体
  // --------------------------------------------------

  function get() {
    return current;
  }

  function clear() {
    // ui_state.selection を空に
    if (uiState && uiState.selection) {
      uiState.selection.uuid = null;
      uiState.selection.kind = null;
    }

    current = { uuid: null, kind: null };

    // ハイライトも消す（mode に関わらずクリア）
    applySelectionHighlight();

    return current;
  }

  function select(uuid, kind) {
    const newUuid = uuid || null;
    const newKind = kind || null;

    // ui_state.selection 更新
    if (uiState && uiState.selection) {
      uiState.selection.uuid = newUuid;
      uiState.selection.kind = newKind;
    }

    // 内部状態も更新
    current = { uuid: newUuid, kind: newKind };

    // ★ここで必ずハイライト更新を呼ぶ
    //   ※「同じ uuid なのでスキップ」みたいなショートカットは入れない
    //      （mode だけ変わったケースでも applySelectionHighlight が走るように）
    applySelectionHighlight();

    return current;
  }

  /**
   * モード変更時などに「selection はそのまま、見え方だけ更新したい」とき用。
   * modeController から叩けるように出しておくと便利。
   */
  function refreshHighlightForCurrentMode() {
    applySelectionHighlight();
  }

  return {
    get,
    clear,
    select,
    refreshHighlightForCurrentMode,
  };
}
