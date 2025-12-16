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
 * - 外部から createViewerHub を直接呼び出さないこと。
 * - 必ず bootstrapViewer* から生成された hub を使う。
 */

export function createViewerHub({ core, renderer }) {
  let animationId = null;
  let lastTime = null;
  let running = false; 
  let disposed = false;

  const r = renderer?.renderer ?? renderer;      // THREE.WebGLRenderer 本体
  const canvas = renderer?.canvas ?? r?.domElement;

  console.log("[hub] renderer shape", {
    hasCtx: !!renderer?.renderer,
    hasSetAnimationLoop: typeof (renderer?.setAnimationLoop) === "function",
    hasSetAnimationLoopOnR: typeof (r?.setAnimationLoop) === "function",
  });

  const modeController = core.modeController || core.mode;
  const cameraEngine = core.cameraEngine;

  const frameController = core.frameController;
  const visibilityController = core.visibilityController;
  const microController = core.microController || core.micro || null;

  const settingsController = core.viewerSettingsController || null;
  const _unsubs = [];


  function assertAlive() {
    return !disposed;
  }

  function ensureRuntime() {
    if (core && core.uiState) {
      if (!core.uiState.runtime || typeof core.uiState.runtime !== "object") {
        core.uiState.runtime = {};
      }
      return core.uiState.runtime;
    }
    return null;
  }

  // structIndex はモデル差し替えで入れ替わる可能性があるので getter で解決する
  let _warnedStructIndex = false;
  function resolveStructIndex() {
    const si =
      (core.structIndex && core.structIndex.uuidToItem ? core.structIndex : null) ||
      (core.indices && core.indices.uuidToItem ? core.indices : null) ||
      core.structIndex ||
      core.indices ||
      null;
    if (si && !si.uuidToItem && !_warnedStructIndex) {
      _warnedStructIndex = true;
      console.warn("[viewerHub] structIndex has no uuidToItem (detailView contract may break)");
    }
    return si;
  }

  const hasRAF = typeof globalThis?.requestAnimationFrame === "function";
  const raf = hasRAF ? globalThis.requestAnimationFrame.bind(globalThis) : null;
  const caf =
    typeof globalThis?.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : null;

  // Phase2: viewerSettingsController → cameraEngine/uiState/renderer への bridge
  if (settingsController) {
    const off = attachViewerSettingsBridge(core);
    if (typeof off === "function") _unsubs.push(off);
  }

  // ------------------------------------------------------------
  // Phase5: microController.refresh を hub から使えるように結線
  //  - refresh() は「uiState に確定した microState を副作用へ同期」するだけ
  //  - 実際の描画呼び出し（renderer.applyMicroFX）は effectHandlers 経由で行う
  // ------------------------------------------------------------

  function safeGetCameraState() {
    try {
      if (cameraEngine && typeof cameraEngine.getState === "function") {
        return cameraEngine.getState();
      }
    } catch (_e) {}
    return core.uiState?.cameraState ?? null;
  }

  if (microController && typeof microController.setEffectHandlers === "function") {
    microController.setEffectHandlers({
      apply: (ms) => {
        const camState = safeGetCameraState();
        if (!camState) return;
        renderer?.applyMicroFX?.(ms, camState, core.uiState?.visibleSet);
      },
      clear: () => {
        const camState = safeGetCameraState();
        if (!camState) return;
        renderer?.applyMicroFX?.(null, camState, core.uiState?.visibleSet);
      },
    });
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

  function fcStartPlayback() {
    if (!frameController) return;
    if (typeof frameController.startPlayback === "function") {
      return frameController.startPlayback();
    }
    if (typeof frameController.play === "function") {
      return frameController.play();
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

  // --- viewer 設定（いまはワールド座標軸の ON/OFF だけ） ---
  const viewerSettingsState = {
    // ワールド座標軸だけは当面 hub 管理でOK（Phase2の対象外にしてある）
    worldAxesVisible: false,
    worldAxesListeners: [],
  };

  // ------------------------------------------------------------
  // applyViewerSettings: 毎フレームの object 生成を避ける（payload 使い回し）
  // ------------------------------------------------------------
  const _viewerSettingsPayload = {
    worldAxesVisible: false,
    microFXProfile: "normal",
  };
  let _vsDirty = true;
  let _cachedWorldAxesVisible = _viewerSettingsPayload.worldAxesVisible;
  function normalizeMicroFXProfile(p) {
    return (p === "weak" || p === "normal" || p === "strong") ? p : "normal";
  }
  let _cachedMicroFXProfile = normalizeMicroFXProfile(
    settingsController?.getMicroFXProfile?.() ?? _viewerSettingsPayload.microFXProfile
  );

  function applyViewerSettingsMaybe() {
    if (!_vsDirty) return;
    if (!renderer || typeof renderer.applyViewerSettings !== "function") return; // dirty維持
    _viewerSettingsPayload.worldAxesVisible = !!_cachedWorldAxesVisible;
    _viewerSettingsPayload.microFXProfile = normalizeMicroFXProfile(_cachedMicroFXProfile);
    try {
      renderer.applyViewerSettings(_viewerSettingsPayload);
      _vsDirty = false;
    } catch (_e) {
      // 失敗時は dirty維持（次フレームで再挑戦）
    }
  }

  const viewerSettings = {

    // --------------------------------------------------------
    // 既存: ワールド座標軸の表示 ON/OFF
    // --------------------------------------------------------
    setWorldAxesVisible(flag) {
      if (!assertAlive()) return;
      const visible = !!flag;
      if (visible === viewerSettingsState.worldAxesVisible) return;

      viewerSettingsState.worldAxesVisible = visible;
      _cachedWorldAxesVisible = visible;
      _vsDirty = true;
      applyViewerSettingsMaybe(); 

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
    // 追加: microFX profile の切り替え ("weak" | "normal" | "strong")
    // --------------------------------------------------------
    setMicroFXProfile(profile) {
      if (!assertAlive()) return;
      if (!settingsController || typeof settingsController.setMicroFXProfile !== "function") return;
      const next = normalizeMicroFXProfile(profile);
      if (next === _cachedMicroFXProfile) return;
      settingsController.setMicroFXProfile(next);
      _cachedMicroFXProfile = next;
      _vsDirty = true;
      applyViewerSettingsMaybe(); 
    },

    getMicroFXProfile() {
      const p = _cachedMicroFXProfile ?? settingsController?.getMicroFXProfile?.();
      return normalizeMicroFXProfile(p);
    },

    onMicroFXProfileChanged(listener) {
      if (!assertAlive()) return () => {};
      return settingsController && typeof settingsController["onMicroFXProfileChanged"] === "function"
      ? settingsController["onMicroFXProfileChanged"](listener)
      : () => {};
    },
  };

  if (settingsController?.onMicroFXProfileChanged) {
    const un = settingsController.onMicroFXProfileChanged((p) => {
    const next = normalizeMicroFXProfile(p);
      if (next !== _cachedMicroFXProfile) {
        _cachedMicroFXProfile = next;
        _vsDirty = true;
        applyViewerSettingsMaybe(); 
      }
    });
    if (typeof un === "function") _unsubs.push(un);
  }

  const cameraTransition = core.cameraTransition || null;

  // Phase5: microFX の適用は「microState がある間」or「直前まで microFX があった」のときだけ
  // これで micro→macro の切替フレームで 1 回だけ null 適用（= baseStyle へ復帰）できる
  let lastMicroNonNull = false;

  // ------------------------------------------------------------
  // uiState 変更後の “統一コミット” (visibleSet/selection/microState の確定)
  // ------------------------------------------------------------
  function callCoreRecomputeVisibleSet(reason) {
    const fn = core?.recomputeVisibleSet;
    if (typeof fn !== "function") {
      console.warn("[viewerHub] core.recomputeVisibleSet is missing (Phase2 contract broken)");
      return core.uiState?.visibleSet ?? null;
    }
    // 新: ({reason}) / 旧: (reason:string) 両対応
    try {
      return fn({ reason: String(reason || "recompute") });
    } catch (_e1) {
      try {
        return fn(String(reason || "recompute"));
      } catch (_e2) {
        console.warn("[viewerHub] core.recomputeVisibleSet failed");
        return core.uiState?.visibleSet ?? null;
      }
    }
  }

  let lastCommittedFrame = null;
  let lastAppliedVisibleSet = null;

  function shouldApplyFrame(reason, visibleSet) {
    if (visibleSet == null) return false;
    if (visibleSet !== lastAppliedVisibleSet) return true;
    const r = String(reason || "");
    // visibleSet が “同一参照で更新” される事故に備えて、visible に効く系は強制 apply
    return (
      r.startsWith("hub.start") ||
      r.startsWith("hub.core.") ||
      r.startsWith("frame.") ||
      r.startsWith("frameController.") ||
      r.startsWith("filters.") ||
      r.startsWith("playback.") ||
      r.startsWith("mode.") ||
      r.startsWith("micro.")
    );
  }


  // Phase5 規範：applyFrame → microController.refresh → selection をここに一本化
  function applyCommittedVisuals(reason, camStateOverride) {
    const ui = core.uiState || {};
    const visibleSet = ui.visibleSet;

    // viewerSettings（差分適用は renderer 側 cache）
    applyViewerSettingsMaybe();

    // 1) frame（重いので必要なときだけ）
    if (shouldApplyFrame(reason, visibleSet)) {
      renderer?.applyFrame?.(visibleSet);
      lastAppliedVisibleSet = visibleSet;
    }
 
    const camState = camStateOverride ?? safeGetCameraState();

    // 2) micro (副作用同期)
    const microStateForGate = (ui.mode === "micro") ? (ui.microState || null) : null;
    const needMicroSync = microStateForGate != null || lastMicroNonNull;
    if (needMicroSync) {
      if (microController && typeof microController.refresh === "function") {
        try { microController.refresh(); } catch (_e) {}
      } else {
        // microController 不在の保険（古い core 向け）
        if (camState) renderer?.applyMicroFX?.(microStateForGate, camState, visibleSet);
      }
    }
    lastMicroNonNull = microStateForGate != null;

    // 3) selection (macro only)
    if (ui.mode === "macro" && microStateForGate == null) {
      const sel = (ui.selection && ui.selection.uuid) ? ui.selection : null;
      if (camState) renderer?.applySelectionHighlight?.(sel, camState, visibleSet);
    } else {
      renderer?.clearSelectionHighlight?.();
    }
  }

  function commitVisibleSet(_reason) {
    const v = callCoreRecomputeVisibleSet(_reason);
    lastCommittedFrame = fcGetActive();
    applyCommittedVisuals(_reason, null);
    return typeof v !== "undefined" ? v : (core.uiState?.visibleSet ?? null);
  }

  function attachViewerSettingsBridge(core) {
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
        // Phase5: fov は cameraState 経由で updateCamera に流れるので renderer 直叩きは不要
      });
      if (typeof un === "function") off.push(un);
    }

    return () => off.forEach((fn) => fn && fn());
  }

  function isPickVisible(hit) {
    if (!hit) return false;
    if (!visibilityController || typeof visibilityController.isVisible !== "function") return true;

    // まず object そのまま渡す（対応してたら最短）
    try {
      const r0 = visibilityController.isVisible(hit);
      if (typeof r0 === "boolean") return r0;
    } catch (_e) {}

    const uuid = extract3DssUuid(hit);
    const kind = extractKind(hit);

    if (!uuid) return false;

    // (uuid, kind) / (uuid) どっちも試す
    try {
      const r1 =
        kind != null
          ? visibilityController.isVisible(uuid, kind)
          : visibilityController.isVisible(uuid);
      if (typeof r1 === "boolean") return r1;
    } catch (_e) {}

    // (kind, uuid) も一応
    if (kind != null) {
      try {
        const r2 = visibilityController.isVisible(kind, uuid);
        if (typeof r2 === "boolean") return r2;
      } catch (_e) {}
    }

    // 判定できん＝安全側で弾く
    return false;
  }

  const renderFrame = (timestamp) => {
    // 0: guard
    if (disposed || !running) {
      animationId = null;
      return;
    }
    if (!cameraEngine || typeof cameraEngine.getState !== "function") {
      // running=true のままループが途切れる罠を避ける
      running = false;
      animationId = null;
      console.warn("[viewerHub] renderFrame stopped: cameraEngine not ready");
      return;
    }

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
        if (wasPlaying && !nowPlaying && curAfter === lastCommittedFrame) {
          commitVisibleSet("playback.autoStop");
        }
      }
    }

    let camState = cameraEngine.getState();

    if (cameraTransition && cameraTransition.isActive()) {
      // cameraTransition.update() は state を返さへん（void）ので、更新後に取り直す
      try { cameraTransition.update(timestamp); } catch (_e) {}
      camState = cameraEngine.getState();
    }

    debugHub("[hub] frame", debugFrameCount++, {
      cam: camState,
      visibleSet: core.uiState && core.uiState.visibleSet,
      selection: core.uiState && core.uiState.selection,
    });

    const curFrame = fcGetActive();
    if (curFrame !== lastCommittedFrame) {
      commitVisibleSet("frame.changed");
    }

    // --- microFX 有効条件 / OFF 条件（7.11 準拠） -----------------
    
    renderer?.updateCamera?.(camState);
    
    // frame/micro/selection の順番は applyCommittedVisuals() に一本化
    applyCommittedVisuals("renderFrame", camState);

    renderer?.render?.(core);

    if (!disposed && running && raf) animationId = raf(renderFrame);
    else animationId = null;
  };
  
  function hasFn(obj, name) {
    return !!obj && typeof obj[name] === "function";
  }

  // pick 判定用：3DSS の uuid だけを拾う（three の object.uuid / id は混ざりやすい）
  function extract3DssUuid(hit) {
    if (!hit) return null;
    const u =
      hit.ref_uuid ??
      hit.target_uuid ??
      hit?.object?.userData?.uuid ?? // three object に 3DSS uuid を入れてるなら最優先
      hit.uuid ?? // hit が自前ラッパならここに 3DSS uuid が入る想定
      null;
    return typeof u === "string" && u.trim() !== "" ? u : null;
  }

  function extractKind(hit) {
    if (!hit) return null;
    const k =
      hit.kind ??
      hit.type ??
      hit?.object?.userData?.kind ??
      hit?.object?.userData?.type ??
      null;
    return typeof k === "string" && k.trim() !== "" ? k : null;
  }

  const hub = {
    start() {
      if (disposed) return;
      if (running) return;

      if (typeof core.recomputeVisibleSet !== "function") {
        console.warn("[viewerHub] cannot start: core.recomputeVisibleSet missing");
        return;
      }

      running = true;
      lastTime = null;
      lastMicroNonNull = true; // 起動直後に1回だけ null 適用でも復帰させる

      // ★初回だけ viewport を確定
      try {
        const w = canvas?.clientWidth ?? canvas?.width ?? 1;
        const h = canvas?.clientHeight ?? canvas?.height ?? 1;
        const dpr = globalThis.devicePixelRatio || 1;
        renderer?.resize?.(w, h, dpr);
      } catch (_e) {}

      ensureRuntime();
      commitVisibleSet("hub.start");

      if (raf) animationId = raf(renderFrame);
      else animationId = null; // Node では loop しない（hub-noop 対策）
    },

    stop() {
      if (disposed) return;
      if (!running) return;

      running = false;
      lastMicroNonNull = false;

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
      lastCommittedFrame = null;
      lastMicroNonNull = false;

      while (_unsubs.length) {
        try {
          const off = _unsubs.pop();
          if (typeof off === "function") off();
        } catch (_e) {}
      }

      viewerSettingsState.worldAxesListeners.length = 0;

      // micro effectHandlers を解除（参照リーク/後叩き防止）
      try {
        if (microController && typeof microController.setEffectHandlers === "function") {
          microController.setEffectHandlers({ apply() {}, clear() {} });
        }
      } catch (_e) {}

      // renderer は core を参照してる可能性があるので先に落とす
      try { renderer?.dispose?.(); } catch (_e) {}
      // settings は core が保持してる前提に寄せて hub からは直接 dispose しない（二重dispose回避）
      try { core?.dispose?.(); } catch (_e) {}
    },

    renderer, // UI 側が参照できるように公開（pointerInput の fallback 用）


    pickObjectAt(x, y) {
      return renderer?.pickObjectAt?.(x, y) ?? null;
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
          fcSetActive(n);
          // handler が走って lastCommittedFrame が更新済みなら二重 commit せん
          return (fcGetActive() !== lastCommittedFrame)
            ? commitVisibleSet("frame.setActive")
            : (core.uiState?.visibleSet ?? null);
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
          fcStep(delta || 0);
          return (fcGetActive() !== lastCommittedFrame)
            ? commitVisibleSet("frame.step")
            : (core.uiState?.visibleSet ?? null);
        },

        // dev harness 用ショートカット
        next() {
          if (!assertAlive()) return null;
          fcStep(+1);
          return (fcGetActive() !== lastCommittedFrame)
            ? commitVisibleSet("frame.next")
            : (core.uiState?.visibleSet ?? null);
        },

        prev() {
          if (!assertAlive()) return null;
          fcStep(-1);
          return (fcGetActive() !== lastCommittedFrame)
            ? commitVisibleSet("frame.prev")
            : (core.uiState?.visibleSet ?? null);
        },

        startPlayback() {
          if (!assertAlive()) return null;
          ensureRuntime();
          const result = fcStartPlayback();

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
            if (hasFn(modeController, "set")) {
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

          commitVisibleSet("frame.startPlayback");
          return result;
        },

        stopPlayback() {
          if (!assertAlive()) return null;
          ensureRuntime();
          const result = fcStopPlayback();

          commitVisibleSet("frame.stopPlayback");
          return result;
        },
      },

      selection: {
        // uuid（と任意の kind）指定で selection を更新
        select: (uuid, kind) => {
          if (!assertAlive()) return null;
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }

          core.selectionController.select(uuid, kind);
          commitVisibleSet("selection.select");
          const committed = core.uiState?.selection;
          return committed && committed.uuid ? { uuid: committed.uuid } : null;
        },

        clear: () => {
          if (!assertAlive()) return null;
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }
          core.selectionController.clear();
          commitVisibleSet("selection.clear");
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
          if (cameraEngine && typeof cameraEngine.rotate === "function") {
            cameraEngine.rotate(dTheta, dPhi);
          }
        },

        pan: (dx, dy) => {
          if (!assertAlive()) return;
          if (cameraEngine && typeof cameraEngine.pan === "function") {
            cameraEngine.pan(dx, dy);
          }
        },

        zoom: (delta) => {
          if (!assertAlive()) return;
          if (cameraEngine && typeof cameraEngine.zoom === "function") {
            cameraEngine.zoom(delta);
          }
        },

        reset: () => {
          if (!assertAlive()) return;
          if (cameraEngine && typeof cameraEngine.reset === "function") {
            cameraEngine.reset();
          }
        },

        snapToAxis: (axis) => {
          if (!assertAlive()) return;
          if (!cameraEngine || !axis) return;
          if (typeof cameraEngine.snapToAxis === "function") {
            cameraEngine.snapToAxis(axis);
          } else {
            debugHub(
              "[hub.camera.snapToAxis] cameraEngine.snapToAxis missing",
              axis
            );
          }
        },

        /**
         * カメラフォーカス:
         * - 引数が [x,y,z] 配列なら、その座標へ直接フォーカス
         * - 引数が uuid 文字列なら microState を経由して、その focusPosition へフォーカス
         */
        focusOn: (target, opts = {}) => {
          if (!assertAlive()) return null;
          const mergedOpts = {
            mode: "approach",
            distanceFactor: 0.4,
            minDistance: 0.8,
            maxDistance: 8,
            ...opts,
          };

          // 1) 位置ベクトル指定 [x,y,z]
          if (Array.isArray(target)) {
            if (!cameraEngine) return null;
            const next = cameraEngine.computeFocusState(target, mergedOpts);
            cameraEngine.setState(next);
            return cameraEngine.getState();
          }

          // 2) uuid 指定 → modeController 側に任せる（micro 侵入＆カメラ遷移）
          if (typeof target === "string") {
            if (!hasFn(modeController, "focus")) {
              debugHub(
                "[hub.camera.focusOn] modeController.focus not available"
              );
              return cameraEngine && cameraEngine.getState
                ? cameraEngine.getState()
                : null;
            }

            modeController.focus(target);
            commitVisibleSet("camera.focusOn");
            return cameraEngine && cameraEngine.getState
              ? cameraEngine.getState()
              : null;
          }

          // それ以外は何もしない
          return cameraEngine && cameraEngine.getState
            ? cameraEngine.getState()
            : null;
        },

        setFOV: (v) => {
          if (!assertAlive()) return;
          if (typeof v !== "number") return;
          viewerSettings.setFov(v);
        },

        // ビュー名で切り替え
        setViewByName: (name) => {
          if (!assertAlive()) return;
          if (!cameraEngine || !name) return;
          if (typeof cameraEngine.setViewByName === "function") {
            cameraEngine.setViewByName(name);
          } else {
            debugHub(
              "[hub.camera.setViewByName] cameraEngine.setViewByName missing",
              name
            );
          }
        },

        // index ベース（キーボード循環用ラッパ）
        setViewPreset: (index, opts) => {
          if (!assertAlive()) return;
          if (!cameraEngine) return;
          if (typeof cameraEngine.setViewPreset === "function") {
            cameraEngine.setViewPreset(index, opts || {});
          } else {
            debugHub(
              "[hub.camera.setViewPreset] cameraEngine.setViewPreset missing",
              index
            );
          }
        },

        setState: (partial) => {
          if (!assertAlive()) return;
          if (cameraEngine && typeof cameraEngine.setState === "function") {
            cameraEngine.setState(partial);
          }
        },

        getState: () => {
          return cameraEngine && typeof cameraEngine.getState === "function"
            ? cameraEngine.getState()
            : null;
        },

        // ★ AutoOrbit（自動ぐるり俯瞰）用のパススルー API
        startAutoOrbit: (opts) => {
          if (!assertAlive()) return;
          if (
            cameraEngine &&
            typeof cameraEngine.startAutoOrbit === "function"
          ) {
            cameraEngine.startAutoOrbit(opts || {});

            // runtime.isCameraAuto フラグもここで立てる
            const rt = ensureRuntime();
            if (rt) rt.isCameraAuto = true;
            commitVisibleSet("camera.startAutoOrbit");
          } else {
            debugHub(
              "[hub.camera.startAutoOrbit] cameraEngine.startAutoOrbit missing"
            );
          }
        },

        updateAutoOrbitSettings: (opts) => {
          if (!assertAlive()) return;
          if (
            cameraEngine &&
            typeof cameraEngine.updateAutoOrbitSettings === "function"
          ) {
            cameraEngine.updateAutoOrbitSettings(opts || {});
          } else {
            debugHub(
              "[hub.camera.updateAutoOrbitSettings] cameraEngine.updateAutoOrbitSettings missing"
            );
          }
        },

        stopAutoOrbit: () => {
          if (!assertAlive()) return;
          if (
            cameraEngine &&
            typeof cameraEngine.stopAutoOrbit === "function"
          ) {
            cameraEngine.stopAutoOrbit();

            // Auto 停止時に isCameraAuto を落とす
            const rt = ensureRuntime();
            if (rt) rt.isCameraAuto = false;
            commitVisibleSet("camera.stopAutoOrbit");
          } else {
            debugHub(
              "[hub.camera.stopAutoOrbit] cameraEngine.stopAutoOrbit missing"
            );
          }
        },
      },

      mode: {
        set: (mode, uuid) => {
          if (!assertAlive()) return null;
          debugHub("[hub.mode] set", mode, uuid);
          if (!hasFn(modeController, "set")) return null;
          const nextMode = modeController.set(mode, uuid);
          commitVisibleSet("mode.set");
          return nextMode;
        },

        get: () => {
          debugHub("[hub.mode] get");
          if (!hasFn(modeController, "get")) return null;
          return modeController.get();
        },

        canEnter: (uuid) => {
          debugHub("[hub.mode] canEnter", uuid);
          if (!hasFn(modeController, "canEnter")) return false;
          return modeController.canEnter(uuid);
        },

        exit: () => {
          if (!assertAlive()) return null;
          if (!hasFn(modeController, "exit")) return null;
          const r = modeController.exit();
          commitVisibleSet("mode.exit");
          return r;
        },

        focus: (uuid) => {
          if (!assertAlive()) return null;
          debugHub("[hub.mode] focus", uuid);
          if (!hasFn(modeController, "focus")) return null;
          const nextMode = modeController.focus(uuid);
          commitVisibleSet("mode.focus");
          return nextMode;
        },
      },

      micro: {
        enter: (uuid) => {
          if (!assertAlive()) return null;
          // micro mode に強制遷移
          if (!hasFn(modeController, "set")) return null;
          const r = modeController.set("micro", uuid);
          commitVisibleSet("micro.enter");
          return r;
        },
        exit: () => {
          if (!assertAlive()) return null;
          // macro に戻す
          if (!hasFn(modeController, "set")) return null;
          const r = modeController.set("macro");
          commitVisibleSet("micro.exit");
          return r;
        },
        isActive: () => {
          return core.uiState?.mode === "micro";
        },
      },

      filters: {
        setTypeEnabled(kind, enabled) {
          if (!assertAlive()) return null;
          const on = !!enabled;
          if (
            visibilityController &&
            typeof visibilityController.setTypeFilter === "function"
          ) {
            visibilityController.setTypeFilter(kind, on);
          }
          // canonical mirror
          if (core.uiState) {
            if (!core.uiState.filters || typeof core.uiState.filters !== "object") core.uiState.filters = {};
            if (!core.uiState.filters.types || typeof core.uiState.filters.types !== "object") core.uiState.filters.types = {};
            core.uiState.filters.types[kind] = on;
          }

          return commitVisibleSet("filters.setTypeEnabled");
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

      runtime: {
        isFramePlaying: () => {
          ensureRuntime();
          return !!core.uiState?.runtime?.isFramePlaying;
        },
        isCameraAuto: () => {
          ensureRuntime();
          return !!core.uiState?.runtime?.isCameraAuto;
        },
      },
      /**
       * A-5 用の正規ルート:
       *  - frame / filter 変更後に「いま表示すべき UUID 集合」を再計算する。
       *  - Phase2 以降は core.recomputeVisibleSet が必須（唯一の更新ルート）
       */
      recomputeVisibleSet: () => {
        if (!assertAlive()) return null;
        return commitVisibleSet("hub.core.recomputeVisibleSet");
      },
      // ---- read-only state / struct ----
      get uiState() {
        return core.uiState;
      },
      get structIndex() {
        return resolveStructIndex();
      },

   // 3DSS 本体（deepFreeze 済み）への read-only 入口
      get data() {
        return core.data || null;
      },

      // document_meta / scene_meta への read-only 入口（snake / camel 両方）
      get document_meta() {
        return core.document_meta || (core.data && core.data.document_meta) || null;
      },
      get documentMeta() {
        return core.documentMeta || (core.data && core.data.document_meta) || null;
      },

      get scene_meta() {
        const dm = core.document_meta || (core.data && core.data.document_meta) || null;
        return core.scene_meta || (dm && dm.scene_meta) || null;
      },

      get sceneMeta() {
        return core.sceneMeta || null;
      },

      // viewer 用のタイトル／概要（runtime/bootstrap 側で正規化済み）
      // 互換性のため、documentCaption が無ければ sceneMeta をそのまま流す
      get documentCaption() {
        return core.documentCaption || core.sceneMeta || null;
      },
    },
  };

// A-5: frameController 内部の frame 変更 → hub 正規ルートへ
  if (frameController && typeof frameController.setRecomputeHandler === "function") {
    try {
      frameController.setRecomputeHandler((arg) => {
        // すでに hub 側で commit 済みなら二重で回さん
        if (fcGetActive() === lastCommittedFrame) {
          return core.uiState?.visibleSet ?? null;
        }

        const reason =
          (arg && typeof arg === "object" && typeof arg.reason === "string")
            ? arg.reason
            : (typeof arg === "string" ? arg : "frame");

        return commitVisibleSet(`frameController.${reason}`);
      });
    } catch (_e) {}
  }

  return hub;
}

// ------------------------------------------------------------
// A-5: frameController から core.recomputeVisibleSet を差し込める hook へ、hub の正規ルートを注入
// （createViewerHub の末尾近辺でやる必要があるなら、上の方に移してもOK）
// ------------------------------------------------------------
// ※ ここは file 末尾じゃなく createViewerHub 内に置く想定で読むこと