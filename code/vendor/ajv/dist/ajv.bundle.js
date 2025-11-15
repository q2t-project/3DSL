const DEFAULT_OPTIONS = {
  allErrors: false,
  strict: false,
  allowUnionTypes: false,
};

class ValidationContext {
  constructor(rootSchema, ajv) {
    this.rootSchema = rootSchema;
    this.ajv = ajv;
    this.allErrors = Boolean(ajv?.opts?.allErrors);
    this.pointerMap = new Map();
    this.idMap = new Map();
    buildPointerMap(rootSchema, '#', this.pointerMap, this.idMap);
    if (typeof rootSchema?.$id === 'string') {
      this.idMap.set(rootSchema.$id, rootSchema);
    }
  }

  resolveRef(ref) {
    if (typeof ref !== 'string' || ref.length === 0) {
      return null;
    }
    if (ref.startsWith('#')) {
      return this.pointerMap.get(ref) ?? null;
    }
    if (this.idMap.has(ref)) {
      return this.idMap.get(ref);
    }
    if (this.ajv && this.ajv.schemas && this.ajv.schemas.has(ref)) {
      return this.ajv.schemas.get(ref)?.schema ?? null;
    }
    return null;
  }

  getFormat(name) {
    if (!name || !this.ajv) {
      return null;
    }
    return this.ajv.formats.get(name) ?? null;
  }
}

export default class Ajv {
  constructor(options = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.schemas = new Map();
    this.formats = new Map();
  }

  addFormat(name, definition) {
    if (!name) {
      return this;
    }
    const normalized = normalizeFormat(definition);
    if (normalized) {
      this.formats.set(name, normalized);
    }
    return this;
  }

  addKeyword() {
    return this;
  }

  addVocabulary() {
    return this;
  }

  addSchema(schema, key) {
    if (!schema || typeof schema !== 'object') {
      return this;
    }
    const context = new ValidationContext(schema, this);
    const validator = createValidator(schema, context);
    const schemaKey = key ?? schema.$id;
    if (schemaKey) {
      this.schemas.set(schemaKey, { schema, validator, context });
    }
    return this;
  }

  getSchema(key) {
    return this.schemas.get(key)?.validator;
  }

  compile(schema) {
    if (!schema || typeof schema !== 'object') {
      throw new Error('Schema must be an object.');
    }
    const context = new ValidationContext(schema, this);
    const validator = createValidator(schema, context);
    if (typeof schema.$id === 'string' && !this.schemas.has(schema.$id)) {
      this.schemas.set(schema.$id, { schema, validator, context });
    }
    return validator;
  }
}

function createValidator(schema, context) {
  const validator = data => {
    const errors = [];
    const valid = validateNode(schema, data, context, '#', errors);
    validator.errors = valid ? null : errors;
    return valid;
  };
  validator.errors = null;
  validator.schema = schema;
  return validator;
}

