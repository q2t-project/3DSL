import { Node } from '../../common/types/index.js';
import { generateId, ensureSchemaPresence, validateNodeStructure } from '../../common/utils/index.js';

const DEFAULT_SCHEMA = '3dsl-core-node';

export function createNode({ type, kind, transform, metadata, children = [], id } = {}) {
  const node = new Node({
    id: id ?? generateId('node'),
    type: type ?? kind,
    transform,
    metadata,
    children,
  });

  validateNodeStructure(node);
  return node;
}

export function validateNode(node, { schemaName = DEFAULT_SCHEMA } = {}) {
  ensureSchemaPresence(schemaName, node);
  validateNodeStructure(node);
  return node;
}

export function transformNode(node, transformer = (value) => value) {
  if (typeof transformer !== 'function') {
    throw new TypeError('transformer must be a function');
  }

  return transformer(node);
}

export function exportNode(node) {
  return JSON.parse(JSON.stringify(node));
}
