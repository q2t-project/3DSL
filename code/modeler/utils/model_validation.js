import { ensureSchemaPresence, validateModelStructure } from '../../common/utils/index.js';

export function assertModelSchema(payload, { schemaName = '3dsl-core-model' } = {}) {
  ensureSchemaPresence(schemaName, payload);
  return validateModelStructure(payload);
}
