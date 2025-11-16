import { ValidationError } from '../errors/index.js';
import { validateModelStructure } from '../utils/validation.js';

function normalizeError(error) {
  if (!error) {
    return { message: 'Unknown validation error' };
  }

  if (error instanceof ValidationError) {
    return { message: error.message };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: String(error) };
}

export function validateInternalModel(model) {
  try {
    validateModelStructure(model);
    return { ok: true, errors: null };
  } catch (error) {
    return { ok: false, errors: [normalizeError(error)] };
  }
}
