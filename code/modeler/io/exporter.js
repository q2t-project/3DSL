import { validateModelStructure } from '../../common/utils/index.js';

export function exportModelToJSON(model, { space = 2 } = {}) {
  if (!model) {
    throw new TypeError('model is required for export');
  }

  const serializable = typeof model.toJSON === 'function' ? model.toJSON() : model;
  validateModelStructure(serializable);
  return JSON.stringify(serializable, null, space);
}
