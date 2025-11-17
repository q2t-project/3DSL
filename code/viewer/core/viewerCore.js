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

const GROUP_TO_COLLECTION_KEY = Object.freeze({
  pointsGroup: "points",
  linesGroup: "lines",
  auxGroup: "aux",
});

const FRAME_SEQUENCE_PROP = Symbol("viewer.frameSequence");

const formatFrameId = (frameId) => frameId ?? "default";

const toFrameNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
};

const normalizeFrameSequence = (frames) => {
  if (frames == null) {
    return null;
  }
  if (typeof frames === "number" || typeof frames === "string") {
    const normalized = toFrameNumber(frames);
    return normalized == null ? null : normalized;
  }
  if (!Array.isArray(frames)) {
    return null;
  }
  const normalized = frames
    .map((value) => toFrameNumber(value))
    .filter((value) => value != null);
  return normalized.length ? normalized : null;
};

const extractCollectionFrameSequences = (collection = []) => {
  if (!Array.isArray(collection)) {
    return [];
  }
  return collection.map((entry) => normalizeFrameSequence(entry?.appearance?.frames ?? entry?.frames ?? null));
};

const extractDocumentFrameCollections = (documentJson) => ({
  points: extractCollectionFrameSequences(documentJson?.points),
  lines: extractCollectionFrameSequences(documentJson?.lines),
  aux: extractCollectionFrameSequences(documentJson?.aux),
});

