// runtime/viewerHub.js
// NOTE: viewerHub loop uses requestAnimationFrame.
// In Node (no rAF), start() becomes a no-op for the render loop (contract for hub-noop test).

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_HUB = false;
let debugFrameCount = 0;
function debugHub(...args) {
  if (!DEBUG_HUB) return;
  // warning にしておけばレベル設定に関係なくまず見える
  console.warn(...args);
}

/**
 * viewerHub は runtime と renderer を束ねるハブ。
 *
 * - 外部から createViewerHub を直接呼び出さないこと。s
 * - 必ず bootstrapViewer* から生成された hub を使う。
 */

  // --- pick debug（必要なときだけ true）
  const DEBUG_PICK = true;

  function _has(setLike, uuid) {
    if (!setLike || !uuid) return false;
    try {
      return typeof setLike.has === "function" ? !!setLike.has(uuid) : false;
    } catch (_e) {
      return false;
    }
  }

// NOTE: fcStartPlayback は createViewerHub 内にだけ置く（frameController のスコープを保証）


  // visibleSet の形揺れ吸収:
  // - Set<string>
  // - {points:SetLike, lines:SetLike, aux:SetLike}
  // - SetLike(has)
  function _isHitVisible(uiVisibleSet, hit) {
    const uuid = hit?.uuid;
    const kind = hit?.kind;
    if (!uuid) return true;
    if (!uiVisibleSet) return true; // 無いなら落とさん（初期化順/互換の安全弁）

    if (uiVisibleSet instanceof Set) return uiVisibleSet.has(uuid);
    if (typeof uiVisibleSet.has === "function") return !!uiVisibleSet.has(uuid);

    if (typeof uiVisibleSet === "object") {
      if (kind === "points" || kind === "lines" || kind === "aux") {
        return _has(uiVisibleSet[kind], uuid) || _has(uiVisibleSet.points, uuid) || _has(uiVisibleSet.lines, uuid) || _has(uiVisibleSet.aux, uuid);
      }
      return _has(uiVisibleSet.points, uuid) || _has(uiVisibleSet.lines, uuid) || _has(uiVisibleSet.aux, uuid);
    }
    return true;
  }

