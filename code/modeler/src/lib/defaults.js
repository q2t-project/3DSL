import { createUuid } from './utils.js';

export const sceneDefaults = {
  background: '#000000'
};

export const nodeDefaults = {
  size: 1.0,
  color: '#808080',
  shape: 'sphere'
};

export const edgeDefaults = {
  directed: 'false',
  arrow: 'none',
  color: '#000000',
  curve: 'none',
  style: {
    color: '#000000',
    width: 1,
    dash: 'solid'
  }
};

export const textDefaults = {
  size: 16,
  color: '#000000',
  orientation: 'XY'
};

export const gltfDefaults = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
};

export const auxDefaults = {
  visible: true
};

export const baseMeta = {
  title: 'New 3DSD Scene',
  schema: 'https://example.com/3dss.schema.json'
};

export function createNode() {
  return {
    id: createUuid('node'),
    position: [0, 0, 0],
    ...nodeDefaults
  };
}

export function createEdge(nodes = []) {
  const first = nodes[0]?.id ?? '';
  const second = nodes[1]?.id ?? first ?? '';
  return {
    source: first ?? '',
    target: second ?? '',
    ...edgeDefaults,
    style: { ...edgeDefaults.style }
  };
}

export function createText() {
  return {
    content: '',
    position: [0, 0, 0],
    ...textDefaults
  };
}

export function createGltf() {
  return {
    src: '',
    position: [...gltfDefaults.position],
    rotation: [...gltfDefaults.rotation],
    scale: [...gltfDefaults.scale]
  };
}

export function createAux() {
  return {
    type: 'axis',
    ...auxDefaults
  };
}

export function createEmptyModel() {
  return {
    meta: { ...baseMeta },
    environment: {},
    background: sceneDefaults.background,
    nodes: [],
    edges: [],
    texts: [],
    gltf: [],
    aux: []
  };
}

export function applyDefaults(model) {
  const next = { ...createEmptyModel(), ...model };
  next.meta = { ...baseMeta, ...(model.meta ?? {}) };
  next.background = model.background ?? sceneDefaults.background;
  next.nodes = (model.nodes ?? []).map((node) => ({
    ...nodeDefaults,
    ...node,
    position: normalizeVec3(node.position)
  }));
  next.edges = (model.edges ?? []).map((edge) => ({
    ...edgeDefaults,
    ...edge,
    style: { ...edgeDefaults.style, ...(edge.style ?? {}) }
  }));
  next.texts = (model.texts ?? []).map((text) => ({
    ...textDefaults,
    ...text,
    position: normalizeVec3(text.position)
  }));
  next.gltf = (model.gltf ?? []).map((entry) => ({
    ...entry,
    position: normalizeVec3(entry.position ?? gltfDefaults.position),
    rotation: normalizeVec3(entry.rotation ?? gltfDefaults.rotation),
    scale: normalizeVec3(entry.scale ?? gltfDefaults.scale, 1)
  }));
  next.aux = (model.aux ?? []).map((entry) => ({
    ...auxDefaults,
    ...entry
  }));
  return next;
}

function normalizeVec3(vec, fill = 0) {
  if (!Array.isArray(vec) || vec.length !== 3) {
    return [fill, fill, fill === 1 ? 1 : fill];
  }
  return vec.map((v, index) => (typeof v === 'number' ? v : fill === 1 && index < 3 ? 1 : fill));
}
