import { ViewNode, ViewScene } from '../types/view_scene.js';

const isObjectLike = (value) => typeof value === 'object' && value !== null;

const cloneVector = (vector) => {
  if (!Array.isArray(vector)) {
    return null;
  }
  return vector.map((value) => value);
};

const normalizeTransform = (transform) => {
  if (!transform) {
    return null;
  }

  if (typeof transform.toJSON === 'function') {
    return transform.toJSON();
  }

  if (!isObjectLike(transform)) {
    return null;
  }

  const { position = null, rotation = null, scale = null } = transform;
  return {
    position: position == null ? null : cloneVector(position),
    rotation: rotation == null ? null : cloneVector(rotation),
    scale: scale == null ? null : cloneVector(scale),
  };
};

const normalizeMetadata = (metadata) => {
  if (metadata == null) {
    return null;
  }

  if (typeof metadata.toJSON === 'function') {
    return metadata.toJSON();
  }

  if (isObjectLike(metadata)) {
    return { ...metadata };
  }

  return null;
};

const normalizeEnvironment = (environment) => {
  if (environment == null) {
    return null;
  }

  if (typeof environment.toJSON === 'function') {
    return environment.toJSON();
  }

  return isObjectLike(environment) ? { ...environment } : environment;
};

const convertChildren = (children) => {
  if (!Array.isArray(children) || children.length === 0) {
    return [];
  }

  return children.map((child) => toViewNode(child));
};

function toViewNode(modelNode = {}) {
  const { id, type } = modelNode;
  const children = convertChildren(modelNode.children);

  // Viewer nodes only keep structural data. Internal fields (signals, caches, etc.)
  // are intentionally dropped here so renderer code receives a predictable payload.
  return new ViewNode({
    id,
    type,
    transform: normalizeTransform(modelNode.transform),
    metadata: normalizeMetadata(modelNode.metadata),
    visible: true,
    tags: [],
    children,
  });
}

export function convertModelNodeToViewNode(modelNode = {}) {
  return toViewNode(modelNode);
}

export function convertModelSceneToViewScene(modelScene = {}) {
  const viewNodes = Array.isArray(modelScene.nodes) ? modelScene.nodes.map((node) => toViewNode(node)) : [];

  // Viewer scenes only need a subset of the authoring data. Engine-specific
  // details (statistics, editing state, etc.) remain on the model object.
  return new ViewScene({
    id: modelScene.id,
    nodes: viewNodes,
    environment: normalizeEnvironment(modelScene.environment),
    metadata: normalizeMetadata(modelScene.metadata),
  });
}