export function createViewerHub({ core, renderer }) {
  let animationId = null;
  let lastTime = null;
  let running = false; 
  let disposed = false;

  const modeController = core.modeController || core.mode;
  const cameraEngine = core.cameraEngine;

  const frameController = core.frameController || core.frame;
  const visibilityController = core.visibilityController;

  const settingsController = core.viewerSettingsController || null;
  const _unsubs = [];

  const hasRAF = typeof globalThis?.requestAnimationFrame === "function";
  const raf = hasRAF ? globalThis.requestAnimationFrame.bind(globalThis) : null;
  const caf =
    typeof globalThis?.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : null;

  // Phase2: viewerSettingsController → cameraEngine/uiState/renderer への bridge
  if (settingsController && renderer) {
    const off = attachViewerSettingsBridge(core, renderer);
    if (typeof off === "function") _unsubs.push(off);
  }

  // ------- frameController 互換ラッパ -------

  function fcGetRange() {
    if (!frameController) return { min: 0, max: 0 };

    if (typeof frameController.getRange === "function") {
      return frameController.getRange();
    }
    if (typeof frameController.range === "function") {
      return frameController.range();
    }
    return { min: 0, max: 0 };
  }

  function fcGetActive() {
    if (!frameController) return 0;

    if (typeof frameController.getActive === "function") {
      return frameController.getActive();
    }
    if (typeof frameController.get === "function") {
      return frameController.get();
    }
    return 0;
  }

  function fcSetActive(n) {
    if (!frameController) return;

    if (typeof frameController.setActive === "function") {
      return frameController.setActive(n);
    }
    if (typeof frameController.set === "function") {
      return frameController.set(n);
    }
  }

  function fcStep(delta) {
    if (!frameController) return;

    if (typeof frameController.step === "function") {
      return frameController.step(delta);
    }

    // step が無い場合は setActive + range で代用
    const range = fcGetRange();
    const cur = fcGetActive();
    const next = cur + (delta || 0);
    const clamped = Math.max(range.min, Math.min(range.max, next));
    return fcSetActive(clamped);
  }

  function fcStartPlayback(opts) {
    if (typeof frameController.startPlayback === "function") {
      return frameController.startPlayback(opts);
    }
    if (typeof frameController.play === "function") {
      return frameController.play(opts);
    }
  }

  function fcStopPlayback() {
    if (!frameController) return;
    if (typeof frameController.stopPlayback === "function") {
      return frameController.stopPlayback();
    }
    if (typeof frameController.stop === "function") {
      return frameController.stop();
    }
  }

  // --- viewer 設定 ---
  // NOTE:
  // - worldAxesVisible は「hub管理」で固定（viewerSettingsController の管轄外）。
  // - worldAxes の実体（AxesHelper）は renderer が持つが、可視/不可視の唯一の入口は
  //   hub.viewerSettings.setWorldAxesVisible -> renderer.setWorldAxesVisible に限定する。
  // - renderer.applyViewerSettings() では worldAxes を扱わない（= 二重管理禁止）。

  const viewerSettingsState = {
    // ワールド座標軸だけは当面 hub 管理でOK（Phase2の対象外にしてある）
   worldAxesVisible: false,
    worldAxesListeners: [],
  };


  const viewerSettings = {
    // --------------------------------------------------------
    // 既存: ワールド座標軸の表示 ON/OFF
    // --------------------------------------------------------
    setWorldAxesVisible(flag) {
      if (!assertAlive()) return;
      const visible = !!flag;
      if (visible === viewerSettingsState.worldAxesVisible) return;

      viewerSettingsState.worldAxesVisible = visible;

      if (
        renderer &&
        typeof renderer.setWorldAxesVisible === "function"
      ) {
        renderer.setWorldAxesVisible(visible);
      }

      // UI へ通知
      viewerSettingsState.worldAxesListeners.forEach((fn) => {
        try {
          fn(visible);
        } catch (e) {
          debugHub("[hub.viewerSettings] listener error", e);
        }
      });
    },

    toggleWorldAxes() {
      this.setWorldAxesVisible(!viewerSettingsState.worldAxesVisible);
    },

    getWorldAxesVisible() {
      return viewerSettingsState.worldAxesVisible;
    },

    // listener: (visible:boolean) => void
    onWorldAxesChanged(listener) {
      if (!assertAlive()) return () => {};
      if (typeof listener === "function") {
          viewerSettingsState.worldAxesListeners.push(listener);
          try { listener(viewerSettingsState.worldAxesVisible); } catch (_e) {}
        return () => {
          const i = viewerSettingsState.worldAxesListeners.indexOf(listener);
          if (i >= 0) viewerSettingsState.worldAxesListeners.splice(i, 1);
        };
      }
      return () => {};
    },

    // --------------------------------------------------------
    // 追加: FOV (1..179)
    // --------------------------------------------------------
    setFov(v) {
      if (!assertAlive()) return;
      const n = Number(v);
      if (!Number.isFinite(n)) return;
      const clamped = Math.max(1, Math.min(179, n));
      settingsController?.setFov?.(clamped);
    },

    getFov() {
      return settingsController?.getFov?.() ?? 50;
    },

    onFovChanged(listener) {
      if (!assertAlive()) return () => {};
      return settingsController?.onFovChanged?.(listener) ?? (() => {});
    },

    // --------------------------------------------------------
    // 追加: lineWidthMode の切り替え ("auto" | "fixed" | "adaptive")
    // --------------------------------------------------------
    setLineWidthMode(mode) {
      if (!assertAlive()) return;
      if (!settingsController || typeof settingsController.setLineWidthMode !== "function") return;
      settingsController.setLineWidthMode(mode);
    },

    getLineWidthMode() {
      return settingsController && typeof settingsController["getLineWidthMode"] === "function"
        ? settingsController["getLineWidthMode"]()
        : "auto";
    },

    onLineWidthModeChanged(listener) {
      if (!assertAlive()) return () => {};
      return settingsController && typeof settingsController["onLineWidthModeChanged"] === "function"
        ? settingsController["onLineWidthModeChanged"](listener)
        : () => {};
    },

    // --------------------------------------------------------
    // 追加: microFX profile の切り替え ("weak" | "normal" | "strong")
    // --------------------------------------------------------
    setMicroFXProfile(profile) {
      if (!assertAlive()) return;
      if (!settingsController || typeof settingsController.setMicroFXProfile !== "function") return;
      settingsController.setMicroFXProfile(profile);
    },

    getMicroFXProfile() {
      return settingsController && typeof settingsController["getMicroFXProfile"] === "function"
        ? settingsController["getMicroFXProfile"]()
        : "normal";
    },

    onMicroFXProfileChanged(listener) {
      if (!assertAlive()) return () => {};
      return settingsController && typeof settingsController["onMicroFXProfileChanged"] === "function"
        ? settingsController["onMicroFXProfileChanged"](listener)
        : () => {};
    },
  };

  const cameraTransition = core.cameraTransition || null;

  // ------------------------------------------------------------
  // uiState 変更後の “統一コミット” (visibleSet/selection/microState の確定)
  // ------------------------------------------------------------
  function recomputeVisibleSet(reason) {
    if (typeof core.recomputeVisibleSet === "function") {
      const payload =
        typeof reason === "string" ? { reason } :
        (reason && typeof reason === "object") ? reason :
        { reason: "unknown" };
      return core.recomputeVisibleSet(payload);
    }
    console.warn("[viewerHub] core.recomputeVisibleSet is missing (Phase2 contract broken)");
    return core.uiState?.visibleSet ?? null;
  }

  // viewerHub.js 内
  let _committing = false;
  let _deferCommit = false;

  // ------------------------------------------------------------
  // commit scheduling: commitVisibleSet is triggered only by hub loop
  // ------------------------------------------------------------
  const _pendingCommitReasons = [];

  function _pushCommitReason(reason) {
    if (typeof reason === "string" && reason) _pendingCommitReasons.push(reason);
  }
 
  function consumeCommitReason(fallback = "hub.loop") {
    if (_pendingCommitReasons.length === 0) return fallback;
    const seen = new Set();
    const uniq = [];
    for (const r of _pendingCommitReasons) {
      if (!r || typeof r !== "string") continue;
      if (seen.has(r)) continue;
      seen.add(r);
      uniq.push(r);
    }
    _pendingCommitReasons.length = 0;
    if (uniq.length === 0) return fallback;
    if (uniq.length === 1) return uniq[0];
    return `${uniq[0]}(+${uniq.length - 1})`;
  }

  function requestCommit(reason = "requestCommit") {
    const uiState = core.uiState;
    if (!uiState) return null;

    uiState._dirtyVisibleSet = true;
    _pushCommitReason(reason);

    // Node/no-rAF: loopが回らんので、defer中じゃなければここで確定
    if (!raf) {
      if (!_deferCommit) markDirty(consumeCommitReason(reason));
      return core.uiState?.visibleSet ?? null;
    }

    return null;
  }

  function commit(reason, mutator) {
    const ui = core.uiState;
    if (!ui) {
      throw new Error("[hub] core.uiState is required");
    }

    ui._dirtyVisibleSet = true;
    _pushCommitReason(reason);

    // re-entrancy: commit 中に commit されても 1回に畳む
    if (_committing) return ui.visibleSet;

    _committing = true;
    try {
      mutator?.(ui);
      // NOTE: markDirty() is triggered only by hub loop.
      if (!raf) {
        if (!_deferCommit) markDirty(consumeCommitReason(reason));
        return core.uiState?.visibleSet ?? null;
      }
      return ui.visibleSet;
    } finally {
      _committing = false;
    }
  }

  function markDirty(reason) {
    const ui = core.uiState;
    if (!ui) return null;
    const vs = recomputeVisibleSet(reason);
    ui.visibleSet = vs;
    ui._dirtyVisibleSet = false;
    return vs;
  }

  function attachViewerSettingsBridge(core, renderer) {
    const off = [];
    const vs = core.viewerSettingsController;
    if (!vs) return () => {};

    const clampFov = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.max(1, Math.min(179, n));
    };

    if (typeof vs.onFovChanged === "function") {
      const un = vs.onFovChanged((fov) => {
        const clamped = clampFov(fov);
        if (clamped == null) return;

        // mirror
        if (core.uiState?.cameraState) core.uiState.cameraState.fov = clamped;

        // CameraEngine 命名ゆれ吸収
        const ce = core.cameraEngine;
        if (ce?.setFov) ce.setFov(clamped);
        else if (ce?.setFOV) ce.setFOV(clamped);
        else if (ce?.setState) ce.setState({ fov: clamped });

        // renderer 側にも反映したいなら（任意）
        if (renderer?.setFov) renderer.setFov(clamped);
        else if (renderer?.setCameraParams) renderer.setCameraParams({ fov: clamped });
      });
      if (typeof un === "function") off.push(un);
    }

    if (typeof vs.onLineWidthModeChanged === "function") {
      const un = vs.onLineWidthModeChanged((mode) => {
        renderer?.setLineWidthMode?.(mode);
      });
      if (typeof un === "function") off.push(un);
    }

    if (typeof vs.onMicroFXProfileChanged === "function") {
      const un = vs.onMicroFXProfileChanged((profile) => {
        renderer?.setMicroFXProfile?.(profile);
      });
      if (typeof un === "function") off.push(un);
    }

    return () => off.forEach((fn) => fn && fn());
  }

  function isPickVisible(hit) {
    if (!hit) return false;

    const uuid =
      hit.uuid ?? hit.id ?? hit.ref_uuid ?? hit.target_uuid ??
      hit?.object?.userData?.uuid ?? hit?.object?.uuid ?? null;

    const kind =
      hit.kind ?? hit.type ??
      hit?.object?.userData?.kind ?? hit?.object?.userData?.type ?? null;

    // 1) visibilityController があれば最優先（ここが正）
    if (visibilityController && typeof visibilityController.isVisible === "function") {
      if (uuid) {
        // 形ゆれ吸収：isVisible(uuid, kind) / isVisible(uuid) / isVisible(kind, uuid)
        try { const r = visibilityController.isVisible(uuid, kind); if (typeof r === "boolean") return r; } catch {}
        try { const r = visibilityController.isVisible(uuid); if (typeof r === "boolean") return r; } catch {}
        try { const r = visibilityController.isVisible(kind, uuid); if (typeof r === "boolean") return r; } catch {}
      }
      // hit 直渡し実装も吸収
      try { const r = visibilityController.isVisible(hit); if (typeof r === "boolean") return r; } catch {}
      // boolean が取れんかったら visibleSet fallback へ
    }

    // 2) fallback: uiState.visibleSet で弾く（形揺れは _isHitVisible が吸収）
    const visibleSet = core?.uiState?.visibleSet ?? null;
    return _isHitVisible(visibleSet, { uuid, kind });
  }




  const hubState = {
    committing: false,
    lastCommittedFrame: null,
  };



