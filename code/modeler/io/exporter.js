import { ValidationError } from '../../common/errors/index.js';
import { validateInternalModel } from '../../common/validator/internalModelValidator.js';

export function exportModelToJSON(model, { space = 2 } = {}) {
  if (!model) {
    throw new TypeError('model is required for export');
  }

  const serializable = typeof model.toJSON === 'function' ? model.toJSON() : model;
  const validation = validateInternalModel(serializable);
  if (!validation.ok) {
    const reason = validation.errors?.map((error) => error.message).join('; ') ?? 'internal model is invalid';
    throw new ValidationError(reason);
  }
  return JSON.stringify(serializable, null, space);
}
