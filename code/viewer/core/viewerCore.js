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

function summarizeLoadResult(path, viewScene, model, warnings = [], frameId = null) {
  return {
    path,
    nodesInScene: viewScene?.nodes?.length ?? 0,
    sceneId: viewScene?.id ?? null,
    documentVersion: model?.version ?? null,
    initialFrameId: frameId ?? "default",
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
    this.cameraState = config.cameraState ?? DEFAULT_CAMERA_STATE;

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
    });

    this.lastLoadSummary = summarizeLoadResult(targetPath, viewScene, internalModel, warnings, this.currentFrameId);
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
    this.log({
      tag: "LAYERS",
      payload: {
        points: this.sceneGraph.pointsGroup.visible,
        lines: this.sceneGraph.linesGroup.visible,
        aux: this.sceneGraph.auxGroup.visible,
      },
    });
    this.log({ tag: "FRAME", payload: { frame_id: this.currentFrameId ?? "default" } });
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