const deriveFrameRange = (documentJson, frameCollections) => {
  const frameIds = new Set();
  const addFrame = (value) => {
    const normalized = toFrameNumber(value);
    if (normalized != null) {
      frameIds.add(normalized);
    }
  };

  const metaFrames = documentJson?.document_meta?.frames;
  if (Array.isArray(metaFrames)) {
    for (const entry of metaFrames) {
      if (typeof entry === "object" && entry !== null) {
        addFrame(entry.frame_id ?? entry.id);
        continue;
      }
      addFrame(entry);
    }
  } else if (metaFrames != null) {
    addFrame(metaFrames);
  }

  for (const sequences of Object.values(frameCollections ?? {})) {
    if (!Array.isArray(sequences)) continue;
    for (const sequence of sequences) {
      if (sequence == null) continue;
      if (Array.isArray(sequence)) {
        sequence.forEach(addFrame);
      } else {
        addFrame(sequence);
      }
    }
  }

  if (!frameIds.size) {
    frameIds.add(0);
  }

  const values = [...frameIds];
  return {
    minFrameId: Math.min(...values),
    maxFrameId: Math.max(...values),
  };
};

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
      return toFrameNumber(head.frame_id ?? head.id ?? null);
    }
    return toFrameNumber(head);
  }
  return toFrameNumber(documentJson?.document_meta?.default_frame ?? null);
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

    this.state = {
      activeFrameId: 0,
    };
    this.initialized = false;
    this.lastLoadSummary = null;
    this.currentFrameId = 0;
    this.frameRange = { minFrameId: 0, maxFrameId: 0 };
    this.hud = config.hud ?? null;
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

    const frameCollections = extractDocumentFrameCollections(documentJson);
    this.frameRange = deriveFrameRange(documentJson, frameCollections);
    const initialFrameCandidate = determineInitialFrameId(documentJson);
    const startingFrame = this.#clampFrameId(
      typeof initialFrameCandidate === "number" ? initialFrameCandidate : this.frameRange.minFrameId,
    );
    this.currentFrameId = startingFrame;
    this.state.activeFrameId = startingFrame;

    const viewScene = createScene(internalModel.scene);
    this.#populateSceneGraph(viewScene, frameCollections);
    this.applyFrameToScene(this.state.activeFrameId);
    this.renderer.renderScene({
      viewScene,
      mode: this.mode,
      cameraState: this.cameraState,
      pointsGroup: this.sceneGraph.pointsGroup,
      linesGroup: this.sceneGraph.linesGroup,
      auxGroup: this.sceneGraph.auxGroup,
      frameId: this.state.activeFrameId,
    });

    const layers = this.getLayerVisibility();
    this.lastLoadSummary = summarizeLoadResult(
      targetPath,
      viewScene,
      internalModel,
      warnings,
      this.state.activeFrameId,
      this.state.activeFrameId,
      layers
    );
    if (this.setSummary) {
      this.setSummary(this.lastLoadSummary);
    }
    this.notifyHUD(this.state.activeFrameId);
    return this.lastLoadSummary;
  }

  #populateSceneGraph(viewScene, frameCollections = null) {
    this.sceneGraph.scene = viewScene ?? { nodes: [] };
    const groups = [this.sceneGraph.pointsGroup, this.sceneGraph.linesGroup, this.sceneGraph.auxGroup];
    for (const group of groups) {
      group.visible = true;
      group.nodes.length = 0;
    }

    if (!viewScene || !Array.isArray(viewScene.nodes)) {
      return;
    }

    const counters = {
      pointsGroup: 0,
      linesGroup: 0,
      auxGroup: 0,
    };

    for (const node of viewScene.nodes) {
      const bucketName = bucketNode(node);
      const group = this.sceneGraph[bucketName];
      if (!group) {
        continue;
      }
      const collectionKey = GROUP_TO_COLLECTION_KEY[bucketName];
      const index = counters[bucketName];
      const sequences = frameCollections?.[collectionKey];
      node[FRAME_SEQUENCE_PROP] = Array.isArray(sequences) ? sequences[index] ?? null : null;
      group.nodes.push(node);
      counters[bucketName] += 1;
    }

    this.#appendPlaceholderNodes("pointsGroup", frameCollections?.points, counters.pointsGroup);
    this.#appendPlaceholderNodes("linesGroup", frameCollections?.lines, counters.linesGroup);
    this.#appendPlaceholderNodes("auxGroup", frameCollections?.aux, counters.auxGroup);
  }

  #appendPlaceholderNodes(groupKey, sequences = [], startIndex = 0) {
    const group = this.sceneGraph[groupKey];
    if (!group || !Array.isArray(sequences)) {
      return;
    }
    for (let index = startIndex; index < sequences.length; index += 1) {
      const placeholder = {
        id: `${group.name}-placeholder-${index}`,
        visible: true,
        extras: { placeholder: true },
      };
      placeholder[FRAME_SEQUENCE_PROP] = sequences[index] ?? null;
      group.nodes.push(placeholder);
    }
  }

  #clampFrameId(frameId) {
    const candidate = Number.isFinite(frameId) ? Math.trunc(frameId) : null;
    const { minFrameId, maxFrameId } = this.frameRange ?? {};
    if (candidate == null) {
      return Number.isFinite(minFrameId) ? minFrameId : 0;
    }
    let next = candidate;
    if (Number.isFinite(minFrameId) && next < minFrameId) {
      next = minFrameId;
    }
    if (Number.isFinite(maxFrameId) && next > maxFrameId) {
      next = maxFrameId;
    }
    return next;
  }

  #isFrameVisible(frames, frameId) {
    if (frames == null) {
      return true;
    }
    if (Array.isArray(frames)) {
      return frames.includes(frameId);
    }
    if (typeof frames === "number") {
      return frames === frameId;
    }
    return true;
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
    this.log({ tag: "FRAME", payload: { frame_id: formatFrameId(this.state.activeFrameId) } });
  }

  applyFrameToScene(frameId) {
    if (typeof frameId !== "number" || !Number.isFinite(frameId)) {
      return;
    }
    const normalized = Math.trunc(frameId);
    const groups = [this.sceneGraph.pointsGroup, this.sceneGraph.linesGroup, this.sceneGraph.auxGroup];
    for (const group of groups) {
      if (!group?.nodes) {
        continue;
      }
      for (const node of group.nodes) {
        if (!node || typeof node !== "object") {
          continue;
        }
        const visible = this.#isFrameVisible(node[FRAME_SEQUENCE_PROP], normalized);
        node.visible = visible;
      }
    }
  }

  notifyHUD(frameId) {
    if (this.hud && typeof this.hud.updateFrameIndicator === "function") {
      this.hud.updateFrameIndicator(frameId);
    }
  }

  attachHud(hudInstance) {
    this.hud = hudInstance ?? null;
    if (this.hud && typeof this.hud.updateFrameIndicator === "function") {
      this.hud.updateFrameIndicator(this.state.activeFrameId ?? 0);
    }
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
    return this.state.activeFrameId ?? null;
  }

  getFrameRange() {
    return { ...this.frameRange };
  }

  setFrameId(frameId) {
    this.setActiveFrame(frameId);
  }

  setActiveFrame(frameId) {
    if (typeof frameId !== "number" || Number.isNaN(frameId)) {
      return;
    }
    const clamped = this.#clampFrameId(frameId);
    if (clamped === this.state.activeFrameId) {
      this.notifyHUD(clamped);
      return;
    }
    this.state.activeFrameId = clamped;
    this.currentFrameId = clamped;
    this.applyFrameToScene(clamped);
    this.renderer.renderScene({ frameId: clamped });
    this.log({ tag: "FRAME", payload: { frame_id: formatFrameId(clamped) } });
    if (this.lastLoadSummary) {
      this.lastLoadSummary = {
        ...this.lastLoadSummary,
        activeFrameId: formatFrameId(clamped),
      };
      if (this.setSummary) {
        this.setSummary(this.lastLoadSummary);
      }
    }
    this.notifyHUD(clamped);
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
      frameId: this.state.activeFrameId,
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

export function getFrameRange(runtime) {
  if (!runtime || typeof runtime.getFrameRange !== "function") {
    throw new Error("Invalid viewer runtime: getFrameRange missing");
  }
  return runtime.getFrameRange();
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
