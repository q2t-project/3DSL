// viewer/runtime/core/modeController.js

const DEBUG_MODE = false;
function debugMode(...args) {
  if (!DEBUG_MODE) return;
  console.log(...args);
}

export function createModeController(
  uiState,
  selectionController,
  cameraEngine,
  cameraTransition,
  microController,
  frameController,
  visibilityController,
  indices
) {
  // kind 推定（selection.kind 欠け対策）
  function inferKind(uuid) {
    if (!uuid || !indices) return null;

    try {
      const rec = indices.uuidToItem?.get?.(uuid);
      const k =
        rec?.kind ?? rec?.group ?? rec?.type ??
        rec?.item?.kind ?? rec?.item?.group ?? rec?.item?.type ??
        null;
      if (k === "points" || k === "lines" || k === "aux") return k;
    } catch (_e) {}

    try { if (indices.points?.has?.(uuid)) return "points"; } catch (_e) {}
    try { if (indices.lines?.has?.(uuid)) return "lines"; } catch (_e) {}
    try { if (indices.aux?.has?.(uuid)) return "aux"; } catch (_e) {}

    try {
      const si = indices.structIndex || indices.struct || indices.index || null;
      const it = si?.uuidToItem?.get?.(uuid) ?? null;
      const k = it?.kind ?? it?.group ?? it?.type ?? null;
      if (k === "points" || k === "lines" || k === "aux") return k;
    } catch (_e) {}

    return null;
  }

  // macro カメラ状態（micro→macro復帰用）
  let lastMacroCameraState =
    cameraEngine && typeof cameraEngine.getState === "function"
      ? cameraEngine.getState()
      : null;

  function normalizeMode(m) {
    return m === "micro" ? "micro" : "macro";
  }

  function isVisible(uuid) {
    if (visibilityController && typeof visibilityController.isVisible === "function") {
      try {
        const r = visibilityController.isVisible(uuid);
        if (typeof r === "boolean") return r;
      } catch (_e) {}
    }
    return true; // 未配線は通す
  }

  function canEnter(uuid) {
    if (!uuid) return false;
    if (uiState?.runtime?.isFramePlaying) return false;
    if (uiState?.runtime?.isCameraAuto) return false;
    return isVisible(uuid);
  }

  // set("micro", null) 等の救済：引数→selection→no-op
  function resolveMicroTargetUuid(inputUuid) {
    if (typeof inputUuid === "string") {
      const u = inputUuid.trim();
      if (u) return u;
    }

// micro 遷移は selection を確定させる責務が modeController 側にある
// ただし selectionController.select が onChanged で recompute を直呼びする実装は禁止（dirtyだけ）

    // selectionController.get() 優先
    try {
      const cur = selectionController?.get?.();
      const u = cur?.uuid;
      if (typeof u === "string" && u.trim()) return u.trim();
    } catch (_e) {}

    // uiState.selection フォールバック
    try {
      const u = uiState?.selection?.uuid;
      if (typeof u === "string" && u.trim()) return u.trim();
    } catch (_e) {}

    return null;
  }

function set(mode, uuid, kind) {
  const prevMode = normalizeMode(uiState?.mode);

  if (mode === "micro") {
    const targetUuid = resolveMicroTargetUuid(uuid);
    if (!targetUuid) return prevMode;

    const k0 =
      (typeof kind === "string" && kind.trim())
        ? kind.trim()
        : (inferKind(targetUuid) ?? undefined);

    const clean = selectionController?.sanitize?.(targetUuid, k0);
    if (!clean) return prevMode;                 // ← ここではまだ state 触らん

    if (!canEnter(clean.uuid)) return prevMode;  // ← 最終防衛

    const cur = selectionController?.get?.();
    if (
      prevMode === "micro" &&
      cur?.uuid === clean.uuid &&
      (cur?.kind ?? null) === (clean.kind ?? null)
    ) {
      return "micro"; // 完全no-op
    }

    // micro 侵入時だけ macro カメラを保存
    if (prevMode !== "micro" && cameraEngine?.getState) {
      try { lastMacroCameraState = cameraEngine.getState(); } catch (_e) {}
    }

    uiState.mode = "micro";                      // ← ここで初めて state 更新
    selectionController?.select?.(clean.uuid, clean.kind); // ← 反映（sanitizeじゃなく select）
    uiState._dirtyVisibleSet = true;
    return "micro";
  }

  // macro 側の no-op は「既に macro かつ microState null」のときだけにしとくのが安全
  if (prevMode === "macro" && uiState.microState == null) return "macro";

  uiState.mode = "macro";
  uiState.microState = null;
  uiState._dirtyVisibleSet = true;
  return "macro";
}


  function get() {
    return normalizeMode(uiState?.mode);
  }

  function enterMacro() {
    debugMode("[mode] enter macro");

    const prev = normalizeMode(uiState?.mode);
    const next = set("macro");

    // micro→macro のときだけカメラ復帰（失敗しても落ちない）
    if (prev === "micro" && cameraTransition?.start && lastMacroCameraState) {
      try { cameraTransition.start(lastMacroCameraState); } catch (_e) {}
    }

    // macro の selection ハイライトを同期（reselectしない）
    selectionController?.refreshHighlight?.();

    return next;
  }

  function exit() {
    return enterMacro();
  }

function focus(uuid, kind) {
  // 仕様：focus(null/""/blank) は no-op（selection へフォールバックしない）
  if (uuid == null) return get();
  if (typeof uuid !== "string") return get();
  const u = uuid.trim();
  if (!u) return get();
  return set("micro", u, kind);
}


  return {
    set,
    get,
    canEnter,
    exit,
    focus,
    // 互換：注入は受けるが、この版は内部で直呼びしない
    setRecomputeHandler(_fn) {},
  };
}
