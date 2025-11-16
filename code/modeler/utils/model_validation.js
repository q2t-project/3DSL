import { ValidationError } from '../../common/errors/index.js';
import { ensureSchemaPresence } from '../../common/utils/index.js';
import { validateInternalModel } from '../../common/validator/internalModelValidator.js';

export function assertModelSchema(payload, { schemaName = '3dsl-core-model' } = {}) {
  ensureSchemaPresence(schemaName, payload);
  const result = validateInternalModel(payload);
  if (!result.ok) {
    throw new ValidationError(result.errors?.[0]?.message ?? 'internal model is invalid');
  }
  return true;
}