// ------------------------------------------------------------
// Command queue (UI -> hub transaction boundary)
// ------------------------------------------------------------
const commandQueue = [];

// UI が “今この瞬間に” hub/core を動かさず、次フレームで確定させる入口。
// - ここに積んだコマンドは render loop 冒頭でまとめて適用される。
function enqueueCommand(cmd) {
  if (!cmd || typeof cmd !== "object") return false;
  if (disposed) return false;
  commandQueue.push(cmd);

  // Node/no-rAF: render loop が無いのでここで消化して確定する
  if (!raf) {
    flushCommandQueue();
    if (core?.uiState?._dirtyVisibleSet) {
      markDirty(consumeCommitReason("commands.flush"));
    }
  }

  return true;
}

// ------------------------------------------------------------
// Core ops (executed at hub loop boundary)
// ------------------------------------------------------------
function opVisibleSetRequestRecompute(reason) {
  requestCommit(reason ?? "visibleSet.requestRecompute");
}

function opCameraStopAutoOrbit() {
  core?.camera?.stopAutoOrbit?.();
  requestCommit("camera.stopAutoOrbit");
}

function opCameraStartAutoOrbit(opts) {
  core?.camera?.startAutoOrbit?.(opts || {});
  requestCommit("camera.startAutoOrbit");
}

