// ui/hubFacade.js
// Only UI file allowed to touch hub.core directly (see scripts/check-ports-conformance.mjs)
// Keep this surface small and explicit.
//
// Naming note:
// - "controllers" matches viewer vocabulary: hub exposes core controllers.
// - createHubCoreFacade is kept as a deprecated alias for compatibility.

export function createHubCoreControllers(hub) {
  const core = hub && hub.core;

  return {
    // document
    getDocument: () => core?.document?.get?.() ?? null,
    setDocument: (doc, meta) => core?.document?.set?.(doc, meta),
    updateDocument: (mutator) => core?.edit?.updateDocument?.(mutator),
    beginHistoryGroup: () => core?.edit?.beginHistoryGroup?.(),
    endHistoryGroup: () => core?.edit?.endHistoryGroup?.() ?? false,
    undo: () => core?.edit?.undo?.() ?? false,
    redo: () => core?.edit?.redo?.() ?? false,
    canUndo: () => !!core?.edit?.canUndo?.(),
    canRedo: () => !!core?.edit?.canRedo?.(),
    getDocumentLabel: () => core?.document?.getLabel?.() ?? "",
    setDocumentLabel: (label) => core?.document?.setLabel?.(label),

    // file / title
    getBaseLabel: () => core?.file?.getBaseLabel?.() ?? "",
    getDisplayLabel: () => core?.file?.getDisplayLabel?.() ?? "",
    getWindowTitle: () => core?.file?.getWindowTitle?.() ?? "",
    getSaveLabel: () => core?.file?.getSaveLabel?.() ?? null,
    getSaveHandle: () => core?.file?.getSaveHandle?.() ?? null,
    setSaveLabel: (label) => core?.file?.setSaveLabel?.(label),
    setSaveHandle: (handle, label) => core?.file?.setSaveHandle?.(handle, label),
    clearSaveLabel: () => core?.file?.clearSaveLabel?.(),
    clearSaveHandle: () => core?.file?.clearSaveHandle?.(),

    // dirty
    isDirty: () => !!core?.dirty?.get?.(),
    markDirty: () => core?.dirty?.markDirty?.(),
    markClean: () => core?.dirty?.markClean?.(),

    // ui state
    getUiState: () => core?.uiState?.get?.() ?? {},
    setUiState: (next) => core?.uiState?.set?.(next),

    // selection
    getSelection: () => core?.selection?.get?.() ?? [],
    setSelection: (arr) => core?.selection?.set?.(arr),

    // lock (UI-only; does not affect document/dirty)
    listLocks: () => core?.lock?.list?.() ?? [],
    toggleLock: (uuid) => core?.lock?.toggle?.(uuid),
    setLocks: (uuids) => core?.lock?.set?.(uuids),

    // visibility (UI-only; does not affect document/dirty)
    toggleHidden: (uuid) => core?.visibility?.toggleHidden?.(uuid),
    isHidden: (uuid) => !!core?.visibility?.isHidden?.(uuid),
    listHidden: () => core?.visibility?.listHidden?.() ?? [],
    setSolo: (uuid) => core?.visibility?.setSolo?.(uuid),
    clearSolo: () => core?.visibility?.clearSolo?.(),
    getSolo: () => core?.visibility?.getSolo?.() ?? null,
    setVisibilityState: (payload) => core?.visibility?.setState?.(payload),

    // outliner groups/layers (UI-only)
    getOutlinerState: () => core?.outliner?.getState?.() ?? { groups: [], itemToGroup: {}, collapsed: [] },
    setOutlinerState: (payload) => core?.outliner?.setState?.(payload),
    createGroup: (name, parentId) => core?.outliner?.createGroup?.(name, parentId),
    renameGroup: (id, name) => core?.outliner?.renameGroup?.(id, name),
    toggleGroupCollapsed: (id) => core?.outliner?.toggleGroupCollapsed?.(id),
    assignItemsToGroup: (uuids, groupId) => core?.outliner?.assignItemsToGroup?.(uuids, groupId),
    ungroupItems: (uuids) => core?.outliner?.ungroupItems?.(uuids),

    // quickcheck
    runQuickCheck: () => core?.quickcheck?.run?.() ?? [],
    fixBrokenLineEndpoints: () => core?.quickcheck?.fixBrokenLineEndpoints?.() ?? { removed: 0 },

    // import (tolerant open)
    importNormalize: (raw) => core?.import?.normalize?.(raw),
    getImportExtras: () => core?.import?.getExtras?.() ?? null,
    clearImportExtras: () => core?.import?.clearExtras?.(),

    // strict validator
    ensureValidatorInitialized: () => core?.validator?.ensureInitialized?.(),
    isValidatorReady: () => core?.validator?.isReady?.() ?? false,
    validateStrict: (doc) => core?.validator?.validate?.(doc),
    getStrictErrors: () => core?.validator?.getErrors?.() ?? [],

    // focus helper
    focusByIssue: (issue) => core?.focusByIssue?.(issue),

    // UI sidecar (UI-only; does not affect document/dirty)
    getUiSidecar: () => core?.uiSidecar?.get?.() ?? null,
    applyUiSidecar: (sidecar) => core?.uiSidecar?.apply?.(sidecar),
  };
}

// Deprecated alias (compat)
export const createHubCoreFacade = createHubCoreControllers;
