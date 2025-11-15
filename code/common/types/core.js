/**
 * Core domain types shared between modeler and viewer layers.
 * These are intentionally lightweight data containers that only
 * capture the structural shape described in the specs.
 */

export class Transform {
  constructor({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
}

export class CoreNode {
  constructor({ id, kind, transform = new Transform(), props = {} } = {}) {
    this.id = id;
    this.kind = kind;
    this.transform = transform;
    this.props = props;
  }
}

export class SceneObject {
  constructor({ id, nodeRef, transform = new Transform(), metadata = {} } = {}) {
    this.id = id;
    this.nodeRef = nodeRef;
    this.transform = transform;
    this.metadata = metadata;
  }
}

export class ViewerScene {
  constructor({ id, objects = [], environment = {} } = {}) {
    this.id = id;
    this.objects = objects;
    this.environment = environment;
  }
}
