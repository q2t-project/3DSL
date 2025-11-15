import Ajv from '../../vendor/ajv/dist/ajv.bundle.js';
import addFormats from '../../vendor/ajv-formats/dist/index.js';
import { schemaRegistry } from './index.js';

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});
addFormats(ajv);
ajv.addFormat('finite-number', {
  type: 'number',
  validate: Number.isFinite,
});

const schemaKeys = new Map();
const validatorCache = new Map();

for (const [name, schema] of Object.entries(schemaRegistry)) {
  const key = schema?.$id ?? name;
  schemaKeys.set(name, key);
  ajv.addSchema(schema, key);
}

function getValidator(schemaName) {
  if (!schemaKeys.has(schemaName)) {
    throw new Error(`Schema not found: ${schemaName}`);
  }

  if (!validatorCache.has(schemaName)) {
    const key = schemaKeys.get(schemaName);
    const validateFn = ajv.getSchema(key) ?? ajv.compile(schemaRegistry[schemaName]);
    validatorCache.set(schemaName, validateFn);
  }

  return validatorCache.get(schemaName);
}

export function validateWithSchema(schemaName, payload) {
  const validateFn = getValidator(schemaName);
  const valid = validateFn(payload);
  return { valid, errors: validateFn.errors ?? [] };
}

export function listSchemas() {
  return Array.from(schemaKeys.keys());
}