function opCameraUpdateAutoOrbitSettings(opts) {
  core?.camera?.updateAutoOrbitSettings?.(opts || {});
}

function opCameraSetViewPreset(index, opts) {
  const cam = core?.camera;
  if (!cam?.setViewPreset) return;

  const n = Math.floor(Number(index));
  if (!Number.isFinite(n)) return;

  cam.setViewPreset(n, opts || {});

  const resolved = cam.getViewPresetIndex?.() ?? n;
  if (core?.uiState) core.uiState.view_preset_index = resolved;

  requestCommit("camera.setViewPreset");
}

function opCameraSetViewByName(name) {
  if (!name) return;
  core?.camera?.setViewByName?.(name);
  requestCommit("camera.setViewByName");
}

function opCameraFocusOn(uuid, kind) {
  if (!uuid) return;
  core?.camera?.stopAutoOrbit?.();
  if (modeController?.focus) modeController.focus(uuid, kind);
  requestCommit("camera.focusOn.uuid");
}

function opCameraFocusOnPosition(position, opts) {
  const cam = core?.camera;
  const ce = core?.cameraEngine;
  if (!cam || typeof cam.setState !== "function") return;
  if (!ce || typeof ce.computeFocusState !== "function") return;

  if (!Array.isArray(position) || position.length < 3) return;
  const p3 = [Number(position[0]), Number(position[1]), Number(position[2])];
  if (!p3.every(Number.isFinite)) return;

  const o = opts && typeof opts === "object" ? opts : {};
  const mergedOpts = {
    mode: "approach",
    distanceFactor: 0.4,
    minDistance: 0.8,
    maxDistance: 8,
    ...o,
  };

  const next = ce.computeFocusState(p3, mergedOpts);
  if (next) cam.setState(next);

  // visibleSet recompute is unnecessary here; keep only the reason.
  _pushCommitReason("camera.focusOn.position");
}

function opFrameStep(delta) {
  fcStep(delta || 0);
  requestCommit("frame.step");
}

function opFrameNext() {
  fcStep(+1);
  requestCommit("frame.next");
}

function opFramePrev() {
  fcStep(-1);
  requestCommit("frame.prev");
}

function opFrameStartPlayback(opts) {
  const result = fcStartPlayback(opts);

  // AutoOrbit と排他
  core?.camera?.stopAutoOrbit?.();

  if (core.uiState) {
    // 再生開始時は macro に戻して micro 系リセット
    if (modeController && typeof modeController.exit === "function") {
      modeController.exit();
    } else if (modeController && typeof modeController.set === "function") {
      modeController.set("macro");
    } else {
      core.uiState.mode = "macro";
    }

    if (core.uiState.microFocus) {
      core.uiState.microFocus = { uuid: null, kind: null };
    }
    if (core.uiState.focus) {
      core.uiState.focus = { active: false, uuid: null };
    }
  }

  requestCommit("frame.startPlayback");
  return result;
}

function opFrameStopPlayback() {
  const result = fcStopPlayback();
  requestCommit("frame.stopPlayback");
  return result;
}

function opModeSet(mode, focusUuid, kind) {
  if (!modeController?.set) return null;
  const nextMode = modeController.set(mode, focusUuid, kind);
  requestCommit("mode.set");
  return nextMode;
}

function opModeExit() {
  const r = modeController?.exit?.();
  requestCommit("mode.exit");
  return r;
}

function opModeFocus(uuid, kind) {
  core?.camera?.stopAutoOrbit?.();
  const nextMode = modeController?.focus?.(uuid, kind);
  requestCommit("mode.focus");
  return nextMode;
}

function opMicroEnter(uuid, kind) {
  core?.camera?.stopAutoOrbit?.();
  const r = modeController?.set?.("micro", uuid, kind);
  requestCommit("micro.enter");
  return r;
}

function opMicroExit() {
  const r =
    modeController && typeof modeController.exit === "function"
      ? modeController.exit()
      : modeController?.set?.("macro");
  requestCommit("micro.exit");
  return r;
}

function opSelectionSelect(uuid, kind) {
  if (!uuid) return null;
  if (!core.selectionController) {
    console.warn("[hub.selection] selectionController not available");
    return null;
  }
  core.selectionController.select(uuid, kind);
  requestCommit("selection.select");
  const committed = core.uiState?.selection;
  return committed && committed.uuid ? { uuid: committed.uuid } : null;
}

function opSelectionClear() {
  if (!core.selectionController) {
    console.warn("[hub.selection] selectionController not available");
    return null;
  }
  core.selectionController.clear();
  requestCommit("selection.clear");
  return null;
}

function opFiltersSetTypeEnabled(kind, enabled) {
  const on = !!enabled;
  if (visibilityController && typeof visibilityController.setTypeFilter === "function") {
    visibilityController.setTypeFilter(kind, on);
  } else if (core.uiState && core.uiState.filters) {
    core.uiState.filters[kind] = on;
  }

  // canonical mirror
  if (core.uiState) {
    if (!core.uiState.filters || typeof core.uiState.filters !== "object") core.uiState.filters = {};
    if (!core.uiState.filters.types || typeof core.uiState.filters.types !== "object") core.uiState.filters.types = {};
    core.uiState.filters.types[kind] = on;
    core.uiState.filters[kind] = on;
  }

  requestCommit("filters.setTypeEnabled");
  return core.uiState?.visibleSet ?? null;
}

