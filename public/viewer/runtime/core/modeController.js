// viewer/runtime/core/modeController.js
//
// モード制御（macro / micro）
//
// 役割
// - micro への遷移可否を判断する
// - micro 侵入時に selection を確定する
// - uiState.mode / uiState.microState を更新する
// - visibleSet の再計算は hub loop に委ね、ここでは dirty だけを立てる
// - カメラ遷移（副作用）はここで起動する
//
// 注意
// - recomputeVisibleSet をここから直接呼び出さない（hub loop が唯一の commit 点）

const DEBUG_MODE = false;
function debugMode(...args) {
  if (!DEBUG_MODE) return;
  // ログレベルは warn に寄せる（console 設定に依存しにくい）
  console.warn(...args);
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
    if (Array.isArray(v) && v.length >= 3) {
      return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    }
    if (v && typeof v === "object") {
      if ("x" in v || "y" in v || "z" in v) {
        return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
      }
    }
    return fallback;
  }

  function clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.max(a, Math.min(b, x));
  }

  function isVisible(uuid) {
    if (visibilityController && typeof visibilityController.isVisible === "function") {
      try {
        const r = visibilityController.isVisible(uuid);
        if (typeof r === "boolean") return r;
      } catch (_e) {}
    }
    // 未配線の場合は安全側で通す
    return true;
  }

  function canEnter(uuid) {
    if (!uuid) return false;

    // micro 遷移は「再生中 / autoOrbit 中」は禁止
    if (uiState?.runtime?.isFramePlaying) return false;
    if (uiState?.runtime?.isCameraAuto) return false;

    // 非表示は micro 対象にしない（微視化する意味が薄く、挙動も不安定になりやすい）
    return isVisible(uuid);
  }

  function normalizeMode(m) {
    return m === "micro" ? "micro" : "macro";
  }

  // kind 推定（selection.kind 欠け対策）
  function inferKind(uuid) {
    if (!uuid || !indices) return null;

    // uuidToItem / uuidToKind がある場合
    try {
      const rec = indices.uuidToItem?.get?.(uuid);
      const k =
        rec?.kind ??
        rec?.group ??
        rec?.type ??
        rec?.item?.kind ??
        rec?.item?.group ??
        rec?.item?.type ??
        null;
      if (k === "points" || k === "lines" || k === "aux") return k;
    } catch (_e) {}

    // visibleSet 互換（indices.points/lines/aux が Set の場合）
    try {
      if (indices.points?.has?.(uuid)) return "points";
    } catch (_e) {}
    try {
      if (indices.lines?.has?.(uuid)) return "lines";
    } catch (_e) {}
    try {
      if (indices.aux?.has?.(uuid)) return "aux";
    } catch (_e) {}

    // structIndex 互換
    try {
      const si = indices.structIndex || indices.struct || indices.index || null;
      const it = si?.uuidToItem?.get?.(uuid) ?? null;
      const k = it?.kind ?? it?.group ?? it?.type ?? null;
      if (k === "points" || k === "lines" || k === "aux") return k;
    } catch (_e) {}

    return null;
  }

  function getSceneBounds() {
    try {
      const si = indices?.structIndex ?? indices?.struct ?? indices?.index ?? indices ?? null;
      return si?.bounds ?? si?.getSceneBounds?.() ?? null;
    } catch (_e) {}
    return null;
  }

  function resolveItemByUuid(uuid) {
    try {
      const rec =
        indices?.uuidToItem?.get?.(uuid) ??
        indices?.structIndex?.uuidToItem?.get?.(uuid) ??
        null;
      return (
        rec?.item ??
        rec?.point ??
        rec?.line ??
        rec?.aux ??
        rec?.data ??
        rec?.value ??
        rec ??
        null
      );
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

  function resolveMicroTargetCenter(uuid, kind) {
    // points は「点そのものの座標」を最優先
    if (kind === "points") {
      const p = resolveItemByUuid(uuid);
      const pos = readPointPosLoose(p);
      if (pos) return pos;
    }

    // fallback: scene bounds center
    const b = getSceneBounds();
    const c = readVec3(b?.center ?? b?.centroid ?? b?.origin ?? b?.box?.center ?? null, null);
    if (c) return c;

    // 最終手段：原点
    return [0, 0, 0];
  }

  function estimateMicroRadius(microState) {
    const s = microState?.localBounds?.size;
    if (Array.isArray(s) && s.length >= 3) {
      const sx = Math.abs(Number(s[0]) || 0);
      const sy = Math.abs(Number(s[1]) || 0);
      const sz = Math.abs(Number(s[2]) || 0);
      const m = Math.max(sx, sy, sz);
      if (Number.isFinite(m) && m > 0) return m * 0.5;
    }

    // point など bounds が無い / 小さいときの最低半径
    return 0.25;
  }

  function buildMicroCameraTarget(microState) {
    const p = microState?.focusPosition ?? microState?.localBounds?.center ?? null;
    if (!Array.isArray(p) || p.length < 3) return null;
    return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  }

  function buildMicroCameraState(cleanSel) {
    if (!cameraEngine?.getState) return null;

    let cur = null;
    try {
      cur = cameraEngine.getState();
    } catch (_e) {
      cur = null;
    }
    if (!cur || typeof cur !== "object") return null;

    // microState は「計算だけ」ここで作る（uiState へは書かない）
    let ms = null;
    try {
      ms = microController?.compute?.(cleanSel, cur, indices) ?? null;
    } catch (_e) {
      ms = null;
    }

    // target は microState → fallback の順
    const tgt0 = readVec3(cur.target ?? cur.lookAt ?? [0, 0, 0], [0, 0, 0]);
    const tgt = buildMicroCameraTarget(ms) ?? resolveMicroTargetCenter(cleanSel.uuid, cleanSel.kind) ?? tgt0;

    // distance は micro 半径ベースで決め、暴走を抑える
    const r = estimateMicroRadius(ms);
    const sceneR = Number(indices?.bounds?.radius);
    const maxDist = Number.isFinite(sceneR) && sceneR > 0 ? sceneR * 2 : 100000;
    const nextDist = clamp(r * 6, 0.6, maxDist);

    // state 形式に応じて適用
    const pos0 = readVec3(cur.position ?? cur.eye ?? null, null);
    if (pos0) {
      const dx = pos0[0] - tgt0[0];
      const dy = pos0[1] - tgt0[1];
      const dz = pos0[2] - tgt0[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (Number.isFinite(len) && len > 1e-6) {
        const s = nextDist / len;
        return {
          ...cur,
          target: tgt,
          position: [tgt[0] + dx * s, tgt[1] + dy * s, tgt[2] + dz * s],
        };
      }
      // offset が取れない場合は target だけ更新
      return { ...cur, target: tgt };
    }

    // orbit 形式（distance）
    if (Number.isFinite(Number(cur.distance))) {
      return { ...cur, target: tgt, distance: nextDist };
    }

    // どちらでもない場合は target だけ更新
    return { ...cur, target: tgt };
  }

  function startMicroCameraTransition(cleanSel) {
    if (!cameraTransition?.start) return;

    const cam = buildMicroCameraState(cleanSel);
    if (!cam) return;

    try {
      cameraTransition.start(cam);
    } catch (_e) {}
  }

  function buildMicroState(cleanSel) {
    // microController が microState を組めるならそれを使う
    try {
      const r =
        microController?.buildMicroState?.(cleanSel.uuid, cleanSel.kind) ??
        microController?.createMicroState?.(cleanSel.uuid, cleanSel.kind) ??
        microController?.enter?.(cleanSel.uuid, cleanSel.kind) ??
        microController?.focus?.(cleanSel.uuid, cleanSel.kind) ??
        null;
      if (r && typeof r === "object") {
        // {microState, cameraState} 形式も吸収
        return r.microState ?? r.state ?? r;
      }
    } catch (_e) {}

    // 最低限（normalizeMicro が補完できる形）
    return { uuid: cleanSel.uuid, kind: cleanSel.kind ?? null };
  }

  // micro→macro 復帰用に macro カメラ状態を保持
  let lastMacroCameraState =
    cameraEngine && typeof cameraEngine.getState === "function" ? cameraEngine.getState() : null;

  // set("micro", null) 等の救済：引数→selection→no-op
  function resolveMicroTargetUuid(inputUuid) {
    if (typeof inputUuid === "string") {
      const u = inputUuid.trim();
      if (u) return u;
    }

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
        typeof kind === "string" && kind.trim() ? kind.trim() : inferKind(targetUuid) ?? undefined;

      const clean = selectionController?.sanitize?.(targetUuid, k0);
      if (!clean) return prevMode;
      if (!canEnter(clean.uuid)) return prevMode;

      const cur = selectionController?.get?.();
      const isSameSelection =
        cur?.uuid === clean.uuid && (cur?.kind ?? null) === (clean.kind ?? null);

      // macro→micro 侵入時だけ macro カメラを保存
      if (prevMode !== "micro" && cameraEngine?.getState) {
        try {
          lastMacroCameraState = cameraEngine.getState();
        } catch (_e) {}
      }

      uiState.mode = "micro";

      // micro 遷移は selection を確定させる（hub loop が dirty を拾って commit する前提）
      selectionController?.select?.(clean.uuid, clean.kind);

      // microState（最小形）
      uiState.microState = buildMicroState(clean);

      // カメラ遷移（同フレーム中に合算された cameraDelta と干渉しにくいよう、遷移は 1 回だけ）
      // 同一 selection でも「macro→micro」や「別要素への focus」では再遷移する。
      if (prevMode !== "micro" || !isSameSelection) {
        startMicroCameraTransition(clean);
      }

      uiState._dirtyVisibleSet = true;
      return "micro";
    }

    // macro 側の no-op は「既に macro かつ microState が null」のときだけ
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

    // micro→macro のときだけカメラ復帰（失敗しても落とさない）
    if (prev === "micro" && cameraTransition?.start && lastMacroCameraState) {
      try {
        cameraTransition.start(lastMacroCameraState);
      } catch (_e) {}
    }

    // macro の selection ハイライトを同期（reselect しない）
    selectionController?.refreshHighlight?.();

    return next;
  }

  function exit() {
    return enterMacro();
  }

  function focus(uuid, kind) {
    // 仕様：focus(null/""/blank) は no-op
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
