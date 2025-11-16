import { Model } from '../../common/types/index.js';
import { ValidationError } from '../../common/errors/index.js';
import { ensureSchemaPresence, validateModelStructure } from '../../common/utils/index.js';

const DEFAULT_SCHEMA = '3dsl-core-model';

function parseInput(jsonInput) {
  if (typeof jsonInput === 'string') {
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      throw new ValidationError('JSON input cannot be empty');
    }
    return JSON.parse(trimmed);
  }

  return jsonInput;
}

export function importModelFromJSON(jsonInput, { schemaName = DEFAULT_SCHEMA } = {}) {
  const payload = parseInput(jsonInput);
  ensureSchemaPresence(schemaName, payload);
  validateModelStructure(payload);
  return new Model(payload);
}