function applyCommand(cmd) {
  const t = cmd && cmd.type;
  if (!t) return;

  switch (t) {
    // ---- visibleSet ---------------------------------------------
    case "visibleSet.requestRecompute":
      opVisibleSetRequestRecompute(cmd.reason);
      return;

    // ---- camera -------------------------------------------------
    case "camera.stopAutoOrbit":
      opCameraStopAutoOrbit();
      return;
    case "camera.startAutoOrbit":
      opCameraStartAutoOrbit(cmd.opts);
      return;
    case "camera.updateAutoOrbitSettings":
      opCameraUpdateAutoOrbitSettings(cmd.opts);
      return;
    case "camera.setViewPreset":
      opCameraSetViewPreset(cmd.index, cmd.opts);
      return;
    case "camera.setViewByName":
      opCameraSetViewByName(cmd.name);
      return;
    case "camera.focusOn.position":
      opCameraFocusOnPosition(cmd.position, cmd.opts);
      return;
    case "camera.focusOn":
      opCameraFocusOn(cmd.uuid, cmd.kind);
      return;

    // ---- frame --------------------------------------------------
    case "frame.next":
      opFrameNext();
      return;
    case "frame.prev":
      opFramePrev();
      return;
    case "frame.step":
      opFrameStep(cmd.delta);
      return;
    case "frame.setActive":
      opFrameSetActive(cmd.frame);
      return;
    case "frame.startPlayback":
      opFrameStartPlayback(cmd.opts);
      return;
    case "frame.stopPlayback":
      opFrameStopPlayback();
      return;

    // ---- mode ---------------------------------------------------
    case "mode.set":
      opModeSet(cmd.mode, cmd.focusUuid, cmd.kind);
      return;
    case "mode.exit":
      opModeExit();
      return;
    case "mode.focus":
      opModeFocus(cmd.uuid, cmd.kind);
      return;

    // ---- micro --------------------------------------------------
    case "micro.enter":
      opMicroEnter(cmd.uuid, cmd.kind);
      return;
    case "micro.exit":
      opMicroExit();
      return;

    // ---- selection ---------------------------------------------
    case "selection.select":
      opSelectionSelect(cmd.uuid, cmd.kind);
      return;
    case "selection.clear":
      opSelectionClear();
      return;

    // ---- filters ------------------------------------------------
    case "filters.setTypeEnabled":
      opFiltersSetTypeEnabled(cmd.kind, cmd.enabled);
      return;

    default:
      return;
  }
}

