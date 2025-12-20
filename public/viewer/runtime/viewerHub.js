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

  function commit(reason, mutator) {
    const ui = core.uiState;
    if (!ui) throw new Error("[hub] uiState missing");

    // mutator が何回 state を触っても、最後に1回だけrecomputeする
    ui._dirtyVisibleSet = true;

    try {
      mutator(ui);
    } finally {
      // 例外が起きても、入力の後始末やdirtyは残る（次フレで回収できる）
    }

    // re-entrancy防止（commit中にcommit呼ばれても1回に畳む）
    if (_committing) return;

    _committing = true;
    try {
      return commitVisibleSet(reason);
    } finally {
      _committing = false;
    }
  }

  let _inCommit = false;

  function commitVisibleSet(reason) {
    const uiState = core.uiState;
    if (!uiState) return null;

    if (_inCommit) return uiState.visibleSet;
    if (!uiState._dirtyVisibleSet) return uiState.visibleSet;

    _inCommit = true;
    try {
      uiState._dirtyVisibleSet = false;
      const vs = recomputeVisibleSet(reason);
      // ... renderer 反映など
      return vs;
    } finally {
      _inCommit = false;
    }
  }

  // 「必ず」正規ルートを踏ませたい場面用（外部API/フレーム/フィルタ等）
  function forceCommitVisibleSet(reason) {
    const uiState = core.uiState;
    if (!uiState) return null;
    uiState._dirtyVisibleSet = true;
    return commitVisibleSet(reason);
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
          commitVisibleSet("playback.autoStop");
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

    // boot 直後は未確定なので初期化
    if (hubState.lastCommittedFrame == null) {
      hubState.lastCommittedFrame = curFrame;
    }

    if (curFrame !== hubState.lastCommittedFrame) {
      core.uiState._dirtyVisibleSet = true;
      commitVisibleSet("frame.changed");
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
      forceCommitVisibleSet("hub.start");

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
          fcSetActive(n);
          return forceCommitVisibleSet("frame.setActive");
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
          return forceCommitVisibleSet("frame.step");
        },

        // dev harness 用ショートカット
        next() {
          if (!assertAlive()) return null;
          fcStep(+1);
          return forceCommitVisibleSet("frame.next");
        },

        prev() {
          if (!assertAlive()) return null;
          fcStep(-1);
          return forceCommitVisibleSet("frame.prev");
        },

        startPlayback(opts) {
          if (!assertAlive()) return null;
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

          forceCommitVisibleSet("frame.startPlayback");
          return result;
        },

      stopPlayback() {
        if (!assertAlive()) return null;
        const result = fcStopPlayback();

        forceCommitVisibleSet("frame.stopPlayback");
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
          forceCommitVisibleSet("selection.select");
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
          forceCommitVisibleSet("selection.clear");
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
            if (!modeController || typeof modeController.focus !== "function") {
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

      // index 取得（UIは uiState 直参照禁止なので、ここを正規ルートにする）
      getViewPresetIndex: () => {
        if (!assertAlive()) return 0;
        if (cameraEngine && typeof cameraEngine.getViewPresetIndex === "function") {
          return cameraEngine.getViewPresetIndex();
        }
        const v = core && core.uiState ? core.uiState.view_preset_index : undefined;
        return typeof v === "number" ? v : 0;
      },

      // index ベース（キーボード循環用ラッパ）
      setViewPreset: (index, opts) => {
        const cam = core?.camera || null; // ★ core.camera façade を正とする
        if (!cam) return;
        if (typeof cam.setViewPreset === "function") {
          const n = Math.floor(Number(index));
          if (!Number.isFinite(n)) return;

          cam.setViewPreset(n, opts || {});

          // hub側で canonical(uiState) を同期（UIに書かせない）
          const resolved =
            typeof cam.getViewPresetIndex === "function"
              ? cam.getViewPresetIndex()
              : n;
          if (core?.uiState) core.uiState.view_preset_index = resolved;

          commitVisibleSet("camera.setViewPreset");
        } else {
          debugHub(
            "[hub.camera.setViewPreset] core.camera.setViewPreset missing",
            index
          );
        }
      },

        setState: (partial) => {
          if (!assertAlive()) return;
          const cam = core?.camera || null;
          if (cam && typeof cam.setState === "function") cam.setState(partial);
        },

        getState: () => {
          const cam = core?.camera || null;
          return cam && typeof cam.getState === "function" ? cam.getState() : null;
        },

        // ★ AutoOrbit（自動ぐるり俯瞰）用のパススルー API
        startAutoOrbit: (opts) => {
          if (!assertAlive()) return;
          const cam = core?.camera || null;
          if (cam && typeof cam.startAutoOrbit === "function") {
            cam.startAutoOrbit(opts || {}); // ★ isCameraAuto は core.camera が書く
            commitVisibleSet("camera.startAutoOrbit");
            return;
          }
          debugHub("[hub.camera.startAutoOrbit] core.camera.startAutoOrbit missing");
        },

        updateAutoOrbitSettings: (opts) => {
          if (!assertAlive()) return;
          const cam = core?.camera || null;
          if (cam && typeof cam.updateAutoOrbitSettings === "function") {
            cam.updateAutoOrbitSettings(opts || {});
            return;
          }
          debugHub("[hub.camera.updateAutoOrbitSettings] core.camera.updateAutoOrbitSettings missing");
        },

        stopAutoOrbit: () => {
          if (!assertAlive()) return;
          const cam = core?.camera || null;
          if (cam && typeof cam.stopAutoOrbit === "function") {
            cam.stopAutoOrbit(); // ★ isCameraAuto は core.camera が書く
            commitVisibleSet("camera.stopAutoOrbit");
            return;
          }
          debugHub("[hub.camera.stopAutoOrbit] core.camera.stopAutoOrbit missing");
        },
      },

      mode: {
        set: (mode, uuid, kind) => {
          if (!assertAlive()) return null;
          debugHub("[hub.mode] set", mode, uuid);
          const nextMode = modeController.set(mode, uuid, kind);
          commitVisibleSet("mode.set");
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
          const r = modeController.exit();
          commitVisibleSet("mode.exit");
          return r;
        },

        focus: (uuid, kind) => {
          if (!assertAlive()) return null;
          debugHub("[hub.mode] focus", uuid, kind);
          const nextMode = modeController.focus(uuid, kind);
          commitVisibleSet("mode.focus");
          return nextMode;
        },
      },

      micro: {
        enter: (uuid, kind) => {
          if (!assertAlive()) return null;
          // micro mode に強制遷移
          const r = modeController.set("micro", uuid, kind);
          commitVisibleSet("micro.enter");
          return r;
        },
        exit: () => {
          if (!assertAlive()) return null;
          // macro に戻す
          const r =
            modeController && typeof modeController.exit === "function"
              ? modeController.exit()
              : modeController.set("macro");
          commitVisibleSet("micro.exit");
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

          return forceCommitVisibleSet("filters.setTypeEnabled");
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
        return forceCommitVisibleSet("hub.core.recomputeVisibleSet");
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


  return hub;
}
