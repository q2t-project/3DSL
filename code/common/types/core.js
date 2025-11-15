/**
 * Core domain types shared between modeler and viewer layers.
 * These classes encode the structural contract used when importing,
 * exporting and validating 3DSL documents.
 */

const VECTOR_AXIS_COUNT = 3;

const cloneAxis = (axis, fallback) => {
  if (!Array.isArray(axis)) {
    return [...fallback];
  }
  return axis.length === VECTOR_AXIS_COUNT ? [...axis] : [...fallback];
};

export class Transform {
  constructor({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
    this.position = cloneAxis(position, [0, 0, 0]);
    this.rotation = cloneAxis(rotation, [0, 0, 0]);
    this.scale = cloneAxis(scale, [1, 1, 1]);
  }

  toJSON() {
    return {
      position: [...this.position],
      rotation: [...this.rotation],
      scale: [...this.scale],
    };
  }
}

const RESERVED_METADATA_KEYS = new Set(['name', 'tags']);

export class Metadata {
  constructor(entries = {}) {
    const source = entries instanceof Metadata ? entries.toJSON() : entries || {};
    const { name = null, tags = [], ...extras } = source;
    this.name = typeof name === 'string' ? name : name ?? null;
    this.tags = Array.isArray(tags) ? [...tags] : [];
    this.extras = { ...extras };
  }

  get(key) {
    if (key === 'name') {
      return this.name;
    }
    if (key === 'tags') {
      return this.tags;
    }
    return this.extras[key];
  }

  set(key, value) {
    if (key === 'name') {
      this.name = value;
      return;
    }
    if (key === 'tags') {
      this.tags = Array.isArray(value) ? [...value] : [];
      return;
    }
    if (RESERVED_METADATA_KEYS.has(key)) {
      throw new Error(`Key "${key}" is reserved and managed internally.`);
    }
    this.extras[key] = value;
  }

  toJSON() {
    const payload = { ...this.extras };
    if (this.name != null) {
      payload.name = this.name;
    }
    payload.tags = [...this.tags];
    return payload;
  }
}

export class Node {
  constructor({ id, type, transform = new Transform(), metadata = new Metadata(), children = [] } = {}) {
    this.id = id;
    this.type = type;
    this.transform = transform instanceof Transform ? transform : new Transform(transform);
    this.metadata = metadata instanceof Metadata ? metadata : new Metadata(metadata);
    this.children = Array.isArray(children)
      ? children.map((child) => (child instanceof Node ? child : new Node(child)))
      : [];
  }

  toJSON() {
    const payload = {
      id: this.id,
      type: this.type,
      transform: this.transform.toJSON(),
      metadata: this.metadata.toJSON(),
    };

    if (this.children.length) {
      payload.children = this.children.map((child) => child.toJSON());
    }

    return payload;
  }
}

export class Scene {
  constructor({ id, nodes = [], metadata = new Metadata() } = {}) {
    this.id = id;
    this.nodes = Array.isArray(nodes)
      ? nodes.map((node) => (node instanceof Node ? node : new Node(node)))
      : [];
    this.metadata = metadata instanceof Metadata ? metadata : new Metadata(metadata);
  }

  toJSON() {
    return {
      id: this.id,
      nodes: this.nodes.map((node) => node.toJSON()),
      metadata: this.metadata.toJSON(),
    };
  }
}

export class Model {
  constructor({ version = '1.0.0', scene = new Scene(), metadata = new Metadata() } = {}) {
    this.version = version;
    this.scene = scene instanceof Scene ? scene : new Scene(scene);
    this.metadata = metadata instanceof Metadata ? metadata : new Metadata(metadata);
  }

  toJSON() {
    return {
      version: this.version,
      scene: this.scene ? this.scene.toJSON() : undefined,
      metadata: this.metadata.toJSON(),
    };
  }
}

export class SceneObject {
  constructor({ id, nodeRef, transform = new Transform(), metadata = new Metadata() } = {}) {
    this.id = id;
    this.nodeRef = nodeRef;
    this.transform = transform instanceof Transform ? transform : new Transform(transform);
    this.metadata = metadata instanceof Metadata ? metadata : new Metadata(metadata);
  }

  toJSON() {
    return {
      id: this.id,
      nodeRef: this.nodeRef,
      transform: this.transform.toJSON(),
      metadata: this.metadata.toJSON(),
    };
  }
}

export class ViewerScene extends Scene {
  constructor({ environment = {}, ...sceneProps } = {}) {
    super(sceneProps);
    this.environment = { ...environment };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      environment: { ...this.environment },
    };
  }
}
