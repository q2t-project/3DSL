// viewer/runtime/viewerHub.js
import { DEFAULT_INPUT_POINTER } from './core/inputDefaults.js';
// NOTE: viewerHub loop uses requestAnimationFrame.
// In Node (no rAF), start() becomes a no-op for the render loop (contract for hub-noop test).

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_HUB = false;
let debugFrameCount = 0;
function debugHub(...args) {
  if (!DEBUG_HUB) return;
  // warn レベルにしておくと、ログレベル設定に関わらず表示されやすい。
  console.warn(...args);
}

/**
 * viewerHub は runtime と renderer を束ねるハブ。
 *
 * - 外部から createViewerHub を直接呼び出さないでください。
 * - 必ず bootstrapViewer* から生成された hub を使用してください。
 */

// pick debug（必要なときだけ true）
const DEBUG_PICK = false;

// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------
function _has(setLike, uuid) {
  if (!setLike || !uuid) return false;
  try {
    return typeof setLike.has === "function" ? !!setLike.has(uuid) : false;
  } catch (_e) {
    return false;
  }
}

// visibleSet の形揺れ吸収:
// - Set<string>
// - { points:SetLike, lines:SetLike, aux:SetLike }
// - SetLike(has)
function _isHitVisible(uiVisibleSet, hit) {
  const uuid = hit?.uuid;
  const kind = hit?.kind;
  if (!uuid) return true;
  if (!uiVisibleSet) return true; // 初期化順/互換の安全弁

  if (uiVisibleSet instanceof Set) return uiVisibleSet.has(uuid);
  if (typeof uiVisibleSet.has === "function") return !!uiVisibleSet.has(uuid);

  if (typeof uiVisibleSet === "object") {
    if (kind === "points" || kind === "lines" || kind === "aux") {
      return (
        _has(uiVisibleSet[kind], uuid) ||
        _has(uiVisibleSet.points, uuid) ||
        _has(uiVisibleSet.lines, uuid) ||
        _has(uiVisibleSet.aux, uuid)
      );
    }
    return (
      _has(uiVisibleSet.points, uuid) ||
      _has(uiVisibleSet.lines, uuid) ||
      _has(uiVisibleSet.aux, uuid)
    );
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

// High-frequency camera input deltas: optionally queue + accumulate per frame.
// - UI may enqueue {type:'camera.delta', dTheta?, dPhi?, panX?, panY?, zoom?}
// - hub collapses many deltas into a single application at the next frame boundary.
const CAMERA_DELTA_APPLY = 'camera.applyInputDeltas';
const _cameraDelta = { dTheta: 0, dPhi: 0, panX: 0, panY: 0, zoom: 0 };
let _cameraDeltaScheduled = false;

// OrbitControls 由来の“慣性/減衰”を hub 側で再現する
// - 1フレーム分の input delta を適用し、残り(delta) を毎フレーム減衰させる
// - dampingFactor は uiState.viewerSettings.input.pointer.dampingFactor で調整可能（未指定なら 0.10）
const _cameraInertia = { dTheta: 0, dPhi: 0, panX: 0, panY: 0, zoom: 0 };
let _cameraInertiaActive = false;

function _getInputDampingFactor() {
  const v = core?.uiState?.viewerSettings?.input?.pointer?.dampingFactor;
  const n = Number(v);
  // 0..1 を許容（0 は “慣性OFF”）
  if (Number.isFinite(n) && n >= 0 && n < 1) return n;
  return DEFAULT_INPUT_POINTER.dampingFactor;
}

function _applyCameraInertia(dt) {
  if (!_cameraInertiaActive) return;

  const a = _cameraInertia;
  const sum0 = Math.abs(a.dTheta) + Math.abs(a.dPhi) + Math.abs(a.panX) + Math.abs(a.panY) + Math.abs(a.zoom);
  if (sum0 < 1e-10) {
    a.dTheta = 0; a.dPhi = 0; a.panX = 0; a.panY = 0; a.zoom = 0;
    _cameraInertiaActive = false;
    return;
  }

  // OrbitControls 互換：
  // 1) “今の delta” をそのまま適用
  // 2) 残り(delta) を (1 - damping) で減衰
  let damp = _getInputDampingFactor();
  if (!(damp >= 0 && damp < 1)) damp = 0.10;

  // dt を考慮して 60fps 相当の damping をスケール
  let f = damp;
  if (typeof dt === 'number' && Number.isFinite(dt) && dt > 0) {
    const frames = Math.max(1, Math.min(120, dt * 60));
    f = 1 - Math.pow(1 - damp, frames);
  }

  const dTheta = a.dTheta;
  const dPhi   = a.dPhi;
  const panX   = a.panX;
  const panY   = a.panY;
  const zoom   = a.zoom;

  if (dTheta || dPhi) opCameraRotate(dTheta, dPhi);
  if (panX || panY) opCameraPan(panX, panY);
  if (zoom) opCameraZoom(zoom);

  // 慣性OFFなら即停止
  if (!(f > 0)) {
    a.dTheta = 0; a.dPhi = 0; a.panX = 0; a.panY = 0; a.zoom = 0;
    _cameraInertiaActive = false;
    return;
  }

  const m = 1 - f;
  a.dTheta *= m;
  a.dPhi   *= m;
  a.panX   *= m;
  a.panY   *= m;
  a.zoom   *= m;

  const sum = Math.abs(a.dTheta) + Math.abs(a.dPhi) + Math.abs(a.panX) + Math.abs(a.panY) + Math.abs(a.zoom);
  if (sum < 1e-10) {
    a.dTheta = 0; a.dPhi = 0; a.panX = 0; a.panY = 0; a.zoom = 0;
    _cameraInertiaActive = false;
  }
}


function _removeCameraApplyCmd() {
  for (let i = commandQueue.length - 1; i >= 0; i--) {
    if (commandQueue[i] && commandQueue[i].type === CAMERA_DELTA_APPLY) {
      commandQueue.splice(i, 1);
      return true;
    }
  }
  return false;
}

function _discardCameraDeltas() {
  // drop both pending deltas and inertia (jump commands should not inherit drag momentum)
  _cameraInertia.dTheta = 0;
  _cameraInertia.dPhi = 0;
  _cameraInertia.panX = 0;
  _cameraInertia.panY = 0;
  _cameraInertia.zoom = 0;
  _cameraInertiaActive = false;

  _cameraDelta.dTheta = 0;
  _cameraDelta.dPhi = 0;
  _cameraDelta.panX = 0;
  _cameraDelta.panY = 0;
  _cameraDelta.zoom = 0;
  _cameraDeltaScheduled = false;
  _removeCameraApplyCmd();
}

function _scheduleCameraApply() {
  if (_cameraDeltaScheduled) return;
  commandQueue.push({ type: CAMERA_DELTA_APPLY });
  _cameraDeltaScheduled = true;
}

function _ensureCameraApplyLast() {
  if (!_cameraDeltaScheduled) return;
  const last = commandQueue[commandQueue.length - 1];
  if (last && last.type === CAMERA_DELTA_APPLY) return;
  if (_removeCameraApplyCmd()) {
    commandQueue.push({ type: CAMERA_DELTA_APPLY });
  }
}

const CAMERA_JUMP_TYPES = new Set([
  // view / focus changes: drop pending input deltas to avoid mixing drag into jumps
  'camera.setViewPreset',
  'camera.setViewByName',
  'camera.focusOn',
  'camera.focusOn.position',
  'camera.startAutoOrbit',
  'camera.setState',
]);

function _isCameraJumpCommand(type) {
  if (!type || typeof type !== 'string') return false;
  return CAMERA_JUMP_TYPES.has(type);
}


// UI が “今この瞬間に” hub/core を動かさず、次フレームで確定させる入口。
// - ここに積んだコマンドは render loop 冒頭でまとめて適用される。
function enqueueCommand(cmd) {
  if (!cmd || typeof cmd !== "object") return false;
  if (disposed) return false;

  if (cmd.type === 'camera.delta') {
    _enqueueCameraDelta(cmd);
  } else {
    // ジャンプ系 camera コマンドが来たら、同フレームに溜まった delta は捨てる
    // （残すなら flush ルールが必要だが、UI 体験上は破棄が安定）
    if (_isCameraJumpCommand(cmd.type)) {
      _discardCameraDeltas();
    }
    commandQueue.push(cmd);
    // delta が既に scheduled なら、常にフレーム末尾で適用させる
    _ensureCameraApplyLast();
  }

  // Node/no-rAF: render loop が無いのでここで消化して確定する
  if (!raf) {
    flushCommandQueue();
    if (core?.uiState?._dirtyVisibleSet) {
      markDirty(consumeCommitReason("commands.flush"));
    }
  }

  return true;
}

// camera.delta は queue 肥大化を避けるため、1フレームぶんを合算して
// CAMERA_DELTA_APPLY を queue 末尾に1個だけ置く。
function _enqueueCameraDelta(cmd) {
  if (!cmd || typeof cmd !== 'object') return;
  const add = (k) => {
    const v = Number(cmd[k]);
    if (!Number.isFinite(v) || v === 0) return;
    _cameraDelta[k] += v;
  };
  add('dTheta');
  add('dPhi');
  add('panX');
  add('panY');
  add('zoom');

  _scheduleCameraApply();
  // 同フレーム内で他コマンドが混ざっても apply が末尾になるよう維持
  _ensureCameraApplyLast();
}

function opCameraRotate(dTheta, dPhi) {
  core?.camera?.rotate?.(dTheta, dPhi);
}

function opCameraPan(panX, panY) {
  core?.camera?.pan?.(panX, panY);
}

function opCameraZoom(zoom) {
  core?.camera?.zoom?.(zoom);
}

function opCameraApplyInputDeltas() {
  const a = _cameraDelta;
  if (!a) return;
  try {
    // dampingFactor がある場合は inertia に積んで、render loop で少しずつ適用する
    const damp = _getInputDampingFactor();
    if (damp > 0 && damp < 1) {
      if (a.dTheta || a.dPhi || a.panX || a.panY || a.zoom) {
        _cameraInertia.dTheta += a.dTheta;
        _cameraInertia.dPhi   += a.dPhi;
        _cameraInertia.panX   += a.panX;
        _cameraInertia.panY   += a.panY;
        _cameraInertia.zoom   += a.zoom;
        _cameraInertiaActive = true;
      }
    } else {
      if (a.dTheta || a.dPhi) opCameraRotate(a.dTheta, a.dPhi);
      if (a.panX || a.panY) opCameraPan(a.panX, a.panY);
      if (a.zoom) opCameraZoom(a.zoom);
    }
  } finally {
    a.dTheta = 0;
    a.dPhi = 0;
    a.panX = 0;
    a.panY = 0;
    a.zoom = 0;
    _cameraDeltaScheduled = false;
  }
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

function opCameraSetState(partial) {
  const cam = core?.camera;
  if (!cam || typeof cam.setState !== "function") return;
  if (!partial || typeof partial !== "object") return;

  // setState は “ジャンプ系” として扱う（input delta 混入防止は enqueue 側で破棄済み）
  try {
    cam.setState(partial);
  } finally {
    requestCommit("camera.setState");
  }
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
  return requestCommit("frame.step");
}

function opFrameNext() {
  fcStep(+1);
  return requestCommit("frame.next");
}

function opFramePrev() {
  fcStep(-1);
  return requestCommit("frame.prev");
}

function opFrameSetActive(frame) {
  // normalize + clamp via fcSetActive
  const n = Number(frame);
  if (!Number.isFinite(n)) return null;
  fcSetActive(n);
  return requestCommit("frame.setActive");
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
    case "camera.setState":
      opCameraSetState(cmd.partial);
      return;
    case "camera.focusOn.position":
      opCameraFocusOnPosition(cmd.position, cmd.opts);
      return;
    case "camera.focusOn":
      opCameraFocusOn(cmd.uuid, cmd.kind);
      return;
    case "camera.applyInputDeltas":
      opCameraApplyInputDeltas();
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
      _applyCameraInertia(dt);
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
          return opFrameSetActive(n) ?? core.uiState?.visibleSet ?? null;
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
          return opFrameStep(delta) ?? core.uiState?.visibleSet ?? null;
        },

        // dev harness 用ショートカット
        next() {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.next" }); return null; }
          return opFrameNext() ?? core.uiState?.visibleSet ?? null;

        },

        prev() {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.prev" }); return null; }
          return opFramePrev() ?? core.uiState?.visibleSet ?? null;
        },

        startPlayback(opts) {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "frame.startPlayback", opts }); return null; }
          return opFrameStartPlayback(opts);
        },

      stopPlayback() {
        if (!assertAlive()) return null;
        if (raf) { enqueueCommand({ type: "frame.stopPlayback" }); return null; }
        return opFrameStopPlayback();
      },
    },

      selection: {
        // uuid（と任意の kind）指定で selection を更新
        select: (uuid, kind) => {
          if (!assertAlive()) return null;
          if (!uuid) return null;

          // Keep return type stable ({uuid} | null) even when queued.
          // The selection is committed at the frame boundary, but callers can treat
          // a truthy return value as "accepted".
          if (raf) {
            const ok = enqueueCommand({ type: "selection.select", uuid, kind });
            return ok ? { uuid } : null;
          }

          return opSelectionSelect(uuid, kind);
        },

        clear: () => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "selection.clear" }); return null; }
          return opSelectionClear();
        },
        // 外向き API は { uuid } | null に固定
        get: () => {
          if (!assertAlive()) return null;
          const committed = core.uiState?.selection;
          return committed && committed.uuid ? { uuid: committed.uuid } : null;
        },
      },

      camera: {
        // High-frequency input should be applied at frame boundary (queue + accumulate).
        // Keep rotate/pan/zoom as aliases for delta-based input to avoid bypassing the hub boundary.
        rotate: (dTheta, dPhi) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: 'camera.delta', dTheta, dPhi }); return; }
          core?.camera?.rotate?.(dTheta, dPhi);
        },

        pan: (dx, dy) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: 'camera.delta', panX: dx, panY: dy }); return; }
          core?.camera?.pan?.(dx, dy);
        },

        zoom: (delta) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: 'camera.delta', zoom: delta }); return; }
          core?.camera?.zoom?.(delta);
        },

        // queue + accumulate (optional): use when you want UI input to be applied at frame boundary
        rotateDelta: (dTheta, dPhi) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: 'camera.delta', dTheta, dPhi }); return; }
          core?.camera?.rotate?.(dTheta, dPhi);
        },

        panDelta: (panX, panY) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: 'camera.delta', panX, panY }); return; }
          core?.camera?.pan?.(panX, panY);
        },

        zoomDelta: (zoom) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: 'camera.delta', zoom }); return; }
          core?.camera?.zoom?.(zoom);
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
          opCameraSetViewByName(name);
        },

        getViewPresetIndex: () => {
          if (!assertAlive()) return 0;
          return core?.camera?.getViewPresetIndex?.() ?? 0;
        },

        setViewPreset: (index, opts) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.setViewPreset", index, opts }); return; }
          opCameraSetViewPreset(index, opts);
        },
        setState: (partial) => {
          if (!assertAlive()) return;
          if (!partial || typeof partial !== "object") return;
          if (raf) {
            enqueueCommand({ type: "camera.setState", partial });
            return;
          }
          opCameraSetState(partial);
        },

        getState: () => {
          return core?.camera?.getState?.() ?? null;
        },

        startAutoOrbit: (opts) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.startAutoOrbit", opts }); return; }
          opCameraStartAutoOrbit(opts);
        },

        updateAutoOrbitSettings: (opts) => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.updateAutoOrbitSettings", opts }); return; }
          opCameraUpdateAutoOrbitSettings(opts);
        },

        stopAutoOrbit: () => {
          if (!assertAlive()) return;
          if (raf) { enqueueCommand({ type: "camera.stopAutoOrbit" }); return; }
          opCameraStopAutoOrbit();
        },
      },

      mode: {
        set: (mode, uuid, kind) => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "mode.set", mode, focusUuid: uuid, kind }); return null; }
          return opModeSet(mode, uuid, kind);
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
          return opModeExit();
        },

        focus: (uuid, kind) => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "mode.focus", uuid, kind }); return null; }
          return opModeFocus(uuid, kind);
        },
      },

      micro: {
        enter: (uuid, kind) => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "micro.enter", uuid, kind }); return null; }
          return opMicroEnter(uuid, kind);
        },
        exit: () => {
          if (!assertAlive()) return null;
          if (raf) { enqueueCommand({ type: "micro.exit" }); return null; }
          return opMicroExit();
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
          return opFiltersSetTypeEnabled(kind, on) ?? core.uiState?.visibleSet ?? null;
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
  // - enable by: ?dbgHub=1
  const DBG_EXPOSE_INTERNALS = (() => {
    try {
      const sp = new URLSearchParams(globalThis.location?.search ?? "");
      return sp.get("dbgHub") === "1";
    } catch (_e) {
      return false;
    }
  })();

  if (DBG_EXPOSE_INTERNALS) {
    // Expose internals via __dbg only.
    // NOTE: Do NOT mutate hub.core public surface for debugging.
    hub.__dbg = hub.__dbg || {};
    hub.__dbg.frameController = frameController;

    hub.core.__dbg = hub.core.__dbg || {};
    hub.core.__dbg.frameController = frameController;
  }

  return hub;
}