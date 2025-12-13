// runtime/viewerHub.js

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
  let lastTime = null; // ★ 前フレームの timestamp 記憶
  let disposed = false;

  const modeController = core.modeController || core.mode;
  const cameraEngine = core.cameraEngine;

  const frameController = core.frameController;
  const visibilityController = core.visibilityController;

  const settingsController = core.viewerSettingsController || null;
  const _unsubs = [];

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
      return core.recomputeVisibleSet(reason);
    }
    console.warn("[viewerHub] core.recomputeVisibleSet is missing (Phase2 contract broken)");
    return core.uiState?.visibleSet ?? null;
  }

  let lastCommittedFrame = null;

  function commitVisibleSet(_reason) {
    const v = recomputeVisibleSet(_reason);
    // frame.current は frameController / recomputeVisibleSet 側で確定済み、hub は追従するだけ
    lastCommittedFrame = fcGetActive();
    return v;
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

  const renderFrame = (timestamp) => {
    if (disposed) {
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
        if (wasPlaying && !nowPlaying && curAfter === lastCommittedFrame) {
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
    const ui = core.uiState || {};
    const runtime = ui.runtime || {};
    const uiViewerSettings = ui.viewerSettings || {};
    const fx = (uiViewerSettings.fx && uiViewerSettings.fx.micro) || {};

    const microState = ui.microState || null;
    const visibleSet = ui.visibleSet;
    const selectionForHighlight =
      ui.mode === "macro" && ui.selection && ui.selection.uuid ? ui.selection : null;

    renderer?.updateCamera?.(camState);
    renderer?.applyFrame?.(visibleSet);
    renderer?.applySelectionHighlight?.(selectionForHighlight, camState, visibleSet);
    renderer?.applyMicroFX?.(microState, camState, visibleSet);
    renderer?.render?.(core);

    animationId = window.requestAnimationFrame(renderFrame);
  };

  function assertAlive() {
    if (!disposed) return true;
    console.warn("[viewerHub] called after dispose");
    return false;
  }

  const hub = {
    start() {
      if (disposed) return;
      // invariant: start() は必ず commitVisibleSet -> RAF の順で呼ぶ（lastCommittedFrame を確定させる）
      if (animationId !== null) return;
      if (typeof core.recomputeVisibleSet !== "function") {
        console.warn("[viewerHub] cannot start: core.recomputeVisibleSet is missing (Phase2 contract broken)");
        return;
      }
      lastTime = null; // ★ 起動時にリセット
      if (core.uiState && !core.uiState.runtime) core.uiState.runtime = {};
      commitVisibleSet("hub.start");
      animationId = requestAnimationFrame(renderFrame);
    },
    stop() { // stop = dispose
      if (disposed) return;
      disposed = true;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      lastCommittedFrame = null;
      lastTime = null; // ★ 停止時もリセット
      if (core.uiState && core.uiState.runtime) {
        core.uiState.runtime.isCameraAuto = false;
       // isFramePlaying の所有者は frameController（Phase2-E）
       if (frameController && typeof frameController.stopPlayback === "function") {
         frameController.stopPlayback();
       } else {
         // 互換フォールバック（frameController が無い場合だけ）
          // isFramePlaying の所有者は frameController（Phase2-E）
          if (frameController && typeof frameController.stopPlayback === "function") {
            frameController.stopPlayback();
          }
        }
      }
      // hub が止まったら settings の同期も解除（リーク防止）
      while (_unsubs.length) {
        try {
          const off = _unsubs.pop();
          if (typeof off === "function") off();
        } catch (_e) {}
      }

      viewerSettingsState.worldAxesListeners.length = 0;

      // optional: renderer/core が dispose API 持ってたら呼ぶ
      try { if (renderer && typeof renderer.dispose === "function") renderer.dispose(); } catch (_e) {}
      try { if (core && typeof core.dispose === "function") core.dispose(); } catch (_e) {}
      if (settingsController && typeof settingsController.dispose === "function") {
        try { settingsController.dispose(); } catch (_e) {}
      }
    },
    dispose() { return this.stop(); },

    pickObjectAt(ndcX, ndcY) {
      if (!assertAlive()) return null;
      if (typeof renderer.pickObjectAt === "function") {
        return renderer.pickObjectAt(ndcX, ndcY);
      }
      return null;
    },

    viewerSettings,

    core: {
      frame: {
        // 単一フレーム指定
        setActive(n) {
          if (!assertAlive()) return null;
          fcSetActive(n);
          return commitVisibleSet("frame.setActive");
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
          return commitVisibleSet("frame.step");
        },

        // dev harness 用ショートカット
        next() {
          if (!assertAlive()) return null;
          fcStep(+1);
          return commitVisibleSet("frame.next");
        },

        prev() {
          if (!assertAlive()) return null;
          fcStep(-1);
          return commitVisibleSet("frame.prev");
        },

        startPlayback() {
          if (!assertAlive()) return null;
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
            if (
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

          commitVisibleSet("frame.startPlayback");
          return result;
        },

      stopPlayback() {
        if (!assertAlive()) return null;
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
            if (core.uiState && core.uiState.runtime) {
              core.uiState.runtime.isCameraAuto = true;
            }
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
            if (core.uiState && core.uiState.runtime) {
              core.uiState.runtime.isCameraAuto = false;
              commitVisibleSet("camera.stopAutoOrbit");
            }
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
          const nextMode = modeController.set(mode, uuid);
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

        focus: (uuid) => {
          if (!assertAlive()) return null;
          debugHub("[hub.mode] focus", uuid);
          const nextMode = modeController.focus(uuid);
          commitVisibleSet("mode.focus");
          return nextMode;
        },
      },

      micro: {
        enter: (uuid) => {
          if (!assertAlive()) return null;
          // micro mode に強制遷移
          const r = modeController.set("micro", uuid);
          commitVisibleSet("micro.enter");
          return r;
        },
        exit: () => {
          if (!assertAlive()) return null;
          // macro に戻す
          const r = modeController.set("macro");
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
        return commitVisibleSet("hub.core.recomputeVisibleSet");
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

  return hub;
}
