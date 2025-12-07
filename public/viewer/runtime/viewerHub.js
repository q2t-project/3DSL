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

export function createViewerHub({ core, renderer }) {
  let animationId = null;
  let lastTime = null; // ★ 前フレームの timestamp 記憶

  const modeController = core.modeController || core.mode;
  const cameraEngine = core.cameraEngine;

  const frameController = core.frameController;
  const visibilityController = core.visibilityController;

  // --- viewer 設定（いまはワールド座標軸の ON/OFF だけ） ---
  const viewerSettingsState = {
    worldAxesVisible: false,
    worldAxesListeners: [],
  };

  const viewerSettings = {
    // --------------------------------------------------------
    // 既存: ワールド座標軸の表示 ON/OFF
    // --------------------------------------------------------
    setWorldAxesVisible(flag) {
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
      if (typeof listener === "function") {
        viewerSettingsState.worldAxesListeners.push(listener);
      }
    },

    // --------------------------------------------------------
    // 追加: lineWidthMode の切り替え ("auto" | "fixed" | "adaptive")
    // --------------------------------------------------------
    setLineWidthMode(mode) {
      if (!core || !core.uiState) return;

      if (mode !== "auto" && mode !== "fixed" && mode !== "adaptive") {
        debugHub(
          "[hub.viewerSettings.setLineWidthMode] invalid mode",
          mode
        );
        return;
      }

      const ui = core.uiState;
      if (!ui.viewerSettings) ui.viewerSettings = {};
      const render =
        ui.viewerSettings.render ||
        (ui.viewerSettings.render = {});

      render.lineWidthMode = mode;

      // renderer 側に専用 API があれば渡す（無ければ state だけ保持）
      if (
        renderer &&
        typeof renderer.setLineWidthMode === "function"
      ) {
        renderer.setLineWidthMode(mode);
      }

      debugHub("[hub.viewerSettings] lineWidthMode =", mode);
    },

    // --------------------------------------------------------
    // 追加: microFX profile の切り替え ("weak" | "normal" | "strong")
    // --------------------------------------------------------
    setMicroFXProfile(profile) {
      if (!core || !core.uiState) return;

      if (
        profile !== "weak" &&
        profile !== "normal" &&
        profile !== "strong"
      ) {
        debugHub(
          "[hub.viewerSettings.setMicroFXProfile] invalid profile",
          profile
        );
        return;
      }

      const ui = core.uiState;
      if (!ui.viewerSettings) ui.viewerSettings = {};
      const fx =
        ui.viewerSettings.fx || (ui.viewerSettings.fx = {});
      const micro = fx.micro || (fx.micro = {});

      micro.profile = profile;

      // renderer 側に専用 API があれば渡す（無ければ state だけ保持）
      if (
        renderer &&
        typeof renderer.setMicroFXProfile === "function"
      ) {
        renderer.setMicroFXProfile(profile);
      }

      debugHub("[hub.viewerSettings] microFX.profile =", profile);
    },
  };

  const cameraTransition = core.cameraTransition || null;

  const renderFrame = (timestamp) => {
    if (!cameraEngine || typeof cameraEngine.getState !== "function") {
      animationId = null;
      return;
    }

    // ★ timestamp から dt(sec) を計算して cameraEngine.update(dt) へ
    if (typeof timestamp === "number") {
      if (lastTime === null) {
        lastTime = timestamp;
      }
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (typeof cameraEngine.update === "function") {
        cameraEngine.update(dt);
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

    renderer.updateCamera(camState);


    
    if (typeof renderer.applyFrame === "function") {
      renderer.applyFrame(core.uiState.visibleSet);
    }

    // --- microFX 有効条件 / OFF 条件（7.11 準拠） -----------------
    const ui = core.uiState || {};
    const runtime = ui.runtime || {};
    const uiViewerSettings = ui.viewerSettings || {};
    const fx = (uiViewerSettings.fx && uiViewerSettings.fx.micro) || {};

    // viewerSettings.fx.micro.enabled が未指定なら true 扱い
    const enabledFlag = fx.enabled !== undefined ? !!fx.enabled : true;

    const microAllowed =
      ui.mode === "micro" &&
      enabledFlag &&
      !runtime.isFramePlaying &&
      !runtime.isCameraAuto;

    // 有効条件を満たすときだけ microState を渡し、それ以外は null（＝完全リセット）
    const microState =
      microAllowed && ui.microState ? ui.microState : null;

    const visibleSet = ui.visibleSet;

    const selectionForHighlight =
      ui.mode === "macro" &&
      ui.selection &&
      ui.selection.uuid
        ? ui.selection // { uuid, kind? }
        : null;

    if (typeof renderer.applySelectionHighlight === "function") {
      renderer.applySelectionHighlight(
        selectionForHighlight,
        camState,
        visibleSet
      );
    }

    if (typeof renderer.applyMicroFX === "function") {
      renderer.applyMicroFX(microState, camState, visibleSet);
    }

    renderer.render(core);

    animationId = window.requestAnimationFrame(renderFrame);
  };

  const hub = {
    start() {
      if (animationId !== null) return;
      lastTime = null; // ★ 起動時にリセット
      animationId = requestAnimationFrame(renderFrame);
    },
    stop() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      lastTime = null; // ★ 停止時もリセット
      if (core.uiState && core.uiState.runtime) {
        core.uiState.runtime.isCameraAuto = false;
      }
    },
    pickObjectAt(ndcX, ndcY) {
      if (typeof renderer.pickObjectAt === "function") {
        return renderer.pickObjectAt(ndcX, ndcY);
      }
      return null;
    },

    viewerSettings,

    core: {
      frame: {
        set: (n) => frameController?.set?.(n),
        get: () => {
          return frameController?.get?.();
        },
        step: (d) => {
          return frameController?.step?.(d);
        },
        range: () => {
          return frameController?.range?.();
        },
        startPlayback: () => {
          const result = frameController?.startPlayback?.();

         // フレーム再生との排他:
         // 再生開始時点で AutoOrbit が動いてたら必ず止める
         if (
           hub &&
           hub.core &&
           hub.core.camera &&
           typeof hub.core.camera.stopAutoOrbit === "function"
         ) {
           hub.core.camera.stopAutoOrbit();
         }

          // 7.11 / 6.8.3: 再生開始時は必ず macro に戻し、micro 系を全リセット
          if (core.uiState) {
            // mode は可能なら modeController 経由で macro へ
            if (modeController && typeof modeController.set === "function") {
              modeController.set("macro");
            } else {
              core.uiState.mode = "macro";
            }

            // microFocus / focus をクリア（フィールドがあれば）
            if (core.uiState.microFocus) {
              core.uiState.microFocus = { uuid: null, kind: null };
            }
            if (core.uiState.focus) {
              core.uiState.focus = { active: false, uuid: null };
            }
          }

          // microFX を即座に完全 OFF（次フレーム待ちにしない）
          if (typeof renderer.applyMicroFX === "function") {
            const camStateNow =
              cameraEngine && typeof cameraEngine.getState === "function"
                ? cameraEngine.getState()
                : undefined;
            const visibleSetNow = core.uiState && core.uiState.visibleSet;
            renderer.applyMicroFX(null, camStateNow, visibleSetNow);
          }

          return result;
        },
        stopPlayback: () => {
          return frameController?.stopPlayback?.();
        },
      },

      selection: {
        // uuid（と任意の kind）指定で selection を更新
        select: (uuid, kind) => {
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }

          const sel = core.selectionController.select(uuid, kind);
          if (!sel || !sel.uuid) return null;
          // 外向き API は { uuid } | null に固定
          return { uuid: sel.uuid };
        },

        clear: () => {
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }
          core.selectionController.clear();
          return null;
        },
        // 外向き API は { uuid } | null に固定
        get: () => {
          if (!core.selectionController) {
            console.warn("[hub.selection] selectionController not available");
            return null;
          }

          const sel = core.selectionController.get();
          if (!sel || !sel.uuid) return null;
          return { uuid: sel.uuid };
        },
      },

      camera: {
        rotate: (dTheta, dPhi) => {
          if (cameraEngine && typeof cameraEngine.rotate === "function") {
            cameraEngine.rotate(dTheta, dPhi);
          }
        },

        pan: (dx, dy) => {
          if (cameraEngine && typeof cameraEngine.pan === "function") {
            cameraEngine.pan(dx, dy);
          }
        },

        zoom: (delta) => {
          if (cameraEngine && typeof cameraEngine.zoom === "function") {
            cameraEngine.zoom(delta);
          }
        },

        reset: () => {
          if (cameraEngine && typeof cameraEngine.reset === "function") {
            cameraEngine.reset();
          }
        },

        snapToAxis: (axis) => {
          if (!cameraEngine || !axis) return;
          if (typeof cameraEngine.snapToAxis === "function") {
            cameraEngine.snapToAxis(axis);
          } else {
            debugHub(
              "[hub.camera.snapToAxis] CameraEngine.snapToAxis missing",
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
          if (!cameraEngine || typeof v !== "number") return;
          // CameraEngine に setFOV があればそれを使う（なければ fov だけ上書き）
          if (typeof cameraEngine.setFOV === "function") {
            cameraEngine.setFOV(v);
          } else if (typeof cameraEngine.setState === "function") {
            cameraEngine.setState({ fov: v });
          } else {
            debugHub("[hub.camera.setFOV] setFOV/setState not available");
          }
        },

         // ビュー名で切り替え
      setViewByName: (name) => {
        if (!cameraEngine || !name) return;
        if (typeof cameraEngine.setViewByName === "function") {
          cameraEngine.setViewByName(name);
        } else {
          debugHub(
            "[hub.camera.setViewByName] CameraEngine.setViewByName missing",
            name
          );
        }
      },

      // index ベース（キーボード循環用ラッパ）
      setViewPreset: (index, opts) => {
        if (!cameraEngine) return;
        if (typeof cameraEngine.setViewPreset === "function") {
          cameraEngine.setViewPreset(index, opts || {});
        } else {
          debugHub(
            "[hub.camera.setViewPreset] CameraEngine.setViewPreset missing",
            index
          );
        }
      },

        setState: (partial) => {
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
          if (
            cameraEngine &&
            typeof cameraEngine.startAutoOrbit === "function"
          ) {
            cameraEngine.startAutoOrbit(opts || {});

            // runtime.isCameraAuto フラグもここで立てる
            if (core.uiState && core.uiState.runtime) {
              core.uiState.runtime.isCameraAuto = true;
            }
          } else {
            debugHub(
              "[hub.camera.startAutoOrbit] CameraEngine.startAutoOrbit missing"
            );
          }
        },

        updateAutoOrbitSettings: (opts) => {
          if (
            cameraEngine &&
            typeof cameraEngine.updateAutoOrbitSettings === "function"
          ) {
            cameraEngine.updateAutoOrbitSettings(opts || {});
          } else {
            debugHub(
              "[hub.camera.updateAutoOrbitSettings] CameraEngine.updateAutoOrbitSettings missing"
            );
          }
        },

        stopAutoOrbit: () => {
          if (
            cameraEngine &&
            typeof cameraEngine.stopAutoOrbit === "function"
          ) {
            cameraEngine.stopAutoOrbit();

            // Auto 停止時に isCameraAuto を落とす
            if (core.uiState && core.uiState.runtime) {
              core.uiState.runtime.isCameraAuto = false;
            }
          } else {
            debugHub(
              "[hub.camera.stopAutoOrbit] CameraEngine.stopAutoOrbit missing"
            );
          }
        },
      },

      mode: {
        set: (mode, uuid) => {
          debugHub("[hub.mode] set", mode, uuid);
          const nextMode = modeController.set(mode, uuid);
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
          debugHub("[hub.mode] exit");
          return modeController.exit();
        },

        focus: (uuid) => {
          debugHub("[hub.mode] focus", uuid);
          const nextMode = modeController.focus(uuid);
          return nextMode;
        },
      },

      micro: {
        enter: (uuid) => {
          // micro mode に強制遷移
          return modeController.set("micro", uuid);
        },
        exit: () => {
          // macro に戻す
          return modeController.set("macro");
        },
        isActive: () => {
          return core.uiState.mode === "micro";
        },
      },

      filters: {
        setTypeEnabled(kind, enabled) {
          if (
            visibilityController &&
            typeof visibilityController.setTypeFilter === "function"
          ) {
            visibilityController.setTypeFilter(kind, enabled);
          } else if (core.uiState && core.uiState.filters) {
            // 最悪のフォールバック
            core.uiState.filters[kind] = !!enabled;
          }
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
       *  - 内部に core.recomputeVisibleSet があればそれを優先し、
       *    無ければ visibilityController.recompute() にフォールバック。
       */
      recomputeVisibleSet: () => {
        if (typeof core.recomputeVisibleSet === "function") {
          return core.recomputeVisibleSet();
        }

        if (
          visibilityController &&
          typeof visibilityController.recompute === "function"
        ) {
          return visibilityController.recompute();
        }
        return core.uiState?.visibleSet ?? null;
      },
      uiState: core.uiState,
      structIndex: core.indices || core.structIndex || null,
    },
  };

  return hub;
}
