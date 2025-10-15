import coreValidate, {
  attachDocumentMeta,
  getValidatorMetadata,
  newDocumentMeta,
  normalizeModel,
  setLanguageResolver,
  validateModel,
} from './core/validator-core.js';

export {
  attachDocumentMeta,
  getValidatorMetadata,
  newDocumentMeta,
  normalizeModel,
  setLanguageResolver,
  validateModel,
};

export function setValidatorLanguageResolver(resolver) {
  setLanguageResolver(resolver);
}

export function validate(model, options = {}) {
  return validateModel(model, options);
}

export default coreValidate;
