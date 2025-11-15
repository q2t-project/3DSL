export class ModelStore {
  constructor() {
    this.nodes = new Map();
  }

  add(node) {
    this.nodes.set(node.id, node);
  }

  get(id) {
    return this.nodes.get(id);
  }

  list() {
    return Array.from(this.nodes.values());
  }

  clear() {
    this.nodes.clear();
  }
}
