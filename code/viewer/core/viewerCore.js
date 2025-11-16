import { convert3DssToInternalModel } from "../../common/core/importer_core.js";
import { validate3Dss } from "../../common/validator/threeDssValidator.js";
import { validateInternalModel } from "../../common/validator/internalModelValidator.js";
import { createScene } from "../scene/scene_builder.js";
import { ViewerRenderer } from "../renderer/viewerRenderer.js";

const DEFAULT_CAMERA_STATE = Object.freeze({
  position: [0, 6, 14],
  target: [0, 0, 0],
  fov: 55,
});

function cloneCameraState(cameraState = DEFAULT_CAMERA_STATE) {
  return {
    ...cameraState,
    position: Array.isArray(cameraState.position) ? [...cameraState.position] : [...DEFAULT_CAMERA_STATE.position],
    target: Array.isArray(cameraState.target) ? [...cameraState.target] : [...DEFAULT_CAMERA_STATE.target],
  };
}

const NOOP = () => {};

function createLayeredSceneGraph() {
  const createGroup = (name) => ({ name, visible: true, nodes: [] });
  return {
    scene: { id: null, nodes: [] },
    pointsGroup: createGroup("points"),
    linesGroup: createGroup("lines"),
    auxGroup: createGroup("aux"),
  };
}

function bucketNode(node) {
  const type = String(node?.extras?.type ?? node?.type ?? "").toLowerCase();
  if (type.includes("line")) return "linesGroup";
  if (type.includes("point") || type.includes("dot") || type.includes("node")) return "pointsGroup";
  return "auxGroup";
}

const formatFrameId = (frameId) => frameId ?? "default";

