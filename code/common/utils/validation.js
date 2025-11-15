import { ValidationError } from '../errors/index.js';
import { validateWithSchema } from '../schema/schema_validator.js';

const VECTOR_LENGTH = 3;

const isObjectLike = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const INSTANCE_PATH_SEPARATOR = '/';

const isArrayIndexSegment = (segment) => /^\d+$/.test(segment);

const decodeJsonPointer = (segment = '') => segment.replace(/~1/g, '/').replace(/~0/g, '~');

const formatInstancePath = (instancePath = '') => {
  if (!instancePath) {
    return '';
  }

  return instancePath
    .split(INSTANCE_PATH_SEPARATOR)
    .filter(Boolean)
    .map(decodeJsonPointer)
    .map((segment) => (isArrayIndexSegment(segment) ? `[${segment}]` : `.${segment}`))
    .join('');
};

function stripUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }

  if (isObjectLike(value)) {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      if (entry !== undefined) {
        acc[key] = stripUndefinedDeep(entry);
      }
      return acc;
    }, {});
  }

  return value;
}

const formatSchemaErrors = (errors = [], basePath = 'schema') => {
  if (!errors.length) {
    return `${basePath} is invalid`;
  }

  return errors
    .map((error) => {
      const pointer = formatInstancePath(error.instancePath);
      const location = `${basePath}${pointer}`;

      if (error.keyword === 'required' && error.params?.missingProperty) {
        return `${location}.${error.params.missingProperty} is required`;
      }

      return `${location} ${error.message ?? 'is invalid'}`.trim();
    })
    .join('; ');
};

function runSchemaValidation(schemaName, target, path = schemaName) {
  const payload = stripUndefinedDeep(target ?? {});
  const { valid, errors } = validateWithSchema(schemaName, payload);
  if (!valid) {
    throw new ValidationError(formatSchemaErrors(errors, path));
  }
  return true;
}

export function ensureSchemaPresence(schemaName, payload) {
  if (typeof schemaName !== 'string' || !schemaName.trim()) {
    throw new ValidationError('Schema name is required for validation');
  }

  if (payload == null) {
    throw new ValidationError(`Payload is required for schema ${schemaName}`);
  }

  return true;
}

export function validateVector3(axis, path = 'vector') {
  if (!Array.isArray(axis) || axis.length !== VECTOR_LENGTH) {
    throw new ValidationError(`${path} must be an array of ${VECTOR_LENGTH} numbers`);
  }

  axis.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${path}[${index}] must be a finite number`);
    }
  });

  return true;
}

export function validateTransformStructure(transform = {}, path = 'transform') {
  return runSchemaValidation('transform', transform ?? {}, path);
}

export function validateMetadataStructure(metadata = {}, path = 'metadata') {
  return runSchemaValidation('metadata', metadata ?? {}, path);
}

export function validateNodeStructure(node, path = 'node') {
  return runSchemaValidation('node', node ?? {}, path);
}

export function validateSceneStructure(scene, path = 'scene') {
  return runSchemaValidation('scene', scene ?? {}, path);
}

export function validateModelStructure(model, path = 'model') {
  if (!isObjectLike(model)) {
    throw new ValidationError(`${path} must be an object`);
  }

  if (!model.scene) {
    throw new ValidationError(`${path}.scene is required`);
  }

  if (typeof model.version !== 'string' || !model.version.trim()) {
    throw new ValidationError(`${path}.version must be a non-empty string`);
  }

  validateSceneStructure(model.scene, `${path}.scene`);
  validateMetadataStructure(model.metadata ?? {}, `${path}.metadata`);

  return true;
}
