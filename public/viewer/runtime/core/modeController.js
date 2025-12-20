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
  function readVec3(v, fallback = null) {
    if (Array.isArray(v) && v.length >= 3) return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    if (v && typeof v === "object") return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
    return fallback;
 }

  function _clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.max(a, Math.min(b, x));
  }

  function _estimateMicroRadius(ms) {
    const s = ms?.localBounds?.size;
    if (Array.isArray(s) && s.length >= 3) {
      const sx = Math.abs(Number(s[0]) || 0);
      const sy = Math.abs(Number(s[1]) || 0);
      const sz = Math.abs(Number(s[2]) || 0);
      const m = Math.max(sx, sy, sz);
      if (Number.isFinite(m) && m > 0) return m * 0.5;
    }
    // point など bounds 無い/小さい時の最低半径
    return 0.25;
  }

  function _buildMicroCameraTarget(microState) {
    const p = microState?.focusPosition || microState?.localBounds?.center || null;
    if (!Array.isArray(p) || p.length < 3) return null;
    return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  }

  function _startMicroCameraTransition(cleanSel) {
    // ブロック条件は set() 側で弾いてる前提やけど、最終防衛
    if (!cameraEngine?.getState || !cameraTransition?.start) return;

    const cur = (() => { try { return cameraEngine.getState(); } catch (_e) { return null; } })();
    if (!cur || typeof cur !== "object") return;

    // microState は “計算だけ” をここで作る（uiState へは書かん）
    const ms = (() => {
      try { return microController?.compute?.(cleanSel, cur, indices) ?? null; } catch (_e) { return null; }
    })();
    const tgt = _buildMicroCameraTarget(ms);
    if (!tgt) return; // focusPosition 無いならカメラは動かさん（marker/FXだけ）

    const r = _estimateMicroRadius(ms);
    // 「micro っぽい距離」：半径の数倍。大きい scene でも暴走せんよう上限だけ付ける
    const sceneR = Number(indices?.bounds?.radius);
    const maxDist = Number.isFinite(sceneR) && sceneR > 0 ? sceneR * 2 : 100000;
    const nextDist = _clamp(r * 6, 0.6, maxDist);

    const next = { ...cur, target: tgt, distance: nextDist };
    try { cameraTransition.start(next); } catch (_e) {}
  }

  function getSceneBounds() {
    try {
      const si = indices?.structIndex ?? indices?.struct ?? indices?.index ?? indices ?? null;
      return si?.bounds ?? si?.getSceneBounds?.() ?? null;
    } catch (_e) {}
   return null;
  }

  function readPointPosLoose(p) {
    if (!p) return null;
    // [x,y,z] / {x,y,z}
    const v0 = readVec3(p, null);
    if (v0) return v0;

    // { position: ... } / { pos: ... } / { coord: ... }
    const v1 = readVec3(p.position ?? p.pos ?? p.coord ?? null, null);
    if (v1) return v1;

    // { geometry: { position: ... } }
    const v2 = readVec3(p.geometry?.position ?? null, null);
    if (v2) return v2;

    return null;
  }

  function resolveItemByUuid(uuid) {
    try {
      const rec =
        indices?.uuidToItem?.get?.(uuid) ??
        indices?.structIndex?.uuidToItem?.get?.(uuid) ??
        null;
      return rec?.item ?? rec?.point ?? rec?.line ?? rec?.aux ?? rec?.data ?? rec?.value ?? rec ?? null;
    } catch (_e) {}
    return null;
  }

  function resolveMicroTargetCenter(uuid, kind) {
    // points は “その点の position” を最優先（これが無いと micro にならん）
    if (kind === "points") {
      const p = resolveItemByUuid(uuid);
      const pos = readPointPosLoose(p);
      if (pos) return pos;
    }

    // fallback: scene bounds center
    const b = getSceneBounds();
    const c = readVec3(b?.center ?? b?.centroid ?? b?.origin ?? b?.box?.center ?? null, null);
    if (c) return c;

    // それすら無いなら原点
    return [0, 0, 0];
  }

  function buildMicroCameraStateFallback(clean) {
    if (!cameraEngine?.getState) return null;
    let st = null;
    try { st = cameraEngine.getState(); } catch (_e) { st = null; }
    if (!st) return null;

   const tgt0 = readVec3(st.target ?? st.lookAt ?? [0, 0, 0], [0, 0, 0]);
    const tgt = resolveMicroTargetCenter(clean.uuid, clean.kind) ?? tgt0;
    const zoom = 0.35; // macro→micro の寄り率

    // position/eye 型ならオフセットを縮める
    const pos0 = readVec3(st.position ?? st.eye ?? null, null);
    if (pos0) {
      const dx = pos0[0] - tgt0[0];
     const dy = pos0[1] - tgt0[1];
      const dz = pos0[2] - tgt0[2];
      return {
        ...st,
        target: tgt,
        position: [tgt[0] + dx * zoom, tgt[1] + dy * zoom, tgt[2] + dz * zoom],
      };
    }

    // theta/phi/distance 型なら distance を縮めて target を移す
    const d0 = Number(st.distance);
    const d1 = Number.isFinite(d0) ? Math.max(0.5, d0 * zoom) : undefined;
    return { ...st, target: tgt, distance: d1 };
  }

  function startMicroCameraTransition(clean) {
    if (!cameraTransition?.start) return;

    // microController が “micro用のカメラ状態” を返せるならそれ最優先
    let cam = null;
    try {
      cam =
        microController?.getMicroCameraState?.(clean.uuid, clean.kind) ??
        microController?.getCameraState?.() ??
        null;
    } catch (_e) {}

    if (!cam) cam = buildMicroCameraStateFallback(clean);
    // 返ってきた cam に target が無い版の救済（points で起きがち）
    if (cam && cam.target == null && cam.lookAt == null) {
      cam = { ...cam, target: resolveMicroTargetCenter(clean.uuid, clean.kind) };
    }
    if (!cam) return;
    try { cameraTransition.start(cam); } catch (_e) {}
  }

  function buildMicroState(clean) {
    // microController が microState を組めるならそれを使う
    try {
      const r =
        microController?.buildMicroState?.(clean.uuid, clean.kind) ??
        microController?.createMicroState?.(clean.uuid, clean.kind) ??
        microController?.enter?.(clean.uuid, clean.kind) ??
        microController?.focus?.(clean.uuid, clean.kind) ??
        null;
      if (r && typeof r === "object") {
        // {microState, cameraState} みたいな戻りも吸収
        return r.microState ?? r.state ?? r;
      }
    } catch (_e) {}
    // 最低限：renderer/microFX が読める形
    return { uuid: clean.uuid, kind: clean.kind ?? null };
  }

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

    uiState.mode = "micro";      // ← ここで初めて state 更新
    selectionController?.select?.(clean.uuid, clean.kind);

    // ★ microState を確定（micro の可視集合 / microFX / カメラの入力になる）
    uiState.microState = buildMicroState(clean);

    // ★ micro カメラへ遷移（microController優先 → fallback）
    startMicroCameraTransition(clean);

    uiState._dirtyVisibleSet = true;

    // ★ここ：micro 侵入/フォーカス変更でカメラをフォーカスへ寄せる
    // - recomputeVisibleSet は純関数に保つ（ここで副作用起動）
    _startMicroCameraTransition(clean);

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
