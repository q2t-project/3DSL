const DEFAULT_BACKGROUND = "#000000";
const DEFAULT_CAMERA = Object.freeze({ position: [0, 0, 6], target: [0, 0, 0], fov: 50 });
const GLOBAL_CONTEXT = typeof window !== "undefined" ? window : globalThis;
const HAS_DOCUMENT = typeof document !== "undefined" && typeof document.createElement === "function";

export class ViewerRenderer {
  constructor(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error("ViewerRenderer requires a container element");
    }
    this.containerElement = containerElement;
    this.options = options;
    this.cameraState = options.cameraState ?? DEFAULT_CAMERA;
    this.scene = options.scene ?? { nodes: [] };
    this.pointsGroup = options.pointsGroup ?? { nodes: [], visible: true };
    this.linesGroup = options.linesGroup ?? { nodes: [], visible: true };
    this.auxGroup = options.auxGroup ?? { nodes: [], visible: true };
    this.mode = options.mode ?? "viewer_dev";
    this.log = typeof options.log === "function" ? options.log : () => {};

    this.initialized = false;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.usingRaf = typeof GLOBAL_CONTEXT.requestAnimationFrame === "function";
  }

  init() {
    this.#installCanvas();
    this.initialized = true;
    if (HAS_DOCUMENT) {
      this.#startRenderLoop();
    }
  }

  renderScene(sceneInfo = {}) {
    if (!this.initialized) return;
    this.scene = sceneInfo.viewScene ?? this.scene;
    this.cameraState = sceneInfo.cameraState ?? this.cameraState;
    this.mode = sceneInfo.mode ?? this.mode;
    this.pointsGroup = sceneInfo.pointsGroup ?? this.pointsGroup;
    this.linesGroup = sceneInfo.linesGroup ?? this.linesGroup;
    this.auxGroup = sceneInfo.auxGroup ?? this.auxGroup;
  }

  // Compatibility shim for legacy callers used by selftests.
  render(documentInfo = {}) {
    const viewScene = documentInfo.scene ?? documentInfo.viewScene ?? this.scene;
    this.renderScene({ viewScene });
  }

  // legacy API for viewer_selftest 等との互換用
  // doc.scene または Scene 相当のオブジェクトだけ拾って renderScene に流す
  render(docOrScene) {
    if (!this.initialized || !docOrScene) return;

    let scene = docOrScene;
    if (docOrScene.scene && docOrScene.scene.nodes) {
      scene = docOrScene.scene;
    }

    this.renderScene({ viewScene: scene });
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
    if (HAS_DOCUMENT) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "viewer-dev-canvas";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.canvas.style.display = "block";
      this.canvas.width = this.containerElement.clientWidth || 800;
      this.canvas.height = this.containerElement.clientHeight || 600;
      if ("innerHTML" in this.containerElement) {
        this.containerElement.innerHTML = "";
      }
      if (typeof this.containerElement.appendChild === "function") {
        this.containerElement.appendChild(this.canvas);
      }
      this.ctx = this.canvas.getContext("2d");
      return;
    }

    // Node/selftest fallback: create a mock canvas so the renderer can be initialized without DOM APIs.
    this.canvas = { width: this.options.width ?? 800, height: this.options.height ?? 600 };
    this.ctx = null;
    if (typeof this.containerElement === "object") {
      this.containerElement.canvas = this.canvas;
    }
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
    if (!this.ctx || !this.canvas || !HAS_DOCUMENT) {
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.fillStyle = this.options.backgroundColor ?? DEFAULT_BACKGROUND;
    this.ctx.fillRect(0, 0, width, height);

    if (!this.scene?.nodes?.length) {
      this.#drawBootMessage();
      return;
    }

    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "14px Consolas, ui-monospace";
    this.ctx.fillText(`Mode: ${this.mode}`, 16, 24);
    this.ctx.fillText(`Nodes: ${this.scene.nodes.length}`, 16, 48);
    this.ctx.fillText(`Camera: ${this.cameraState.position.join(", ")}`, 16, 72);
    const points = this.pointsGroup?.nodes?.length ?? 0;
    const lines = this.linesGroup?.nodes?.length ?? 0;
    const aux = this.auxGroup?.nodes?.length ?? 0;
    this.ctx.fillText(`Layers: P${points} L${lines} A${aux}`, 16, 96);
  }

  #drawBootMessage() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.fillStyle = "#444";
    this.ctx.font = "16px Consolas, ui-monospace";
    this.ctx.fillText("Initializing viewer core...", 24, 48);
  }
}
