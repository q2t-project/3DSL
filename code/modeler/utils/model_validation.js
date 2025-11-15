import { ensureSchemaPresence } from '../../common/utils/index.js';

export function assertModelSchema(payload, { schemaName = '3dsl-core-model' } = {}) {
  return ensureSchemaPresence(schemaName, payload);
}
