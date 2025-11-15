/**
 * Lightweight viewer-specific structures. These classes intentionally avoid
 * referencing the heavier model-layer types so the renderer receives only
 * the fields it needs.
 */

const DEFAULT_POSITION = Object.freeze({ x: 0, y: 0, z: 0 });
const DEFAULT_ENVIRONMENT = Object.freeze({
  background: '#101820',
  gridEnabled: true,
  axisEnabled: true,
});

const isObjectLike = (value) => typeof value === 'object' && value !== null;

const clonePosition = (pos = DEFAULT_POSITION) => ({
  x: Number.isFinite(pos.x) ? pos.x : DEFAULT_POSITION.x,
  y: Number.isFinite(pos.y) ? pos.y : DEFAULT_POSITION.y,
  z: Number.isFinite(pos.z) ? pos.z : DEFAULT_POSITION.z,
});

const cloneTags = (tags) =>
  Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string').map((tag) => `${tag}`) : [];

const cloneExtras = (extras) => (isObjectLike(extras) ? { ...extras } : {});

const cloneNodes = (nodes) => {
  if (!Array.isArray(nodes)) {
    return [];
  }
  return nodes.map((node) => (node instanceof ViewNode ? node : new ViewNode(node)));
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

export class ViewNode {
  constructor({ id, pos = DEFAULT_POSITION, visible = true, tags = [], extras = {} } = {}) {
    this.id = id;
    this.pos = clonePosition(pos);
    this.visible = typeof visible === 'boolean' ? visible : true;
    this.tags = cloneTags(tags);
    this.extras = cloneExtras(extras);
  }
}

export class ViewScene {
  constructor({ id, nodes = [], environment = DEFAULT_ENVIRONMENT } = {}) {
    this.id = id;
    this.nodes = cloneNodes(nodes);
    this.environment = normalizeEnvironment(environment);
  }
}
