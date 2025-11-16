import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

import { createEmptyDocument } from '../../common/core/modelTypes.js';
import { schemaRegistry } from '../../common/schema/index.js';
import { generateId } from '../../common/utils/id.js';

const require = createRequire(import.meta.url);

const prepSchema = safeLoadPrepSchema();
const PREP_SCHEMA_ID = prepSchema?.$id;
const PREP_SCHEMA_REGISTRY_KEY = registerPrepSchema(prepSchema);

const { validateWithSchema, listSchemas } = await import('../../common/schema/schema_validator.js');
const PREP_SCHEMA_NAME = resolvePrepSchemaName();
const PREP_SCHEMA_UNAVAILABLE_ERROR =
  PREP_SCHEMA_NAME ? null : 'prep schema is not registered in the validator';

const DEFAULT_POINT_POSITION = [0, 0, 0];

/**
 * @param {unknown} prepJson
 * @returns {{
 *   ok: boolean,
 *   document?: import('../../common/core/modelTypes.js').ThreeDSSDocument,
 *   errors?: string[],
 *   warnings?: string[]
 * }}
 */
export function importFromPrep(prepJson) {
  const parsedResult = normalizePrepInput(prepJson);
  if (!parsedResult.ok) {
    return parsedResult;
  }

  if (PREP_SCHEMA_UNAVAILABLE_ERROR) {
    return { ok: false, errors: [PREP_SCHEMA_UNAVAILABLE_ERROR] };
  }

  const validationResult = validatePrepPayload(parsedResult.payload);
  if (!validationResult.ok) {
    return validationResult;
  }

  const { document, warnings } = convertToDocument(validationResult.payload);
  const result = { ok: true, document };
  if (warnings.length) {
    result.warnings = warnings;
  }
  return result;
}

function safeLoadPrepSchema() {
  try {
    return require('../../../schemas/3DSS-prep.schema.json');
  } catch {
    return null;
  }
}

function registerPrepSchema(schema) {
  if (!schema) {
    return null;
  }

  const existingEntry = Object.entries(schemaRegistry).find(([, entry]) => entry?.$id === schema.$id);
  if (existingEntry) {
    return existingEntry[0];
  }

  const derivedName = '3dss-prep';
  schemaRegistry[derivedName] = schema;
  return derivedName;
}

function resolvePrepSchemaName() {
  const schemaNames = listSchemas();
  for (const name of schemaNames) {
    const schema = schemaRegistry[name];
    if (!schema) {
      continue;
    }
    if (schema?.$id === PREP_SCHEMA_ID || /prep/i.test(name)) {
      return name;
    }
  }
  return PREP_SCHEMA_REGISTRY_KEY;
}

function normalizePrepInput(prepJson) {
  if (Buffer.isBuffer(prepJson)) {
    return normalizePrepInput(prepJson.toString('utf8'));
  }

  if (prepJson instanceof ArrayBuffer) {
    return normalizePrepInput(Buffer.from(prepJson).toString('utf8'));
  }

  if (ArrayBuffer.isView(prepJson)) {
    const viewBuffer = Buffer.from(
      prepJson.buffer,
      prepJson.byteOffset,
      prepJson.byteLength,
    );
    return normalizePrepInput(viewBuffer.toString('utf8'));
  }

  if (typeof prepJson === 'string') {
    const trimmed = prepJson.trim();
    if (!trimmed) {
      return { ok: false, errors: ['prep JSON input cannot be empty'] };
    }

    try {
      return { ok: true, payload: JSON.parse(trimmed) };
    } catch (error) {
      return {
        ok: false,
        errors: [`failed to parse prep JSON: ${error.message}`],
      };
    }
  }

  if (!isPlainObject(prepJson)) {
    return { ok: false, errors: ['prep JSON must be an object or JSON string'] };
  }

  return { ok: true, payload: prepJson };
}

function validatePrepPayload(payload) {
  const { valid, errors } = validateWithSchema(PREP_SCHEMA_NAME, payload);
  if (valid) {
    return { ok: true, payload };
  }

  return {
    ok: false,
    errors: formatAjvErrors(errors),
  };
}

function formatAjvErrors(errors = []) {
  if (!errors.length) {
    return ['prep payload is invalid'];
  }

  return errors.map((error) => {
    const pointer = error.instancePath || '/';
    if (error.keyword === 'required' && error.params?.missingProperty) {
      return `${pointer} is missing required property '${error.params.missingProperty}'`;
    }
    return `${pointer} ${error.message ?? 'is invalid'}`.trim();
  });
}

function convertToDocument(prepPayload) {
  const warnings = [];
  const document = createEmptyDocument();
  document.document_meta = buildDocumentMeta(document.document_meta, prepPayload.document_meta);
  document.points = convertPrepPoints(prepPayload.points, warnings);
  // TODO: PREP lines/aux mappings will be implemented once the schema defines them explicitly.
  return { document, warnings };
}

function buildDocumentMeta(baseMeta = {}, prepMeta = {}) {
  const meta = {
    ...baseMeta,
    document_uuid: randomUUID(),
  };

  if (typeof prepMeta.schema_uri === 'string') {
    meta.schema_uri = prepMeta.schema_uri;
  } else if (typeof PREP_SCHEMA_ID === 'string') {
    meta.schema_uri = PREP_SCHEMA_ID;
  }

  if (typeof prepMeta.generator === 'string' && prepMeta.generator.trim()) {
    meta.author = prepMeta.generator.trim();
  }

  if (typeof prepMeta.source === 'string' && prepMeta.source.trim()) {
    meta.language = prepMeta.source.trim();
  }

  return meta;
}

function convertPrepPoints(points = [], warnings) {
  if (!Array.isArray(points)) {
    return [];
  }

  const labelUsage = new Map();
  return points.map((point, index) => {
    const rawLabel = normalizePointLabel(point?.name, index, warnings);
    const label = ensureUniqueLabel(rawLabel, labelUsage, index, warnings);
    const basePoint = {
      id: generateId('point'),
      label,
      position: normalizePointPosition(point?.position, index, warnings),
    };

    if (isPlainObject(point?.style)) {
      basePoint.style = point.style;
    } else if (point?.style !== undefined) {
      warnings.push(`point[${index}] style was ignored because it is not an object`);
    }

    return basePoint;
  });
}

function normalizePointLabel(name, index, warnings) {
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  warnings.push(`point[${index}] name is missing; generated fallback label`);
  return `prep-point-${index + 1}`;
}

function ensureUniqueLabel(label, labelUsage, index, warnings) {
  const usage = labelUsage.get(label) ?? 0;
  labelUsage.set(label, usage + 1);
  if (usage === 0) {
    return label;
  }

  const uniqueLabel = `${label}-${usage + 1}`;
  warnings.push(`point[${index}] duplicated label '${label}' renamed to '${uniqueLabel}'`);
  return uniqueLabel;
}

function normalizePointPosition(position, index, warnings) {
  if (
    Array.isArray(position) &&
    position.length === 3 &&
    position.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    return [...position];
  }

  if (position !== undefined) {
    warnings.push(`point[${index}] position is invalid; defaulted to ${DEFAULT_POINT_POSITION.join(',')}`);
  }
  return [...DEFAULT_POINT_POSITION];
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