function flushCommandQueue() {
  if (commandQueue.length === 0) return;

  // まとめて適用する間は commitVisibleSet を “延期” する
  _deferCommit = true;
  try {
    // 1フレーム内に積まれた分だけ適用（途中で増えてもこのフレームで全部処理）
    while (commandQueue.length > 0) {
      const cmd = commandQueue.shift();
      try {
        applyCommand(cmd);
      } catch (e) {
        console.warn("[hub] command failed:", cmd && cmd.type, e);
      }
    }
  } finally {
    _deferCommit = false;
  }

  // hub loop でまとめて commit する（ここでは recompute/commit しない）
  if (core?.uiState?._dirtyVisibleSet) {
    _pushCommitReason("commands.flush");
  }
}


  const renderFrame = (timestamp) => {
    // 0: guard
    if (disposed || !running) {
      animationId = null;
      return;
    }
    if (!cameraEngine || typeof cameraEngine.getState !== "function") {
      animationId = null;
      return;
    }


    // Apply queued UI commands at frame boundary
    flushCommandQueue();
    // ★ timestamp から dt(sec) を計算して cameraEngine.update(dt) へ
    if (typeof timestamp === "number") {
      if (lastTime === null) {
        lastTime = timestamp;
      }
      let dt = (timestamp - lastTime) / 1000;
      dt = Math.max(0, Math.min(dt, 0.2));
      lastTime = timestamp;

      if (typeof cameraEngine.update === "function") {
        cameraEngine.update(dt);
      }
      // Phase2: frame playback は updatePlayback(dt) が正
      if (frameController && typeof frameController.updatePlayback === "function") {
        const wasPlaying = !!core.uiState?.runtime?.isFramePlaying;
        frameController.updatePlayback(dt);
        const nowPlaying = !!core.uiState?.runtime?.isFramePlaying;
        const curAfter = fcGetActive();
        // フレームが動かずに「再生だけ止まった」場合は、ここで1回だけ正規ルートを踏む
        if (wasPlaying && !nowPlaying && curAfter === hubState.lastCommittedFrame) {
          if (core?.uiState?._dirtyVisibleSet) _pushCommitReason("playback.autoStop");
        }
      }
    }

    let camState = cameraEngine.getState();

    if (cameraTransition && cameraTransition.isActive()) {
      const transitioned = cameraTransition.update();
      if (transitioned) {
        camState = transitioned;
      }
    }

    const curFrame = fcGetActive();

    // frame changed → dirtyだけ立てる（commitはこのあと1回だけ）
    if (hubState.lastCommittedFrame == null) {
      hubState.lastCommittedFrame = curFrame;
    } else if (curFrame !== hubState.lastCommittedFrame) {
      if (core.uiState) core.uiState._dirtyVisibleSet = true;
      _pushCommitReason("frame.changed");
      hubState.lastCommittedFrame = curFrame;
    }

    // Commit (recomputeVisibleSet) only here: once per frame.
    if (core?.uiState?._dirtyVisibleSet) {
      markDirty(consumeCommitReason("hub.loop"));
    }

    debugHub("[hub] frame", debugFrameCount++, {
      cam: camState,
      visibleSet: core.uiState && core.uiState.visibleSet,
      selection: core.uiState && core.uiState.selection,
    });

    // --- microFX 有効条件 / OFF 条件（7.11 準拠） -----------------
    const ui = core.uiState || {};
    const uiViewerSettings = ui.viewerSettings || {};

    const microState = ui.mode === "micro" ? (ui.microState || null) : null;
    const visibleSet = ui.visibleSet;
    const selectionForHighlight =
      ui.mode === "macro" &&
      ui.microState == null &&
      ui.selection && ui.selection.uuid
        ? ui.selection
        : null;

    renderer?.updateCamera?.(camState);
    renderer?.applyFrame?.(visibleSet);
    renderer?.applyViewerSettings?.(uiViewerSettings);
    renderer?.applyMicroFX?.(microState, camState, visibleSet);
    if (renderer && typeof renderer.applySelection === "function") {
      renderer.applySelection(selectionForHighlight, camState, visibleSet);
    } else {
      renderer?.applySelectionHighlight?.(selectionForHighlight, camState, visibleSet);
    }
    renderer?.render?.(core);

    if (!disposed && running && raf) animationId = raf(renderFrame);
    else animationId = null;
  };
  
  function assertAlive() {
    return !disposed;
  }

  const hub = {
    enqueueCommand,
    // debug / introspection（外部UIは基本触らん想定）
    frameController,

    start() {
      if (disposed) return;
      if (running) return;

      if (typeof core.recomputeVisibleSet !== "function") {
        console.warn("[viewerHub] cannot start: core.recomputeVisibleSet missing");
        return;
      }

      running = true;
      lastTime = null;

      if (core.uiState && !core.uiState.runtime) core.uiState.runtime = {};
      requestCommit("hub.start");
      hubState.lastCommittedFrame = fcGetActive();

      if (raf) animationId = raf(renderFrame);
      else animationId = null; // Node では loop しない（hub-noop 対策）
    },

    stop() {
      if (disposed) return;
      if (!running) return;

      running = false;

      if (animationId !== null) {
        if (caf) caf(animationId);
        animationId = null;
      }

      lastTime = null;
    },

    dispose() {
      if (disposed) return;

      this.stop();

      disposed = true;
      hubState.lastCommittedFrame = null;
      while (_unsubs.length) {
        try {
          const off = _unsubs.pop();
          if (typeof off === "function") off();
        } catch (_e) {}
      }

      viewerSettingsState.worldAxesListeners.length = 0;

      try { renderer?.dispose?.(); } catch (_e) {}
      try { core?.dispose?.(); } catch (_e) {}
      try { settingsController?.dispose?.(); } catch (_e) {}
    },


    pickObjectAt(ndcX, ndcY) {
      if (!assertAlive()) return null;
      if (typeof renderer?.pickObjectAt !== "function") return null;

      const hit = renderer.pickObjectAt(ndcX, ndcY);
      if (!hit) {
        if (DEBUG_PICK) console.debug("[pick] no hit", { ndcX, ndcY });
        return null;
      }

      if (DEBUG_PICK) {
        const visibleSet = core?.uiState?.visibleSet;
        const ok = isPickVisible(hit);
        console.debug("[pick] hit", {
          ndcX, ndcY, hit, ok,
          visibleSetType: visibleSet?.constructor?.name || typeof visibleSet,
        });
      }

      // contract が要求してる形：必ず isPickVisible(hit) 経由で return
      return isPickVisible(hit) ? hit : null;
    },

    resize(w, h, dpr) {
      if (!assertAlive()) return;

      renderer?.resize?.(w, h, dpr);

      const st =
        (cameraEngine && typeof cameraEngine.getState === "function"
          ? cameraEngine.getState()
          : core.uiState?.cameraState) ?? null;

      if (st) renderer?.updateCamera?.(st);
    },

    viewerSettings,

    core: {
      frame: {
        // 単一フレーム指定
        setActive(n) {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.setActive", frame: n }); return null; }
          fcSetActive(n);
          return requestCommit("frame.setActive") ?? core.uiState?.visibleSet ?? null;
        },

        // 現在アクティブな frame 番号
        // → フレームスライダの現在値表示用
        getActive() {
          return fcGetActive();          
        },

        // 有効な frame 範囲 { min, max }
        // → スライダ下の min / max / 0 ラベル計算用
        getRange() {
          return fcGetRange();
        },

        // 仕様上の API（相対移動）
        step(delta) {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.step", delta }); return null; }
          fcStep(delta || 0);
          return requestCommit("frame.step") ?? core.uiState?.visibleSet ?? null;
        },

        // dev harness 用ショートカット
        next() {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.next" }); return null; }
          fcStep(+1);
          return requestCommit("frame.next") ?? core.uiState?.visibleSet ?? null;

        },

        prev() {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.prev" }); return null; }
          fcStep(-1);
          return requestCommit("frame.prev") ?? core.uiState?.visibleSet ?? null;
        },

        startPlayback(opts) {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.startPlayback", opts }); return null; }
          const result = fcStartPlayback(opts);

          // AutoOrbit と排他
          if (
            hub &&
            hub.core &&
            hub.core.camera &&
            typeof hub.core.camera.stopAutoOrbit === "function"
          ) {
            hub.core.camera.stopAutoOrbit();
          }

          if (core.uiState) {
            // 再生開始時は macro に戻して micro 系リセット
            if (
              modeController &&
              typeof modeController.exit === "function"
            ) {
              modeController.exit();
            } else if (
              modeController &&
              typeof modeController.set === "function"
            ) {
              modeController.set("macro");
            } else {
              core.uiState.mode = "macro";
            }

            if (core.uiState.microFocus) {
              core.uiState.microFocus = { uuid: null, kind: null };
            }
            if (core.uiState.focus) {
              core.uiState.focus = { active: false, uuid: null };
            }
          }

          requestCommit("frame.startPlayback");
          return result;
        },

      stopPlayback() {
        if (!assertAlive()) return null;
        if (raf) { enqueueCommand({ type: "frame.stopPlayback" }); return null; }
        const result = fcStopPlayback();

        requestCommit("frame.stopPlayback");
        return result;
      },
    },

      selection: {
        // uuid（と任意の kind）指定で selection を更新
        select: (uuid, kind) => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "selection.select", uuid, kind }); return null; }
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }

          core.selectionController.select(uuid, kind);
          requestCommit("selection.select");
          const committed = core.uiState?.selection;
          return committed && committed.uuid ? { uuid: committed.uuid } : null;
        },

        clear: () => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "selection.clear" }); return null; }
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }
          core.selectionController.clear();
          requestCommit("selection.clear");
          return null;
        },
        // 外向き API は { uuid } | null に固定
        get: () => {
          if (!assertAlive()) return null;
          const committed = core.uiState?.selection;
          return committed && committed.uuid ? { uuid: committed.uuid } : null;
        },
      },

      camera: {
        rotate: (dTheta, dPhi) => {
          if (!assertAlive()) return;
          core?.camera?.rotate?.(dTheta, dPhi);
        },

        pan: (dx, dy) => {
          if (!assertAlive()) return;
          core?.camera?.pan?.(dx, dy);
        },

        zoom: (delta) => {
          if (!assertAlive()) return;
          core?.camera?.zoom?.(delta);
        },

        reset: () => {
          if (!assertAlive()) return;
          core?.camera?.reset?.();
        },

        snapToAxis: (axis) => {
          if (!assertAlive()) return;
          core?.camera?.snapToAxis?.(axis);
        },

        // 位置 or uuid の統一API
        // - [x,y,z] => computeFocusState -> core.camera.setState（= autoOrbit停止が効く）
        // - uuid    => micro遷移（入る前に autoOrbit停止）
        focusOn: (target, opts = {}) => {
          if (!assertAlive()) return null;
          if (!target) return null;

          // 1) position([x,y,z])
          if (Array.isArray(target)) {
            const o = opts && typeof opts === "object" ? opts : {};
            const mergedOpts = {
              mode: "approach",
              distanceFactor: 0.4,
              minDistance: 0.8,
              maxDistance: 8,
              ...o,
            };

            if (raf) {
              enqueueCommand({
                type: "camera.focusOn.position",
                position: target,
                opts: mergedOpts,
              });
              return null;
            }

            opCameraFocusOnPosition(target, mergedOpts);
            return core?.camera?.getState?.() ?? null;
          }

          // 2) uuid(string) => micro focus
          if (typeof target === "string") {
            const kind = opts && typeof opts === "object" ? opts.kind : undefined;
            if (raf) {
              enqueueCommand({ type: "camera.focusOn", uuid: target, kind });
              return null;
            }
            opCameraFocusOn(target, kind);
            return core?.camera?.getState?.() ?? null;
          }

          return core?.camera?.getState?.() ?? null;
        },

        setFOV: (v) => {
          if (!assertAlive()) return;
          if (typeof v !== "number") return;
          viewerSettings.setFov(v);
        },

        setViewByName: (name) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.setViewByName", name }); return; }
          if (!name) return;
          core?.camera?.setViewByName?.(name); // ★ここも controller 経由
          requestCommit("camera.setViewByName");
        },

        getViewPresetIndex: () => {
          if (!assertAlive()) return 0;
          return core?.camera?.getViewPresetIndex?.() ?? 0;
        },

        setViewPreset: (index, opts) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.setViewPreset", index, opts }); return; }
          const cam = core?.camera;
          if (!cam?.setViewPreset) return;

          const n = Math.floor(Number(index));
          if (!Number.isFinite(n)) return;

          cam.setViewPreset(n, opts || {});

          // UI用の mirror（必要なら）
          const resolved = cam.getViewPresetIndex?.() ?? n;
          if (core?.uiState) core.uiState.view_preset_index = resolved;

          requestCommit("camera.setViewPreset");
        },

        setState: (partial) => {
          if (!assertAlive()) return;
          core?.camera?.setState?.(partial);
        },

        getState: () => {
          return core?.camera?.getState?.() ?? null;
        },

        startAutoOrbit: (opts) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.startAutoOrbit", opts }); return; }
          core?.camera?.startAutoOrbit?.(opts || {});
          requestCommit("camera.startAutoOrbit");
        },

        updateAutoOrbitSettings: (opts) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.updateAutoOrbitSettings", opts }); return; }
          core?.camera?.updateAutoOrbitSettings?.(opts || {});
        },

        stopAutoOrbit: () => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.stopAutoOrbit" }); return; }
          core?.camera?.stopAutoOrbit?.();
          requestCommit("camera.stopAutoOrbit");
        },
      },

      mode: {
        set: (mode, uuid, kind) => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "mode.set", mode, focusUuid: uuid, kind }); return null; }
          debugHub("[hub.mode] set", mode, uuid);
          const nextMode = modeController.set(mode, uuid, kind);
          requestCommit("mode.set");
          return nextMode;
        },

        get: () => {
          debugHub("[hub.mode] get");
          return modeController.get();
        },

        canEnter: (uuid) => {
          debugHub("[hub.mode] canEnter", uuid);
          return modeController.canEnter(uuid);
        },

        exit: () => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "mode.exit" }); return null; }
          const r = modeController.exit();
          requestCommit("mode.exit");
          return r;
        },

        focus: (uuid, kind) => {
          if (raf) { enqueueCommand({ type: "mode.focus", uuid, kind }); return null; }
          core?.camera?.stopAutoOrbit?.();
          if (!assertAlive()) return null;
          debugHub("[hub.mode] focus", uuid, kind);
          const nextMode = modeController.focus(uuid, kind);
          requestCommit("mode.focus");
          return nextMode;
        },
      },

      micro: {
        enter: (uuid, kind) => {
          if (raf) { enqueueCommand({ type: "micro.enter", uuid, kind }); return null; }
          core?.camera?.stopAutoOrbit?.();
          if (!assertAlive()) return null;
          // micro mode に強制遷移
          const r = modeController.set("micro", uuid, kind);
          requestCommit("micro.enter");
          return r;
        },
        exit: () => {
          if (!assertAlive()) return null;
          // macro に戻す
          if (raf) { enqueueCommand({ type: "micro.exit" }); return null; }
          const r =
            modeController && typeof modeController.exit === "function"
              ? modeController.exit()
              : modeController.set("macro");
          requestCommit("micro.exit");
          return r;
        },
        isActive: () => {
          return core.uiState.mode === "micro";
        },
      },

      filters: {
        setTypeEnabled(kind, enabled) {
          if (!assertAlive()) return null;
          const on = !!enabled;
          if (raf) { enqueueCommand({ type: "filters.setTypeEnabled", kind, enabled: on }); return null; }
          if (
            visibilityController &&
            typeof visibilityController.setTypeFilter === "function"
          ) {
            visibilityController.setTypeFilter(kind, on);
          } else if (core.uiState && core.uiState.filters) {
            // 最悪のフォールバック
            core.uiState.filters[kind] = on;
          }
          // canonical mirror
          if (core.uiState) {
            if (!core.uiState.filters || typeof core.uiState.filters !== "object") core.uiState.filters = {};
            if (!core.uiState.filters.types || typeof core.uiState.filters.types !== "object") core.uiState.filters.types = {};
            core.uiState.filters.types[kind] = on;
            core.uiState.filters[kind] = on;
          }

          return requestCommit("filters.setTypeEnabled") ?? core.uiState?.visibleSet ?? null;
        },
        get() {
          if (
            visibilityController &&
            typeof visibilityController.getFilters === "function"
          ) {
            return visibilityController.getFilters();
          }
          return { ...(core.uiState?.filters || {}) };
        },
      },

      cameraEngine: {
        getViewDefs: () => {
          const ce = core?.cameraEngine || null;
          return ce && typeof ce.getViewDefs === "function" ? ce.getViewDefs() : null;
        },
      },

      runtime: {
        isFramePlaying: () => {
          return !!core.uiState.runtime?.isFramePlaying;
        },
        isCameraAuto: () => {
          return !!core.uiState.runtime?.isCameraAuto;
        },
      },
      /**
       * A-5 用の正規ルート:
       *  - frame / filter 変更後に「いま表示すべき UUID 集合」を再計算する。
       *  - Phase2 以降は core.recomputeVisibleSet が必須（唯一の更新ルート）
       */
      recomputeVisibleSet: () => {
        if (!assertAlive()) return null;
        if (raf) { enqueueCommand({ type: "visibleSet.requestRecompute", reason: "hub.core.recomputeVisibleSet" }); return null; }
        return requestCommit("hub.core.recomputeVisibleSet") ?? core.uiState?.visibleSet ?? null;
      },
      // ---- read-only state / struct ----
      uiState: core.uiState,
      structIndex: core.indices || core.structIndex || null,

   // 3DSS 本体（deepFreeze 済み）への read-only 入口
      data: core.data || null,

      // document_meta / scene_meta への read-only 入口（snake / camel 両方）
      document_meta:
        core.document_meta ||
        (core.data && core.data.document_meta) ||
        null,
      documentMeta:
        core.documentMeta ||
        (core.data && core.data.document_meta) ||
        null,

      scene_meta:
        core.scene_meta ||
        (core.document_meta && core.document_meta.scene_meta) ||
        null,

      sceneMeta: core.sceneMeta || null,

      // viewer 用のタイトル／概要（runtime/bootstrap 側で正規化済み）
      // 互換性のため、documentCaption が無ければ sceneMeta をそのまま流す
      documentCaption:
        core.documentCaption ||
        core.sceneMeta ||
        null,

    },
  };
  // DBG_EXPOSE_INTERNALS (dev only)
  hub.__dbg = hub.__dbg || {};
  hub.__dbg.frameController = frameController;
  if (hub.core && typeof hub.core === "object") {
    hub.core.frameController = frameController;
    hub.core.__dbg = hub.__dbg;
  }

  if (typeof window !== "undefined") window.__hub = hub;


  return hub;
}
