const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

function isDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time);
}

function isDateTime(value) {
  if (typeof value !== 'string' || !DATE_TIME_PATTERN.test(value)) {
    return false;
  }
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function isUri(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol);
  } catch (error) {
    return false;
  }
}

function isUriReference(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  try {
    new URL(value, 'http://example.com');
    return true;
  } catch (error) {
    return false;
  }
}

export default function addFormats(ajv, options = {}) {
  if (!ajv || typeof ajv.addFormat !== 'function') {
    return ajv;
  }
  const formatDefinitions = {
    uuid: isUuid,
    date: isDate,
    'date-time': isDateTime,
    uri: isUri,
    'uri-reference': isUriReference,
  };
  for (const [name, validate] of Object.entries(formatDefinitions)) {
    ajv.addFormat(name, { validate });
  }
  return ajv;
}
