import { Model } from '../types/index.js';
import { ValidationError } from '../errors/index.js';
import { generateId } from '../utils/id.js';
import { validate3Dss } from '../validator/threeDssValidator.js';
import { validateInternalModel } from '../validator/internalModelValidator.js';

const VECTOR_LENGTH = 3;
const DEFAULT_POSITION = [0, 0, 0];
const DEFAULT_ROTATION = [0, 0, 0];
const DEFAULT_SCALE = [1, 1, 1];
const NodeBuffer = typeof Buffer !== 'undefined' ? Buffer : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

export function convert3DssToInternalModel(doc = {}) {
  const version = resolveVersion(doc);
  const metadata = buildModelMetadata(doc);
  const scene = buildScene(doc);
  return new Model({ version, scene, metadata });
}

export async function importModelFrom3DssSource(source, { skipInternalValidation = false } = {}) {
  const resolved = await source;
  const doc = normalize3DssInput(resolved);

  const schemaResult = validate3Dss(doc);
  if (!schemaResult.ok) {
    throw new ValidationError(format3DssErrors(schemaResult.errors));
  }

  const model = convert3DssToInternalModel(doc);

  if (!skipInternalValidation) {
    const internalResult = validateInternalModel(model);
    if (!internalResult.ok && internalResult.errors?.length) {
      console.warn('[3DSL importer] internal model validation warnings:', internalResult.errors);
    }
  }

  return model;
}

function normalize3DssInput(source) {
  if (source == null) {
    throw new ValidationError('3DSS source is required');
  }

  if (NodeBuffer?.isBuffer(source)) {
    return normalize3DssInput(source.toString('utf8'));
  }

  if (source instanceof ArrayBuffer) {
    return normalize3DssInput(decodeUtf8(source));
  }

  if (ArrayBuffer.isView(source)) {
    return normalize3DssInput(decodeUtf8(source));
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) {
      throw new ValidationError('3DSS JSON input cannot be empty');
    }
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new ValidationError(`Failed to parse 3DSS JSON: ${error.message}`, { cause: error });
    }
  }

  if (typeof source === 'object') {
    return source;
  }

  throw new ValidationError('3DSS source must be an object or JSON string');
}

function decodeUtf8(value) {
  if (NodeBuffer) {
    if (NodeBuffer.isBuffer(value)) {
      return value.toString('utf8');
    }
    if (value instanceof ArrayBuffer) {
      return NodeBuffer.from(value).toString('utf8');
    }
    if (ArrayBuffer.isView(value)) {
      return NodeBuffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf8');
    }
  }
  if (textDecoder) {
    if (value instanceof ArrayBuffer) {
      return textDecoder.decode(value);
    }
    if (ArrayBuffer.isView(value)) {
      return textDecoder.decode(value);
    }
  }
  throw new ValidationError('Binary 3DSS sources are not supported in this environment');
}

function format3DssErrors(errors = []) {
  if (!errors.length) {
    return '3DSS document is invalid';
  }

  return errors
    .map((error) => {
      if (error.keyword === 'required' && error.params?.missingProperty) {
        return `${error.instancePath || '/'} is missing required property '${error.params.missingProperty}'`;
      }
      return `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim();
    })
    .join('; ');
}

function resolveVersion(doc) {
  const version = doc?.document_meta?.version;
  if (typeof version === 'string' && version.trim()) {
    return version.trim();
  }
  return '1.0.0';
}

function buildModelMetadata(doc) {
  const meta = doc?.document_meta ?? {};
  const metadata = {
    name: deriveDocumentName(meta),
    tags: Array.isArray(meta.tags) ? meta.tags.filter((tag) => typeof tag === 'string') : [],
  };

  for (const [key, value] of Object.entries(meta)) {
    if (key === 'tags' || key === 'title' || key === 'author' || key === 'version') {
      continue;
    }
    if (key === 'document_uuid') {
      metadata.sourceDocumentUuid = value;
      continue;
    }
    if (key === 'schema_uri') {
      metadata.schemaUri = value;
      continue;
    }
    if (metadata[key] === undefined) {
      metadata[key] = value;
    }
  }

  return metadata;
}

function deriveDocumentName(meta) {
  if (typeof meta.title === 'string' && meta.title.trim()) {
    return meta.title.trim();
  }
  if (typeof meta.author === 'string' && meta.author.trim()) {
    return meta.author.trim();
  }
  if (typeof meta.document_uuid === 'string' && meta.document_uuid.trim()) {
    return meta.document_uuid.trim();
  }
  return null;
}

function buildScene(doc) {
  if (isObjectLike(doc?.scene)) {
    const source = doc.scene;
    const id = ensureString(source.id) ?? deriveSceneId(doc);
    const metadata = isObjectLike(source.metadata) ? source.metadata : buildSceneMetadata(doc);
    const nodes = Array.isArray(source.nodes) ? source.nodes : [];
    return { id, nodes, metadata };
  }

  return {
    id: deriveSceneId(doc),
    nodes: convertPointsToNodes(doc?.points ?? []),
    metadata: buildSceneMetadata(doc),
  };
}

function deriveSceneId(doc) {
  if (typeof doc?.scene?.id === 'string' && doc.scene.id.trim()) {
    return doc.scene.id.trim();
  }
  const uuid = doc?.document_meta?.document_uuid;
  if (typeof uuid === 'string' && uuid.trim()) {
    return `scene-${uuid.trim()}`;
  }
  return generateId('scene');
}

function buildSceneMetadata(doc) {
  const meta = doc?.document_meta ?? {};
  const name = typeof meta.title === 'string' && meta.title.trim() ? meta.title.trim() : deriveDocumentName(meta);
  return { name, tags: [] };
}

function convertPointsToNodes(points = []) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }
  return points.map((point, index) => convertPointToNode(point, index));
}

function convertPointToNode(point, index) {
  const source = point ?? {};
  const id = ensureString(source.id) ?? generateId(`node-${index + 1}`);
  const transform = {
    position: extractVector3(source.appearance?.position ?? source.appearance?.marker?.offset, DEFAULT_POSITION),
    rotation: extractVector3(source.appearance?.marker?.common?.orientation, DEFAULT_ROTATION),
    scale: extractVector3(source.appearance?.marker?.common?.scale, DEFAULT_SCALE),
  };

  return {
    id,
    type: ensureString(source.type) ?? 'point',
    transform,
    metadata: {
      name: derivePointName(source) ?? id,
      tags: [],
    },
    children: [],
  };
}

function derivePointName(point) {
  const name = point?.signification?.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  if (isObjectLike(name)) {
    if (typeof name.en === 'string' && name.en.trim()) {
      return name.en.trim();
    }
    if (typeof name.ja === 'string' && name.ja.trim()) {
      return name.ja.trim();
    }
  }
  return null;
}

function ensureString(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return null;
}

function extractVector3(value, fallback) {
  if (Array.isArray(value) && value.length === VECTOR_LENGTH && value.every(Number.isFinite)) {
    return value.map((entry) => Number(entry));
  }
  if (isObjectLike(value) && Array.isArray(value.coord)) {
    return extractVector3(value.coord, fallback);
  }
  return [...fallback];
}

function isObjectLike(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
