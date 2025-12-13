// viewer/runtime/core/modeController.js

// mode（macro/meso/micro）と micro 侵入条件の優先ルールを管理する

const DEBUG_MODE = false; // デバッグしたいときだけ true
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

  // micro 用カメラプリセット
  function computeMicroCameraPreset(currentCamState, microState) {
    if (!microState || !Array.isArray(microState.focusPosition)) return null;

    const [fx = 0, fy = 0, fz = 0] = microState.focusPosition;
    const target = { x: fx, y: fy, z: fz };

    const current = currentCamState || {};
    const fov = typeof current.fov === "number" ? current.fov : 50;
    const baseDistance =
      typeof current.distance === "number" ? current.distance : 4;

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
      distance = baseDistance * 0.6;
    }

    return { target, distance };
  }
// --- macro への共通遷移処理 ---
function enterMacro() {
  debugMode("[mode] enter macro");

  uiState.mode = "macro";

  // Phase2: microState は normalizeMicro に任せる（ここで確定しない）
  recompute("mode");

  // micro の副作用（オーバレイ等）は refresh に寄せる
  if (microController && typeof microController.refresh === "function") {
    try { microController.refresh(); } catch (e) {
      console.warn("[mode] microController.refresh() failed:", e);
    }
  }

  // いまの selection を使って macro 用ハイライトを再適用
  if (
    selectionController &&
    typeof selectionController.get === "function" &&
    typeof selectionController.select === "function"
  ) {
    const current = selectionController.get();
    if (current && current.uuid) {
      selectionController.select(current.uuid, current.kind);
    } else if (typeof selectionController.clear === "function") {
      selectionController.clear();
    }
  }

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
  const prevMode = uiState.mode;

  // --- 明示的に macro を指定された場合 ---
  if (mode === "macro") {
    return enterMacro();
  }

  // micro / meso への遷移
  const currentSelection = selectionController?.get?.();
  const targetUuid = uuid ?? currentSelection?.uuid ?? null;

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

    // 先に mode を切り替えてから select
    uiState.mode = mode;

    if (
      selectionController &&
      typeof selectionController.select === "function"
    ) {
      const sel = selectionController.select(targetUuid);
      if (!sel || !sel.uuid) {
        // sanitize で弾かれたら入れない
        return enterMacro();
      }
    }
    // Phase2: ここで visible/selection/micro を “確定” させる
    recompute("mode");

    // micro の副作用は refresh へ
    if (microController && typeof microController.refresh === "function") {
      try { microController.refresh(); } catch (e) {
        console.warn("[mode] microController.refresh() failed:", e);
      }
    }

    // micro 侵入時のカメラ preset（recompute 後の uiState.microState を使う）
    if (mode === "micro") {
      const microState = uiState.microState;
      const hasFocusPos = Array.isArray(microState?.focusPosition);

      // microState が作れないなら macro へ戻す（安全側）
      if (!microState || microState.focusUuid == null) {
        console.warn("[mode] microState missing after recompute, fallback macro", { targetUuid });
        return enterMacro();
      }

      if (
        hasFocusPos &&
        cameraTransition &&
        typeof cameraTransition.start === "function" &&
        cameraEngine &&
        typeof cameraEngine.getState === "function"
      ) {
        try {
          const camState = cameraEngine.getState();
          const preset = computeMicroCameraPreset(camState, microState);
          if (preset) cameraTransition.start(preset);
        } catch (e) {
          console.warn("[mode] cameraTransition.start(micro) failed:", e);
        }
      }
    }
  }

  return uiState.mode;
}


  function get() {
    return uiState.mode;
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