function summarizeLoadResult(
  path,
  viewScene,
  model,
  warnings = [],
  initialFrameId = null,
  activeFrameId = null,
  visibleLayers = null
) {
  const formattedInitial = formatFrameId(initialFrameId);
  const formattedActive = formatFrameId(activeFrameId ?? initialFrameId);
  const layers =
    visibleLayers ??
    {
      points: true,
      lines: true,
      aux: true,
    };
  return {
    path,
    nodesInScene: viewScene?.nodes?.length ?? 0,
    sceneId: viewScene?.id ?? null,
    documentVersion: model?.version ?? null,
    initialFrameId: formattedInitial,
    activeFrameId: formattedActive,
    visibleLayers: {
      points: !!layers.points,
      lines: !!layers.lines,
      aux: !!layers.aux,
    },
    warnings: warnings.map((warn) => warn?.message ?? String(warn)),
  };
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load 3DSS from ${path}: ${response.status} ${response.statusText}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Invalid JSON from ${path}: ${error.message}`);
  }
}

function determineInitialFrameId(documentJson) {
  const frames = documentJson?.document_meta?.frames;
  if (Array.isArray(frames) && frames.length > 0) {
    const head = frames[0];
    if (typeof head === "object" && head !== null) {
      return head.frame_id ?? head.id ?? null;
    }
    if (typeof head === "number" || typeof head === "string") {
      return head;
    }
  }
  return null;
}

class ViewerCoreRuntime {
  constructor(containerElement, config = {}) {
    if (!containerElement) {
      throw new Error("containerElement is required");
    }

    this.containerElement = containerElement;
    this.mode = config.mode ?? "viewer_dev";
    this.modelPath = config.modelPath ?? null;
    this.log = typeof config.log === "function" ? config.log : NOOP;
    this.setSummary = typeof config.setSummary === "function" ? config.setSummary : null;
    this.cameraState = cloneCameraState(config.cameraState ?? DEFAULT_CAMERA_STATE);

    this.sceneGraph = createLayeredSceneGraph();
    this.renderer = new ViewerRenderer(this.containerElement, {
      cameraState: this.cameraState,
      scene: this.sceneGraph.scene,
      pointsGroup: this.sceneGraph.pointsGroup,
      linesGroup: this.sceneGraph.linesGroup,
      auxGroup: this.sceneGraph.auxGroup,
      log: this.log,
    });

    this.initialized = false;
    this.lastLoadSummary = null;
    this.currentFrameId = null;
  }

  async init() {
    this.renderer.init();
    this.initialized = true;
    if (this.modelPath) {
      await this.loadDocument(this.modelPath);
      this.#emitBootLogs();
    }
  }

  async loadDocument(path) {
    if (!this.initialized) {
      throw new Error("ViewerCoreRuntime is not initialized");
    }
    const targetPath = path ?? this.modelPath;
    if (!targetPath) {
      throw new Error("modelPath is required");
    }

    const documentJson = await fetchJson(targetPath);
    const schemaResult = validate3Dss(documentJson);
    if (!schemaResult.ok) {
      const primaryError = schemaResult.errors?.[0]?.message ?? "3DSS validation failed";
      throw new Error(primaryError);
    }

    const internalModel = convert3DssToInternalModel(documentJson);
    const internalValidation = validateInternalModel(internalModel);
    const warnings = internalValidation.ok ? [] : internalValidation.errors ?? [];
    this.currentFrameId = determineInitialFrameId(documentJson);

    const viewScene = createScene(internalModel.scene);
    this.#populateSceneGraph(viewScene);
    this.renderer.renderScene({
      viewScene,
      mode: this.mode,
      cameraState: this.cameraState,
      pointsGroup: this.sceneGraph.pointsGroup,
      linesGroup: this.sceneGraph.linesGroup,
      auxGroup: this.sceneGraph.auxGroup,
      frameId: this.currentFrameId,
    });

    const layers = this.getLayerVisibility();
    this.lastLoadSummary = summarizeLoadResult(
      targetPath,
      viewScene,
      internalModel,
      warnings,
      this.currentFrameId,
      this.currentFrameId,
      layers
    );
    if (this.setSummary) {
      this.setSummary(this.lastLoadSummary);
    }
    return this.lastLoadSummary;
  }

  #populateSceneGraph(viewScene) {
    this.sceneGraph.scene = viewScene ?? { nodes: [] };
    const groups = [this.sceneGraph.pointsGroup, this.sceneGraph.linesGroup, this.sceneGraph.auxGroup];
    for (const group of groups) {
      group.visible = true;
      group.nodes.length = 0;
    }

    if (!viewScene || !Array.isArray(viewScene.nodes)) {
      return;
    }

    for (const node of viewScene.nodes) {
      const bucketName = bucketNode(node);
      const group = this.sceneGraph[bucketName];
      if (group) {
        group.nodes.push(node);
      }
    }
  }

  #emitBootLogs() {
    this.log({ tag: "BOOT", payload: { mode: this.mode } });
    this.log({ tag: "MODEL", payload: { path: this.modelPath } });
    this.log({ tag: "CAMERA", payload: this.cameraState });
    const layers = this.getLayerVisibility();
    this.log({
      tag: "LAYERS",
      payload: {
        points: layers.points,
        lines: layers.lines,
        aux: layers.aux,
      },
    });
    this.log({ tag: "FRAME", payload: { frame_id: formatFrameId(this.currentFrameId) } });
  }

  updateCameraState(delta = {}) {
    const mergedState = {
      ...this.cameraState,
      ...delta,
    };
    if (Array.isArray(mergedState.position)) {
      mergedState.position = [...mergedState.position];
    }
    if (Array.isArray(mergedState.target)) {
      mergedState.target = [...mergedState.target];
    }
    this.cameraState = mergedState;
    this.renderer.renderScene({ cameraState: this.cameraState });
    this.log({ tag: "CAMERA", payload: this.cameraState });
  }

  getCameraState() {
    return cloneCameraState(this.cameraState);
  }

  getLastLoadSummary() {
    return this.lastLoadSummary;
  }

  getFrameId() {
    return this.currentFrameId ?? null;
  }

  setFrameId(frameId) {
    this.currentFrameId = frameId ?? null;
    this.renderer.renderScene({ frameId: this.currentFrameId });
    this.log({ tag: "FRAME", payload: { frame_id: formatFrameId(this.currentFrameId) } });
    if (this.lastLoadSummary) {
      this.lastLoadSummary = {
        ...this.lastLoadSummary,
        activeFrameId: formatFrameId(this.currentFrameId),
      };
      if (this.setSummary) {
        this.setSummary(this.lastLoadSummary);
      }
    }
  }

  getLayerVisibility() {
    return {
      points: !!this.sceneGraph.pointsGroup?.visible,
      lines: !!this.sceneGraph.linesGroup?.visible,
      aux: !!this.sceneGraph.auxGroup?.visible,
    };
  }

  setLayerVisibility(layerKey, visible) {
    const key = String(layerKey ?? "").toLowerCase();
    let groupKey = null;
    if (key === "points" || key === "point") groupKey = "pointsGroup";
    else if (key === "lines" || key === "line") groupKey = "linesGroup";
    else if (key === "aux" || key === "auxiliary") groupKey = "auxGroup";
    else throw new Error(`Unknown layer: ${layerKey}`);

    const group = this.sceneGraph[groupKey];
    if (!group) {
      throw new Error(`Layer group not found: ${groupKey}`);
    }

    const current = !!group.visible;
    const next = visible == null ? !current : !!visible;
    if (next === current) {
      return;
    }

    group.visible = next;

    this.renderer.renderScene({
      viewScene: this.sceneGraph.scene,
      mode: this.mode,
      cameraState: this.cameraState,
      pointsGroup: this.sceneGraph.pointsGroup,
      linesGroup: this.sceneGraph.linesGroup,
      auxGroup: this.sceneGraph.auxGroup,
      frameId: this.currentFrameId,
    });

    const layers = this.getLayerVisibility();
    this.log({
      tag: "LAYERS",
      payload: {
        points: layers.points,
        lines: layers.lines,
        aux: layers.aux,
      },
    });

    if (this.lastLoadSummary) {
      this.lastLoadSummary.visibleLayers = { ...layers };
      if (this.setSummary) {
        this.setSummary(this.lastLoadSummary);
      }
    }
  }
}

export async function bootViewerCore(containerElement, config = {}) {
  const runtime = new ViewerCoreRuntime(containerElement, config);
  await runtime.init();
  return runtime;
}

export function updateFrameId(runtime, frameId) {
  if (!runtime || typeof runtime.setFrameId !== "function") {
    throw new Error("Invalid viewer runtime: setFrameId missing");
  }
  runtime.setFrameId(frameId);
}

export function getFrameId(runtime) {
  if (!runtime || typeof runtime.getFrameId !== "function") {
    throw new Error("Invalid viewer runtime: getFrameId missing");
  }
  return runtime.getFrameId();
}

export function updateLayerVisibility(runtime, layerKey, visible) {
  if (!runtime || typeof runtime.setLayerVisibility !== "function") {
    throw new Error("Invalid viewer runtime: setLayerVisibility missing");
  }
  runtime.setLayerVisibility(layerKey, visible);
}

export function getLayerVisibility(runtime) {
  if (!runtime || typeof runtime.getLayerVisibility !== "function") {
    throw new Error("Invalid viewer runtime: getLayerVisibility missing");
  }
  return runtime.getLayerVisibility();
}

export { ViewerCoreRuntime };
