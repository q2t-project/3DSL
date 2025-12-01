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
  const visibilityController = core.visibilityController;

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

    // ★ A-7 対応：
    //   selection ハイライトは selectionController + rendererContext.setHighlight/clearAllHighlights
    //   に任せるので、毎フレームの applySelection 呼び出しは廃止。
    // renderer.applySelection(core.uiState.selection);

    // --- microFX 有効条件 / OFF 条件（7.11 準拠） -----------------
    const ui = core.uiState || {};
    const runtime = ui.runtime || {};
    const viewerSettings = ui.viewerSettings || {};
    const fx = (viewerSettings.fx && viewerSettings.fx.micro) || {};

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

    if (typeof renderer.applyMicroFX === "function") {
      renderer.applyMicroFX(microState, camState, visibleSet);
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
          const result = frameController?.startPlayback?.();

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
            renderer.applyMicroFX(null, camStateNow);
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

          // 2) uuid 指定
          if (typeof target === "string") {
            if (!cameraEngine) return null;
            const focusUuid = target;

            // modeController 経由で micro へ入りつつ microState を計算
            const nextMode = modeController.set("micro", focusUuid);

            if (
              nextMode !== "micro" ||
              !core.uiState?.microState?.focusPosition
            ) {
              debugHub(
                "[hub.camera.focusOn] failed to enter micro for uuid:",
                focusUuid
              );
              return cameraEngine.getState();
            }

            const focusPos = core.uiState.microState.focusPosition;
            const next = cameraEngine.computeFocusState(focusPos, mergedOpts);
            cameraEngine.setState(next);
            return cameraEngine.getState();
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
      },

      mode: {
        set: (mode, uuid) => {
          debugHub("[hub.mode] set", mode, uuid);
          const nextMode = modeController.set(mode, uuid);

          if (
            nextMode === "micro" &&
            core.uiState?.microState?.focusPosition
          ) {
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

          if (
            nextMode === "micro" &&
            core.uiState?.microState?.focusPosition
          ) {
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
    },
  };

  return hub;
}
