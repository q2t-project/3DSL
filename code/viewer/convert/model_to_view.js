import { ViewNode, ViewScene } from '../types/view_scene.js';

const DEFAULT_POSITION = Object.freeze({ x: 0, y: 0, z: 0 });
const DEFAULT_ENVIRONMENT = Object.freeze({
  background: '#101820',
  gridEnabled: true,
  axisEnabled: true,
});

const isObjectLike = (value) => typeof value === 'object' && value !== null;

const isVectorTuple = (value) => Array.isArray(value) && value.length === 3;

const ensureFiniteNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const toPositionFromTuple = (tuple = []) => ({
  x: ensureFiniteNumber(tuple[0]),
  y: ensureFiniteNumber(tuple[1]),
  z: ensureFiniteNumber(tuple[2]),
});

const toPositionFromObject = (pos = {}) => ({
  x: ensureFiniteNumber(pos.x),
  y: ensureFiniteNumber(pos.y),
  z: ensureFiniteNumber(pos.z),
});

const normalizePos = (source) => {
  if (isVectorTuple(source)) {
    return toPositionFromTuple(source);
  }

  if (isObjectLike(source)) {
    return toPositionFromObject(source);
  }

  return { ...DEFAULT_POSITION };
};

const extractTransformPosition = (transform) => {
  if (!isObjectLike(transform)) {
    return null;
  }

  if (isVectorTuple(transform)) {
    return transform;
  }

  if (Array.isArray(transform.position)) {
    return transform.position;
  }

  if (isObjectLike(transform.position)) {
    return transform.position;
  }

  return null;
};

const unwrapMetadata = (metadata) => {
  if (metadata == null) {
    return null;
  }

  if (typeof metadata.toJSON === 'function') {
    try {
      return metadata.toJSON();
    } catch (error) {
      return null;
    }
  }

  return isObjectLike(metadata) ? { ...metadata } : null;
};

const normalizeTags = (node) => {
  if (Array.isArray(node?.tags)) {
    return node.tags.filter((tag) => typeof tag === 'string');
  }

  const metadata = unwrapMetadata(node?.metadata);
  if (metadata && Array.isArray(metadata.tags)) {
    return metadata.tags.filter((tag) => typeof tag === 'string');
  }

  return [];
};

const normalizeExtras = (node) => {
  const metadata = unwrapMetadata(node?.metadata);
  if (!metadata) {
    return node?.type ? { type: node.type } : {};
  }

  const { tags, ...extras } = metadata;
  if (node?.type && !extras.type) {
    extras.type = node.type;
  }
  return extras;
};

const flattenNodes = (nodes = []) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return [];
  }

  const queue = [...nodes];
  const result = [];

  while (queue.length) {
    const node = queue.shift();
    if (!isObjectLike(node)) {
      continue;
    }

    result.push(convertNode(node));
    if (Array.isArray(node.children) && node.children.length) {
      queue.push(...node.children);
    }
  }

  return result;
};

const normalizeEnvironment = (environment) => {
  if (!isObjectLike(environment)) {
    return { ...DEFAULT_ENVIRONMENT };
  }

  return {
    background:
      typeof environment.background === 'string'
        ? environment.background
        : DEFAULT_ENVIRONMENT.background,
    gridEnabled:
      typeof environment.gridEnabled === 'boolean'
        ? environment.gridEnabled
        : DEFAULT_ENVIRONMENT.gridEnabled,
    axisEnabled:
      typeof environment.axisEnabled === 'boolean'
        ? environment.axisEnabled
        : DEFAULT_ENVIRONMENT.axisEnabled,
  };
};

export function convertNode(modelNode = {}) {
  const position = extractTransformPosition(modelNode.transform) ?? modelNode.pos ?? modelNode.position;
  return new ViewNode({
    id: typeof modelNode.id === 'string' ? modelNode.id : undefined,
    pos: normalizePos(position),
    visible: typeof modelNode.visible === 'boolean' ? modelNode.visible : true,
    tags: normalizeTags(modelNode),
    extras: normalizeExtras(modelNode),
  });
}

export function convertScene(modelScene = {}) {
  const nodes = flattenNodes(modelScene.nodes);
  return new ViewScene({
    id: typeof modelScene.id === 'string' ? modelScene.id : undefined,
    nodes,
    environment: normalizeEnvironment(modelScene.environment),
  });
}
