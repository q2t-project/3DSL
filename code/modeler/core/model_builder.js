import { CoreNode } from '../../common/types/index.js';
import { generateId, ensureSchemaPresence } from '../../common/utils/index.js';

const DEFAULT_SCHEMA = '3dsl-core';

export function createNode({ kind, transform, props, id } = {}) {
  return new CoreNode({
    id: id ?? generateId('core-node'),
    kind,
    transform,
    props,
  });
}

export function validateNode(node, { schemaName = DEFAULT_SCHEMA } = {}) {
  ensureSchemaPresence(schemaName, node);
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