function validateNode(schema, data, context, path, errors) {
  if (typeof schema === 'boolean') {
    if (schema) {
      return true;
    }
    pushError(errors, path, 'boolean', 'must NOT be valid', {});
    return false;
  }
  if (!schema || typeof schema !== 'object') {
    return true;
  }

  if (schema.$ref) {
    const target = context.resolveRef(schema.$ref);
    if (!target) {
      pushError(errors, path, '$ref', `Unable to resolve reference: ${schema.$ref}`, { ref: schema.$ref });
      return false;
    }
    return validateNode(target, data, context, path, errors);
  }

  let valid = true;
  const continueAfterError = () => {
    valid = false;
    return context.allErrors;
  };

  if (schema.type !== undefined) {
    if (!validateType(schema.type, data, context.ajv?.opts?.allowUnionTypes ?? false)) {
      if (!pushError(errors, path, 'type', buildTypeErrorMessage(schema.type), { type: schema.type }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (schema.enum) {
    if (!schema.enum.some(item => deepEqual(item, data))) {
      if (!pushError(errors, path, 'enum', 'must be equal to one of the allowed values', { allowedValues: schema.enum }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (schema.const !== undefined) {
    if (!deepEqual(schema.const, data)) {
      if (!pushError(errors, path, 'const', 'must be equal to constant', { allowedValue: schema.const }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (schema.format) {
    const format = context.getFormat(schema.format);
    if (format && !format.validate(data)) {
      if (!pushError(errors, path, 'format', `must match format "${schema.format}"`, { format: schema.format }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (typeof schema.pattern === 'string' && typeof data === 'string') {
    const pattern = getPattern(schema.pattern);
    if (pattern && !pattern.test(data)) {
      if (!pushError(errors, path, 'pattern', 'must match pattern', { pattern: schema.pattern }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (typeof schema.minLength === 'number' && typeof data === 'string') {
    if (data.length < schema.minLength) {
      if (!pushError(errors, path, 'minLength', `must NOT have fewer than ${schema.minLength} characters`, { limit: schema.minLength }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (typeof schema.maxLength === 'number' && typeof data === 'string') {
    if (data.length > schema.maxLength) {
      if (!pushError(errors, path, 'maxLength', `must NOT have more than ${schema.maxLength} characters`, { limit: schema.maxLength }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (typeof schema.minimum === 'number' && typeof data === 'number') {
    if (!(data >= schema.minimum)) {
      if (!pushError(errors, path, 'minimum', `must be >= ${schema.minimum}`, { comparison: '>=', limit: schema.minimum }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (typeof schema.maximum === 'number' && typeof data === 'number') {
    if (!(data <= schema.maximum)) {
      if (!pushError(errors, path, 'maximum', `must be <= ${schema.maximum}`, { comparison: '<=', limit: schema.maximum }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    let passCount = 0;
    for (const subSchema of schema.oneOf) {
      const branchErrors = [];
      if (validateNode(subSchema, data, context, path, branchErrors)) {
        passCount += 1;
      }
    }
    if (passCount !== 1) {
      if (!pushError(errors, path, 'oneOf', 'must match exactly one schema in oneOf', { passCount }) || !continueAfterError()) {
        return false;
      }
    }
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    for (const subSchema of schema.allOf) {
      if (!validateNode(subSchema, data, context, path, errors)) {
        valid = false;
        if (!context.allErrors) {
          return false;
        }
      }
    }
  }

  if (schema.if) {
    const conditionErrors = [];
    const conditionValid = validateNode(schema.if, data, context, path, conditionErrors);
    if (conditionValid && schema.then) {
      if (!validateNode(schema.then, data, context, path, errors)) {
        valid = false;
        if (!context.allErrors) {
          return false;
        }
      }
    } else if (!conditionValid && schema.else) {
      if (!validateNode(schema.else, data, context, path, errors)) {
        valid = false;
        if (!context.allErrors) {
          return false;
        }
      }
    }
  }

  if (schema.type === 'object' || (schema.properties || schema.required || schema.additionalProperties)) {
    if (!isObject(data)) {
      if (!pushError(errors, path, 'type', 'must be object', { type: 'object' }) || !continueAfterError()) {
        return false;
      }
    } else {
      if (Array.isArray(schema.required)) {
        for (const property of schema.required) {
          if (!Object.prototype.hasOwnProperty.call(data, property)) {
            if (!pushError(errors, joinPointer(path, property), 'required', `must have required property '${property}'`, { missingProperty: property }) || !continueAfterError()) {
              return false;
            }
          }
        }
      }
      const definedProperties = schema.properties ?? {};
      const additional = schema.additionalProperties;
      for (const [key, value] of Object.entries(data)) {
        const subSchema = definedProperties[key];
        if (subSchema) {
          if (!validateNode(subSchema, value, context, joinPointer(path, key), errors)) {
            valid = false;
            if (!context.allErrors) {
              return false;
            }
          }
          continue;
        }
        if (additional === false) {
          if (!pushError(errors, joinPointer(path, key), 'additionalProperties', 'must NOT have additional properties', { additionalProperty: key }) || !continueAfterError()) {
            return false;
          }
        } else if (additional && typeof additional === 'object') {
          if (!validateNode(additional, value, context, joinPointer(path, key), errors)) {
            valid = false;
            if (!context.allErrors) {
              return false;
            }
          }
        }
      }
    }
  }

  if (schema.type === 'array' || schema.items || schema.minItems !== undefined || schema.maxItems !== undefined) {
    if (!Array.isArray(data)) {
      if (!pushError(errors, path, 'type', 'must be array', { type: 'array' }) || !continueAfterError()) {
        return false;
      }
    } else {
      if (typeof schema.minItems === 'number' && data.length < schema.minItems) {
        if (!pushError(errors, path, 'minItems', `must NOT have fewer than ${schema.minItems} items`, { limit: schema.minItems }) || !continueAfterError()) {
          return false;
        }
      }
      if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) {
        if (!pushError(errors, path, 'maxItems', `must NOT have more than ${schema.maxItems} items`, { limit: schema.maxItems }) || !continueAfterError()) {
          return false;
        }
      }
      if (schema.uniqueItems) {
        if (!hasUniqueItems(data)) {
          if (!pushError(errors, path, 'uniqueItems', 'must NOT contain duplicate items', {}) || !continueAfterError()) {
            return false;
          }
        }
      }
      if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
        for (let index = 0; index < data.length; index += 1) {
          if (!validateNode(schema.items, data[index], context, joinPointer(path, index), errors)) {
            valid = false;
            if (!context.allErrors) {
              return false;
            }
          }
        }
      } else if (Array.isArray(schema.items)) {
        for (let index = 0; index < schema.items.length; index += 1) {
          if (index >= data.length) {
            break;
          }
          const itemSchema = schema.items[index];
          if (!validateNode(itemSchema, data[index], context, joinPointer(path, index), errors)) {
            valid = false;
            if (!context.allErrors) {
              return false;
            }
          }
        }
      }
    }
  }

  return valid;
}

function normalizeFormat(definition) {
  if (typeof definition === 'function') {
    return { validate: definition };
  }
  if (definition && typeof definition === 'object' && typeof definition.validate === 'function') {
    return { validate: definition.validate };
  }
  return null;
}

function validateType(expected, value, allowUnion) {
  if (Array.isArray(expected)) {
    for (const type of expected) {
      if (validateType(type, value, allowUnion)) {
        return true;
      }
    }
    return false;
  }
  switch (expected) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isObject(value);
    default:
      return allowUnion ? true : true;
  }
}

function buildTypeErrorMessage(type) {
  if (Array.isArray(type)) {
    return `must be one of the allowed types: ${type.join(', ')}`;
  }
  return `must be ${type}`;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pushError(errors, path, keyword, message, params) {
  errors.push({
    instancePath: path === '#' ? '' : path.slice(1),
    keyword,
    message,
    params,
  });
  return true;
}

function joinPointer(base, token) {
  const segment = typeof token === 'number' ? String(token) : encodePointerSegment(token);
  return base === '#' ? `#/${segment}` : `${base}/${segment}`;
}

function encodePointerSegment(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

const PATTERN_CACHE = new Map();
function getPattern(pattern) {
  if (!PATTERN_CACHE.has(pattern)) {
    try {
      PATTERN_CACHE.set(pattern, new RegExp(pattern));
    } catch (error) {
      PATTERN_CACHE.set(pattern, null);
    }
  }
  return PATTERN_CACHE.get(pattern);
}

function hasUniqueItems(items) {
  const seen = new Set();
  for (const item of items) {
    const key = stableStringify(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isObject(value)) {
    const entries = Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return Number.isNaN(a) && Number.isNaN(b);
}

function buildPointerMap(node, pointer, map, idMap) {
  if (!map.has(pointer)) {
    map.set(pointer, node);
  }
  if (node && typeof node === 'object') {
    if (typeof node.$id === 'string') {
      idMap.set(node.$id, node);
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => buildPointerMap(item, `${pointer}/${index}`, map, idMap));
    } else {
      for (const [key, value] of Object.entries(node)) {
        const childPointer = `${pointer}/${encodePointerSegment(key)}`;
        buildPointerMap(value, childPointer, map, idMap);
      }
    }
  }
}
