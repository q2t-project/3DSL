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
  const modeController = core.modeController || core.mode;
  const cameraEngine = core.cameraEngine;

  const frameController = core.frameController;
  const visibilityController  = core.visibilityController;

  const renderFrame = () => {
    if (!cameraEngine || typeof cameraEngine.getState !== "function") {
      // cameraEngine 未初期化ならレンダーループだけ止める
      animationId = null;
      return;
    }

    const camState = cameraEngine.getState();

    debugHub("[hub] frame", debugFrameCount++, {
      cam: camState,
      visibleSet: core.uiState && core.uiState.visibleSet,
      selection: core.uiState && core.uiState.selection,
    });

    renderer.updateCamera(camState);
    renderer.applyFrame(core.uiState.visibleSet);
    renderer.applySelection(core.uiState.selection);

    // ★ mode === "micro" のときだけ microFX を有効化（それ以外は強制 null）
    const microState =
      core.uiState && core.uiState.mode === "micro"
        ? core.uiState.microState
        : null;

    if (typeof renderer.applyMicroFX === "function") {
      renderer.applyMicroFX(microState, camState);
    }
    renderer.render();

    animationId = requestAnimationFrame(renderFrame);
  };

  const hub = {

    start() {
      if (animationId !== null) return;
      animationId = requestAnimationFrame(renderFrame);
    },
    stop() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    pickObjectAt(ndcX, ndcY) {
      if (typeof renderer.pickObjectAt === "function") {
        return renderer.pickObjectAt(ndcX, ndcY);
      }
      return null;
    },

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
          return frameController?.startPlayback?.();
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
        rotate: (dTheta, dPhi) => cameraEngine.rotate(dTheta, dPhi),
        pan: (dx, dy) => cameraEngine.pan(dx, dy),
        zoom: (delta) => cameraEngine.zoom(delta),
        reset: () => cameraEngine.reset(),
        snapToAxis: (axis) => {},

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
            const next = cameraEngine.computeFocusState(target, mergedOpts);
            cameraEngine.setState(next);
            return cameraEngine.getState();
          }

          // 2) uuid 指定
          if (typeof target === "string") {
            const focusUuid = target;

            // modeController 経由で micro へ入りつつ microState を計算
            const nextMode = modeController.set("micro", focusUuid);

            if (nextMode !== "micro" || !core.uiState?.microState?.focusPosition) {
              debugHub("[hub.camera.focusOn] failed to enter micro for uuid:", focusUuid);
              return cameraEngine.getState();
            }

            const focusPos = core.uiState.microState.focusPosition;
            const next = cameraEngine.computeFocusState(focusPos, mergedOpts);
            cameraEngine.setState(next);
            return cameraEngine.getState();
          }

          // それ以外は何もしない
          return cameraEngine.getState();
        },

        setFOV: (v) => {},
        setState: (partial) => cameraEngine.setState(partial),
        getState: () => cameraEngine.getState(),
      },

      mode: {
        set: (mode, uuid) => {
          debugHub("[hub.mode] set", mode, uuid);
          const nextMode = modeController.set(mode, uuid);

          if (nextMode === "micro" && core.uiState?.microState?.focusPosition) {
            // microState で計算された focusPosition へベクトルフォーカス
            hub.core.camera.focusOn(core.uiState.microState.focusPosition, {});
          }

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

          if (nextMode === "micro" && core.uiState?.microState?.focusPosition) {
            // ここも uuid じゃなく「計算済みの focusPosition」をそのまま使う
            hub.core.camera.focusOn(
              core.uiState.microState.focusPosition,
              {}
            );
          }

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
      uiState: core.uiState,
    }
  };

  return hub;
}