import { convert3DssToInternalModel } from "../../common/core/importer_core.js";
import { validate3Dss } from "../../common/validator/threeDssValidator.js";
import { validateInternalModel } from "../../common/validator/internalModelValidator.js";
import { createScene } from "../scene/scene_builder.js";
import { ViewerRenderer } from "../renderer/viewerRenderer.js";

const DEFAULT_CAMERA_STATE = Object.freeze({
  up: [0, 0, 1],
  position: [0, 6, 14],
  target: [0, 0, 0],
  fov: 50,
});

function createLayeredSceneGraph() {
  return {
    points: [],
    lines: [],
    aux: [],
  };
}

function bucketNode(node) {
  const type = String(node?.extras?.type ?? "").toLowerCase();
  if (type.includes("line")) return "lines";
  if (type.includes("point") || type.includes("dot") || type.includes("node")) return "points";
  return "aux";
}

function summarizeLoadResult(path, viewScene, model, warnings = []) {
  return {
    path,
    nodesInScene: viewScene?.nodes?.length ?? 0,
    sceneId: viewScene?.id ?? null,
    documentVersion: model?.version ?? null,
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

class ViewerCoreRuntime {
  constructor(containerElement, config = {}) {
    if (!containerElement) {
      throw new Error("containerElement is required");
    }

    this.containerElement = containerElement;
    this.config = {
      mode: config.mode ?? "dev",
      logLevel: config.logLevel ?? "info",
      initial3dssPath: config.initial3dssPath ?? null,
      camera: config.camera ?? DEFAULT_CAMERA_STATE,
      backgroundColor: config.backgroundColor ?? "#000000",
    };

    this.renderer = new ViewerRenderer(this.containerElement, {
      backgroundColor: this.config.backgroundColor,
    });
    this.sceneGraph = createLayeredSceneGraph();
    this.initialized = false;
    this.lastLoadSummary = null;
  }

  async init() {
    this.renderer.init({
      camera: this.config.camera,
      groups: this.sceneGraph,
      mode: this.config.mode,
    });

    this.initialized = true;
    if (this.config.initial3dssPath) {
      this.lastLoadSummary = await this.loadDocument(this.config.initial3dssPath);
    }
  }

  async loadDocument(path) {
    if (!this.initialized) {
      throw new Error("ViewerCoreRuntime is not initialized");
    }
    if (!path) {
      throw new Error("3DSS path is required");
    }

    const documentJson = await fetchJson(path);
    const schemaResult = validate3Dss(documentJson);
    if (!schemaResult.ok) {
      const primaryError = schemaResult.errors?.[0]?.message ?? "3DSS validation failed";
      throw new Error(primaryError);
    }

    const internalModel = convert3DssToInternalModel(documentJson);
    const internalValidation = validateInternalModel(internalModel);
    const warnings = internalValidation.ok ? [] : internalValidation.errors ?? [];

    const viewScene = createScene(internalModel.scene);
    this.#populateSceneGraph(viewScene);
    this.renderer.renderScene({
      viewScene,
      groups: this.sceneGraph,
      camera: this.config.camera,
      mode: this.config.mode,
    });

    this.lastLoadSummary = summarizeLoadResult(path, viewScene, internalModel, warnings);
    return this.lastLoadSummary;
  }

  #populateSceneGraph(viewScene) {
    this.sceneGraph.points.length = 0;
    this.sceneGraph.lines.length = 0;
    this.sceneGraph.aux.length = 0;

    if (!viewScene || !Array.isArray(viewScene.nodes)) {
      return;
    }

    for (const node of viewScene.nodes) {
      const bucket = bucketNode(node);
      this.sceneGraph[bucket].push(node);
    }
  }

  getLastLoadSummary() {
    return this.lastLoadSummary;
  }
}

export async function bootViewerCore(containerElement, config = {}) {
  const runtime = new ViewerCoreRuntime(containerElement, config);
  await runtime.init();
  return runtime;
}

export { ViewerCoreRuntime };
