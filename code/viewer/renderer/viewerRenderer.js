// viewer 側 three.js レンダラーの簡易スケルトン（Canvas2D で置き換え）

const DEFAULT_BACKGROUND = "#000000";
const GLOBAL_CONTEXT = typeof window !== "undefined" ? window : globalThis;

export class ViewerRenderer {
  /**
   * @param {HTMLElement} containerElement
   * @param {{ backgroundColor?: string }} options
   */
  constructor(containerElement, options = {}) {
    this.containerElement = containerElement;
    this.options = options;
    this.initialized = false;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.usingRaf = typeof GLOBAL_CONTEXT.requestAnimationFrame === "function";
    this.sceneInfo = null;
    this.camera = null;
  }

  /**
   * @param {{ camera?: { position: number[]; target: number[]; fov: number }, groups?: Record<string, unknown>, mode?: string }} initOptions
   */
  init(initOptions = {}) {
    if (!this.containerElement) {
      throw new Error("ViewerRenderer requires a container element");
    }

    this.camera = initOptions.camera ?? { position: [0, 0, 5], target: [0, 0, 0], fov: 50 };
    this.sceneInfo = {
      groups: initOptions.groups ?? { points: [], lines: [], aux: [] },
      mode: initOptions.mode ?? "dev",
    };

    this.#installCanvas();
    this.initialized = true;
    this.#startRenderLoop();
  }

  /**
   * @param {{ viewScene?: import("../../common/types/core.js").Scene, groups?: Record<string, unknown>, camera?: { position: number[]; target: number[]; fov: number }, mode?: string }} sceneInfo
   */
  renderScene(sceneInfo) {
    if (!this.initialized) return;
    this.sceneInfo = {
      ...this.sceneInfo,
      ...sceneInfo,
    };
  }

  dispose() {
    if (this.animationFrameId == null) {
      return;
    }
    if (this.usingRaf && typeof GLOBAL_CONTEXT.cancelAnimationFrame === "function") {
      GLOBAL_CONTEXT.cancelAnimationFrame(this.animationFrameId);
    } else {
      clearTimeout(this.animationFrameId);
    }
    this.animationFrameId = null;
    this.initialized = false;
  }

  #installCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "viewer-dev-canvas";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.width = this.containerElement.clientWidth || 800;
    this.canvas.height = this.containerElement.clientHeight || 600;
    this.containerElement.innerHTML = "";
    this.containerElement.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
  }

  #startRenderLoop() {
    const loop = () => {
      if (!this.initialized) return;
      this.#drawFrame();
      this.animationFrameId = this.usingRaf
        ? GLOBAL_CONTEXT.requestAnimationFrame(loop)
        : setTimeout(loop, 16);
    };
    loop();
  }

  #drawFrame() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.fillStyle = this.options.backgroundColor ?? DEFAULT_BACKGROUND;
    this.ctx.fillRect(0, 0, width, height);

    if (!this.sceneInfo?.viewScene) {
      this.#drawBootMessage();
      return;
    }

    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "14px Consolas, ui-monospace";
    this.ctx.fillText(`Mode: ${this.sceneInfo.mode}`, 16, 24);
    this.ctx.fillText(`Nodes: ${this.sceneInfo.viewScene.nodes.length}`, 16, 48);
    this.ctx.fillText(`Camera: ${this.camera.position.join(", ")}`, 16, 72);
    const points = this.sceneInfo.groups?.points?.length ?? 0;
    const lines = this.sceneInfo.groups?.lines?.length ?? 0;
    const aux = this.sceneInfo.groups?.aux?.length ?? 0;
    this.ctx.fillText(`Groups: P${points} L${lines} A${aux}`, 16, 96);
  }

  #drawBootMessage() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.fillStyle = "#444";
    this.ctx.font = "16px Consolas, ui-monospace";
    this.ctx.fillText("Initializing viewer core...", 24, 48);
  }
}
