// modeler → .3dss.json へのエクスポート窓口

import { ValidationError } from '../../common/errors/index.js';
import { validateWithSchema } from '../../common/schema/schema_validator.js';

const DEFAULT_SCHEMA = '3dsl-core-model';
const VECTOR_LENGTH = 3;
const DEFAULT_POSITION = [0, 0, 0];
const DEFAULT_ROTATION = [0, 0, 0];
const DEFAULT_SCALE = [1, 1, 1];

/**
 * ThreeDSSDocument を 3DSS JSON（core-model schema）へ変換する。
 * @param {import('../../common/core/modelTypes.js').ThreeDSSDocument | import('../../common/types/core.js').Model} doc
 * @param {{ schemaName?: string, validate?: boolean }} [options]
 * @returns {object}
 */
export function exportToThreeDss(doc, { schemaName = DEFAULT_SCHEMA, validate = true } = {}) {
  const payload = normalizeDocument(doc);
  if (validate) {
    validateExportPayload(payload, schemaName);
  }
  return payload;
}

// Legacy alias kept for backwards compatibility with earlier scaffolding.
export const exportTo3DSS = exportToThreeDss;

function normalizeDocument(doc) {
  const source = unwrapPlainObject(doc, 'document');
  const version = resolveVersion(source);
  const scene = normalizeScene(source.scene, 'scene');
  const metadata = normalizeMetadata(source.metadata ?? deriveMetadataFromDocumentMeta(source.document_meta));
  const payload = { version, scene };
  if (metadata !== undefined) {
    payload.metadata = metadata;
  }
  return payload;
}

function resolveVersion(doc) {
  if (typeof doc.version === 'string' && doc.version.trim()) {
    return doc.version.trim();
  }
  if (typeof doc.document_meta?.version === 'string' && doc.document_meta.version.trim()) {
    return doc.document_meta.version.trim();
  }
  throw new ValidationError('document.version must be a non-empty string');
}

function deriveMetadataFromDocumentMeta(meta) {
  if (!isObjectLike(meta)) {
    return undefined;
  }

  const derived = {};
  if (typeof meta.title === 'string' && meta.title.trim()) {
    derived.name = meta.title.trim();
  } else if (typeof meta.author === 'string' && meta.author.trim()) {
    derived.name = meta.author.trim();
  }

  if (Array.isArray(meta.tags)) {
    derived.tags = meta.tags.filter((tag) => typeof tag === 'string');
  }

  return Object.keys(derived).length ? derived : undefined;
}

function normalizeScene(scene, path) {
  const source = unwrapPlainObject(scene, path);
  const id = ensureNonEmptyString(source.id, `${path}.id`);
  const nodes = Array.isArray(source.nodes)
    ? source.nodes.map((node, index) => normalizeNode(node, `${path}.nodes[${index}]`))
    : [];

  const normalized = { id, nodes };
  if (source.metadata !== undefined) {
    normalized.metadata = normalizeMetadata(source.metadata);
  }

  return normalized;
}

function normalizeNode(node, path) {
  const source = unwrapPlainObject(node, path);
  const normalized = {
    id: ensureNonEmptyString(source.id, `${path}.id`),
    type: ensureNonEmptyString(source.type, `${path}.type`),
  };

  if (source.transform !== undefined) {
    normalized.transform = normalizeTransform(source.transform, `${path}.transform`);
  }

  if (source.metadata !== undefined) {
    normalized.metadata = normalizeMetadata(source.metadata);
  }

  if (Array.isArray(source.children) && source.children.length) {
    normalized.children = source.children.map((child, index) =>
      normalizeNode(child, `${path}.children[${index}]`)
    );
  }

  return normalized;
}

function normalizeTransform(transform, path) {
  const source = unwrapPlainObject(transform, path, { allowNull: true });
  if (source === null) {
    return null;
  }

  const normalized = {};
  if ('position' in source || Object.keys(source).length === 0) {
    normalized.position = normalizeVector(source.position, DEFAULT_POSITION, `${path}.position`);
  }
  if ('rotation' in source || Object.keys(source).length === 0) {
    normalized.rotation = normalizeVector(source.rotation, DEFAULT_ROTATION, `${path}.rotation`);
  }
  if ('scale' in source || Object.keys(source).length === 0) {
    normalized.scale = normalizeVector(source.scale, DEFAULT_SCALE, `${path}.scale`);
  }
  return normalized;
}

function normalizeVector(axis, fallback, path) {
  if (Array.isArray(axis) && axis.length === VECTOR_LENGTH && axis.every(Number.isFinite)) {
    return axis.map((value) => Number(value));
  }
  if (axis !== undefined) {
    throw new ValidationError(`${path} must be an array of ${VECTOR_LENGTH} finite numbers`);
  }
  return [...fallback];
}

function normalizeMetadata(metadata) {
  if (metadata === undefined) {
    return { tags: [] };
  }

  if (metadata === null) {
    return null;
  }

  const source = unwrapPlainObject(metadata, 'metadata');
  const normalized = {};

  if ('name' in source) {
    normalized.name = source.name == null ? null : String(source.name);
  }

  if (Array.isArray(source.tags)) {
    normalized.tags = source.tags.filter((tag) => typeof tag === 'string');
  } else {
    normalized.tags = [];
  }

  for (const [key, value] of Object.entries(source)) {
    if (key === 'name' || key === 'tags') {
      continue;
    }
    normalized[key] = value;
  }

  return normalized;
}

function unwrapPlainObject(value, path, { allowNull = false } = {}) {
  if (value && typeof value.toJSON === 'function') {
    return unwrapPlainObject(value.toJSON(), path, { allowNull });
  }

  if (value === null) {
    if (allowNull) {
      return null;
    }
    throw new ValidationError(`${path} must be an object`);
  }

  if (!isObjectLike(value)) {
    throw new ValidationError(`${path} must be an object`);
  }

  return value;
}

function ensureNonEmptyString(value, path) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  throw new ValidationError(`${path} must be a non-empty string`);
}

function isObjectLike(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateExportPayload(payload, schemaName) {
  const { valid, errors } = validateWithSchema(schemaName, payload);
  if (!valid) {
    throw new ValidationError(formatSchemaErrors(errors, schemaName));
  }
}

function formatSchemaErrors(errors = [], basePath = 'model') {
  if (!errors?.length) {
    return `${basePath} is invalid`;
  }

  return errors
    .map((error) => {
      if (error.keyword === 'required' && error.params?.missingProperty) {
        return `${basePath}${error.instancePath || ''} is missing required property '${error.params.missingProperty}'`;
      }
      const pointer = error.instancePath || '';
      return `${basePath}${pointer} ${error.message ?? 'is invalid'}`.trim();
    })
    .join('; ');
}
