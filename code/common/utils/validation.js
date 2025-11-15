import { ValidationError } from '../errors/index.js';

const VECTOR_LENGTH = 3;

const isObjectLike = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

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
  const target = transform ?? {};

  if (!isObjectLike(target)) {
    throw new ValidationError(`${path} must be an object with position, rotation and scale`);
  }

  validateVector3(target.position ?? [0, 0, 0], `${path}.position`);
  validateVector3(target.rotation ?? [0, 0, 0], `${path}.rotation`);
  validateVector3(target.scale ?? [1, 1, 1], `${path}.scale`);

  return true;
}

export function validateMetadataStructure(metadata = {}, path = 'metadata') {
  const target = metadata ?? {};

  if (!isObjectLike(target)) {
    throw new ValidationError(`${path} must be an object`);
  }

  if ('name' in target && target.name != null && typeof target.name !== 'string') {
    throw new ValidationError(`${path}.name must be a string when defined`);
  }

  if ('tags' in target) {
    if (!Array.isArray(target.tags)) {
      throw new ValidationError(`${path}.tags must be an array of strings`);
    }

    target.tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        throw new ValidationError(`${path}.tags[${index}] must be a string`);
      }
    });
  }

  return true;
}

export function validateNodeStructure(node, path = 'node') {
  if (!isObjectLike(node)) {
    throw new ValidationError(`${path} must be an object`);
  }

  if (typeof node.id !== 'string' || !node.id.trim()) {
    throw new ValidationError(`${path}.id must be a non-empty string`);
  }

  if (typeof node.type !== 'string' || !node.type.trim()) {
    throw new ValidationError(`${path}.type must be a non-empty string`);
  }

  validateTransformStructure(node.transform ?? {}, `${path}.transform`);
  validateMetadataStructure(node.metadata ?? {}, `${path}.metadata`);

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      throw new ValidationError(`${path}.children must be an array when provided`);
    }

    node.children.forEach((child, index) => {
      validateNodeStructure(child, `${path}.children[${index}]`);
    });
  }

  return true;
}

export function validateSceneStructure(scene, path = 'scene') {
  if (!isObjectLike(scene)) {
    throw new ValidationError(`${path} must be an object`);
  }

  if (typeof scene.id !== 'string' || !scene.id.trim()) {
    throw new ValidationError(`${path}.id must be a non-empty string`);
  }

  if (!Array.isArray(scene.nodes)) {
    throw new ValidationError(`${path}.nodes must be an array of nodes`);
  }

  scene.nodes.forEach((node, index) => {
    validateNodeStructure(node, `${path}.nodes[${index}]`);
  });

  validateMetadataStructure(scene.metadata ?? {}, `${path}.metadata`);

  return true;
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
