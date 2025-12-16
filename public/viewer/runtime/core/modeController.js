// viewer/runtime/core/modeController.js

// mode（macro/meso/micro）と micro 侵入条件の優先ルールを管理する

const DEBUG_MODE = false; // デバッグしたいときだけ true
function debugMode(...args) {
  if (!DEBUG_MODE) return;
  console.log(...args);
}

const VALID_KIND = new Set(["points", "lines", "aux"]);

export function createModeController(
  uiState,
  _selectionController, // Phase2: 副作用専用（modeController からは触らん）
  cameraEngine,
  cameraTransition,
  _microController,
  _frameController,
  visibilityController,
  indices
) {
  // A-5: 正規の再計算ルート（core.recomputeVisibleSet を後から注入）
  let recomputeHandler = null;

  // macro ビューのカメラ状態を保持しておいて、micro から戻るときに lerp で戻す
  let lastMacroCameraState =
    cameraEngine && typeof cameraEngine.getState === "function"
      ? cameraEngine.getState()
      : null;

  function recompute(reason = "mode") {
    if (typeof recomputeHandler === "function") {
      return recomputeHandler({ reason });
    }
    return uiState.visibleSet;
  }

  function getMode() {
    const m = uiState?.mode;
    return (m === "macro" || m === "meso" || m === "micro") ? m : "macro";
  }

  function getCurrentSelectionFromUiState() {
    const s = uiState?.selection;
    if (s && typeof s === "object") {
      const uuid = typeof s.uuid === "string" ? s.uuid : null;
      const kind = typeof s.kind === "string" ? s.kind : null;
      return { uuid, kind };
    }
    return { uuid: null, kind: null };
  }

  function inferKind(uuid) {
    if (!uuid) return null;
    // indices は structIndex 系を想定（getKind / uuidToKind など）
    if (indices?.getKind && typeof indices.getKind === "function") {
      try {
        const k = indices.getKind(uuid);
        return (k === "points" || k === "lines" || k === "aux") ? k : null;
      } catch (_e) {}
    }
    const m = indices?.uuidToKind;
    if (m && typeof m.get === "function") {
      const k = m.get(uuid);
      return (k === "points" || k === "lines" || k === "aux") ? k : null;
    }
    if (m && typeof m === "object") {
      const k = m[uuid];
      return (k === "points" || k === "lines" || k === "aux") ? k : null;
    }
    return null;
  }

  function setSelectionRequest(uuid) {
    // Phase2: selection の“確定”は recomputeVisibleSet に任せる
    // ここは「リクエストを書く」だけ（副作用なし）
    const u = (typeof uuid === "string" && uuid) ? uuid : null;
    uiState.selection = u ? { uuid: u, kind: inferKind(u) } : { uuid: null, kind: null };  }

  function isVisible(uuid) {
    if (
      visibilityController &&
      typeof visibilityController.isVisible === "function"
    ) {
      return visibilityController.isVisible(uuid);
    }
    // Phase2: visibleSet の型が揺れても安全側（未設定は true）
    return true;
  }

  function canEnter(uuid) {
    if (!uuid) return false;
    if (uiState?.runtime?.isFramePlaying) return false;
    if (uiState?.runtime?.isCameraAuto) return false;
    return isVisible(uuid);
  }

  // ------------------------------------------------------------
  // micro 用カメラプリセット（microState は derived：ここでは mutate しない）
  // ------------------------------------------------------------

  function computeMicroCameraPreset(currentCamState, microState) {
    if (!microState) return null;

    // 重要：基準distanceは「いまのdistance」やなく「macroを出る直前のdistance」を優先
    const macroBaseDist =
      Number.isFinite(lastMacroCameraState?.distance) ? Number(lastMacroCameraState.distance) : null;

    const toVec3 = (v) => {
      if (!v) return null;
      if (Array.isArray(v)) return { x: Number(v[0])||0, y: Number(v[1])||0, z: Number(v[2])||0 };
      if (typeof v === "object") return { x: Number(v.x)||0, y: Number(v.y)||0, z: Number(v.z)||0 };
      return null;
    };

    const current = currentCamState || {};

    // structIndex から “点の位置” を拾う（実装揺れ吸収）
    const getPointPos = (uuid) => {
      if (!uuid) return null;
      const maps = [
        indices?.pointsByUuid, indices?.pointByUuid, indices?.pointsMap,
        indices?.uuidToPoint, indices?.uuidToPoints
      ];
      for (const m of maps) {
        if (m && typeof m.get === "function") {
          const p = m.get(uuid);
          const pos = toVec3(p?.position || p?.pos || p?.xyz || p?.coord);
          if (pos) return pos;
        }
        if (m && typeof m === "object") {
          const p = m[uuid];
          const pos = toVec3(p?.position || p?.pos || p?.xyz || p?.coord);
          if (pos) return pos;
        }
      }
      return null;
    };

    // line の場合は端点の中点を狙う（取れんかったら null）
    const getLineMid = (uuid) => {
      const maps = [indices?.linesByUuid, indices?.lineByUuid, indices?.linesMap, indices?.uuidToLine];
      let line = null;
      for (const m of maps) {
        if (!m) continue;
        line = (typeof m.get === "function") ? m.get(uuid) : m[uuid];
        if (line) break;
      }
      if (!line) return null;
      const pickRefUuid = (v) => {
        if (typeof v === "string") return v.trim() || null;
        if (v && typeof v === "object") {
          if (typeof v.ref === "string") return v.ref.trim() || null;
          if (v.ref && typeof v.ref === "object") {
            const ru = v.ref.uuid ?? v.ref.point_uuid ?? v.ref.id ?? null;
            return (typeof ru === "string" ? (ru.trim()||null) : null);
          }
          const cand = v.uuid ?? v.point_uuid ?? v.id ?? v.from_uuid ?? v.to_uuid ?? null;
          return (typeof cand === "string" ? (cand.trim()||null) : null);
        }
        return null;
      };
      const aRaw = line?.appearance?.end_a ?? line?.end_a ?? line?.a ?? line?.from ?? null;
      const bRaw = line?.appearance?.end_b ?? line?.end_b ?? line?.b ?? line?.to   ?? null;
      const au = pickRefUuid(aRaw);
      const bu = pickRefUuid(bRaw);
      const ap = getPointPos(au);
      const bp = getPointPos(bu);
      if (!ap || !bp) return null;
      return { x: (ap.x+bp.x)/2, y: (ap.y+bp.y)/2, z: (ap.z+bp.z)/2 };
    };

    // microState.focusUuid が stale になりがちやから、selection を最優先
    const sel = getCurrentSelectionFromUiState();
    const focusUuid = sel.uuid ?? microState.focusUuid ?? null;
    const kRaw = microState.kind ?? sel.kind ?? inferKind(focusUuid);
    const kind = VALID_KIND.has(kRaw) ? kRaw : null;

    // 1) microState.focusPosition（derived）をまず信用
    let target = Array.isArray(microState.focusPosition) ? toVec3(microState.focusPosition) : null;


    // 2) 無い場合だけ indices から推定（points→位置, lines→中点）
    if (!target) {
      if (kind === "points") target = getPointPos(focusUuid);
      else if (kind === "lines") target = getLineMid(focusUuid);
    }

    // 3) それでも無理なら現状 target を維持（ズームだけでも動かす）
    if (!target) target = toVec3(current.target) || { x: 0, y: 0, z: 0 };

    // microState は derived なので、ここでは絶対に mutate しない


    const fov = typeof current.fov === "number" ? current.fov : 50;
    // ここが肝：連打で 0.6 が積み上がらんように「macro基準」に寄せる
    const baseDistance =
      macroBaseDist != null
        ? macroBaseDist
        : (typeof current.distance === "number" ? current.distance : 4);

    let distance = baseDistance;

    const bounds = microState.localBounds;
    if (bounds && Array.isArray(bounds.size)) {
      const [sx = 0, sy = 0, sz = 0] = bounds.size;
      const maxSize = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
      if (maxSize > 0) {
        const radius = maxSize * 0.5;
        const fovRad = (Math.PI * fov) / 180;
        const clampedFov = Math.min(Math.max(fovRad, 0.2), Math.PI - 0.2);
        distance = (radius / Math.tan(clampedFov / 2)) * 1.1; // ちょいマージン
      } else {
        distance = baseDistance * 0.6;
      }
    } else {
      // bounds無し（points等）でも連打で暴走せんよう baseDistance 起点に固定
      distance = baseDistance * 0.6;
    }

    return { target, distance };
  }

  // --- macro への共通遷移処理 ---
  function enterMacro() {
    debugMode("[mode] enter macro");

    uiState.mode = "macro";

    // Phase2: visible/selection/micro の確定は recomputeVisibleSet のみ
    recompute("mode.enterMacro");

    // macro に戻るときのカメラ lerp
    if (
      cameraTransition &&
      typeof cameraTransition.start === "function" &&
      lastMacroCameraState
    ) {
      try {
        cameraTransition.start(lastMacroCameraState);
      } catch (e) {
        console.warn("[mode] cameraTransition.start(macro) failed:", e);
      }
    }

    return uiState.mode;
  }

  function set(mode, uuid) {
    const prevMode = getMode();

    // --- 明示的に macro を指定された場合 ---
    if (mode === "macro") {
      return enterMacro();
    }

    // micro / meso への遷移
    const currentSelection = getCurrentSelectionFromUiState();
    const targetUuid = uuid ?? currentSelection.uuid ?? null;

    if (!targetUuid || !canEnter(targetUuid)) {
      debugMode("[mode] cannot enter, fallback macro", {
        requested: mode,
        targetUuid,
      });
      return enterMacro();
    }

    if (mode === "meso" || mode === "micro") {
      // macro から出るときだけ「macro ビューのカメラ状態」を保存
      if (
        prevMode === "macro" &&
        cameraEngine &&
        typeof cameraEngine.getState === "function"
      ) {
        try {
          lastMacroCameraState = cameraEngine.getState();
        } catch (e) {
          console.warn("[mode] cameraEngine.getState() failed:", e);
        }
      }

      // 先に mode と selection “要求”を書いて、確定は recompute に任せる
      uiState.mode = mode;

      setSelectionRequest(targetUuid);

      // Phase2: ここで visible/selection/micro を “確定” させる
      recompute("mode.enterSub");

      // selection が落ちた（= hidden / filter-off / 無効）なら入らへん
      if (!uiState?.selection?.uuid) {
        return enterMacro();
      }

      // micro 侵入時のカメラ preset（recompute 後の uiState.microState を使う）
      if (mode === "micro") {
        const microState = uiState.microState; // recomputeVisibleSet が selection と整合済み


        // microState が作れないなら macro へ戻す（安全側）
        if (!microState || microState.focusUuid == null) {
          console.warn("[mode] microState missing after recompute, fallback macro", { targetUuid });
          return enterMacro();
        }


        // カメラ遷移（focusPosition が無くても computeMicroCameraPreset 側でフォールバックする想定）
        if (
          cameraTransition && typeof cameraTransition.start === "function" &&
          cameraEngine && typeof cameraEngine.getState === "function"
        ) {
          try {
            const camState = cameraEngine.getState();
            const preset = computeMicroCameraPreset(camState, microState);
            if (preset) {
              console.log("[mode] micro preset", {
              sel: uiState?.selection,
              microFocus: uiState?.microState?.focusUuid,
              preset: preset,
            });
              cameraTransition.start({ ...(camState || {}), ...preset, target: preset.target });
            }
          } catch (e) {
            console.warn("[mode] cameraTransition.start(micro) failed:", e);
          }
        }
      }
    }

    return uiState.mode;
  }

  function get() {
    return getMode();
  }

  function exit() {
    // どこからでも macro に戻る
    return enterMacro();
  }

  function focus(uuid) {
    // micro フォーカスショートカット
    return set("micro", uuid);
  }

  return {
    set,
    get,
    canEnter,
    exit,
    focus,
    // A-5: core.recomputeVisibleSet を注入
    setRecomputeHandler(fn) {
      recomputeHandler = typeof fn === "function" ? fn : null;
    },
  };
}
