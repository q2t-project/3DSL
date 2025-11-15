import { ensureSchemaPresence } from '../../common/utils/index.js';

const DEFAULT_SCHEMA = '3dsl-core-model';

export function importModelFromJSON(jsonInput, { schemaName = DEFAULT_SCHEMA } = {}) {
  const payload = typeof jsonInput === 'string' ? JSON.parse(jsonInput || '{}') : jsonInput;
  ensureSchemaPresence(schemaName, payload);
  return payload;
}
