// runtime/viewerHub.js

export function createViewerHub({ core, renderer }) {
  let animationId = null;
  const modeController = core.modeController || core.mode;
  const cameraEngine = core.cameraEngine;

  const frameController = core.frameController;
  const visibilityCtrl  = core.visibilityController;

  const renderFrame = () => {
    const camState = cameraEngine.getState();

    renderer.updateCamera(camState);
    renderer.applyFrame(core.uiState.visibleSet);
    renderer.applySelection(core.uiState.selection);

    // ★ microState + cameraState を渡す
    renderer.applyMicroFX(core.uiState.microState, camState);

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
        // uuid 指定で selection を更新
        select: (uuid) => {
          // 将来 selectionController を導入した場合
          if (core.selectionController?.select) {
            core.selectionController.select(uuid);
            const sel =
              core.selectionController.get?.() ?? core.uiState.selection;
            if (!sel || !sel.uuid) return null;
            return { uuid: sel.uuid };
          }

          // いまは uiState.selection を真実とする
          core.uiState.selection = uuid ? { uuid } : null;
          return core.uiState.selection;
        },

        clear: () => {
          if (core.selectionController?.clear) {
            core.selectionController.clear();
            return null;
          }
          core.uiState.selection = null;
          return null;
        },

        // 外向き API は { uuid } | null に固定
        get: () => {
          const sel = core.selectionController?.get
            ? core.selectionController.get()
            : core.uiState.selection;

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

            let microState = core.uiState?.microState;
            if (!microState || microState.focusUuid !== focusUuid) {
              const selection = { uuid: focusUuid };
              microState = core.microController?.compute?.(
                selection,
                cameraEngine.getState(),
                core.document3dss,
                core.indices
              );
            }

            if (!microState || !Array.isArray(microState.focusPosition)) {
              return;
            }

            // micro 状態は uiState にも反映
            core.uiState.microState = microState;
            core.uiState.mode = "micro";

            const next = cameraEngine.computeFocusState(
              microState.focusPosition,
              mergedOpts
            );
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
          console.log("[hub.mode] set", mode, uuid);
          const nextMode = modeController.set(mode, uuid);

          if (nextMode === "micro" && core.uiState?.microState?.focusPosition) {
            // microState で計算された focusPosition へベクトルフォーカス
            hub.core.camera.focusOn(core.uiState.microState.focusPosition, {});
          }

          return nextMode;
        },

        get: () => {
          console.log("[hub.mode] get");
          return modeController.get();
        },

        canEnter: (uuid) => {
          console.log("[hub.mode] canEnter", uuid);
          return modeController.canEnter(uuid);
        },

        exit: () => {
          console.log("[hub.mode] exit");
          return modeController.exit();
        },

        focus: (uuid) => {
          console.log("[hub.mode] focus", uuid);
          const nextMode = modeController.focus(uuid);

          if (nextMode === "micro" && core.uiState?.microState?.focusPosition) {
            // ここも uuid じゃなく「計算済みの focusPosition」をそのまま使う
            hub.core.camera.focusOn(core.uiState.microState.focusPosition, {});
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
        },      },

      filters: {
        // kind = "points"|"lines"|"aux"
        setTypeEnabled: (kind, enabled) => {
          if (visibilityCtrl?.setTypeEnabled) {
            visibilityCtrl.setTypeEnabled(kind, enabled);          }
        },
        get: () => {
          if (visibilityCtrl?.getState) {
            return visibilityCtrl.getState();
          }
          return {};
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