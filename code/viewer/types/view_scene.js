/**
 * Lightweight scene graph representations consumed by the viewer.
 * These classes intentionally avoid inheriting from the heavier model
 * counterparts so that the renderer only receives the fields it needs.
 */
export class ViewNode {
  constructor({
    id,
    type,
    transform = null,
    metadata = null,
    visible = true,
    tags = [],
    children = [],
  } = {}) {
    this.id = id;
    this.type = type;
    this.transform = transform ?? null;
    this.metadata = metadata ?? null;
    this.visible = typeof visible === 'boolean' ? visible : true;
    this.tags = Array.isArray(tags) ? [...tags] : [];
    this.children = Array.isArray(children) ? [...children] : [];
  }
}

export class ViewScene {
  constructor({ id, nodes = [], environment = null, metadata = null } = {}) {
    this.id = id;
    this.nodes = Array.isArray(nodes) ? [...nodes] : [];
    this.environment = environment ?? null;
    this.metadata = metadata ?? null;
  }
}
