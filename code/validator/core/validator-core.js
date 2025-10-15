import Ajv from "../../vendor/ajv/ajv2020.mjs";
import schema from "../../../schemas/3DSS.schema.json" with { type: "json" };

const DEFAULT_SCHEMA_URI = "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json";
const schemaId = typeof schema.$id === "string" ? schema.$id : `${DEFAULT_SCHEMA_URI}#v1.0.0`;
const schemaUri = schemaId.split("#")[0] || DEFAULT_SCHEMA_URI;
const versionMatch =
  schemaId.match(/#v(\d+\.\d+\.\d+)/i) ||
  (typeof schema.title === "string" ? schema.title.match(/v(\d+\.\d+\.\d+)/i) : null);
const schemaVersion = versionMatch ? versionMatch[1] : "1.0.0";
const GENERATOR_URI = `https://q2t-project.github.io/3dsl/apps/modeler?v=${schemaVersion}`;

const ERROR_MESSAGES = {
  en: {
    required: "Missing required field: {0}",
    additionalProperties: "Unexpected property: {0}",
    type: "Invalid type at {0}",
    enum: "Value must be one of the allowed options",
  },
  ja: {
    required: "必須フィールドが不足しています: {0}",
    additionalProperties: "未定義のプロパティです: {0}",
    type: "型が一致しません: {0}",
    enum: "許可された値のいずれかを選択してください",
  },
};

const ERROR_PARAMETER_EXTRACTORS = {
  required: (error) => [error?.params?.missingProperty ?? ""],
  additionalProperties: (error) => [error?.params?.additionalProperty ?? ""],
  type: (error) => [error?.instancePath ?? "/"],
};

const ISO_MILLISECONDS_PATTERN = /\.\d{3}Z$/;

let languageResolver = () => "en";

export function setLanguageResolver(resolver) {
  if (typeof resolver === "function") {
    languageResolver = resolver;
    return;
  }
  languageResolver = () => "en";
}

function resolveLocale(options = {}) {
  if (typeof options.locale === "string" && options.locale.trim().length > 0) {
    return options.locale.trim();
  }

  const resolver =
    typeof options.languageResolver === "function" ? options.languageResolver : languageResolver;

  try {
    const resolved = resolver?.();
    if (typeof resolved === "string" && resolved.trim().length > 0) {
      return resolved.trim();
    }
  } catch (error) {
    // Ignore resolution errors and fall back to English.
  }

  return "en";
}

function createUUID() {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function clone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fallback to JSON cloning below.
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatTemplate(template, replacements = []) {
  if (typeof template !== "string") {
    return template;
  }
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const value = replacements[Number(index)] ?? match;
    return value === undefined || value === null ? "" : String(value);
  });
}

function resolveLocalizedErrorMessage(error, locale) {
  if (!error?.keyword) {
    return null;
  }
  const language = ERROR_MESSAGES[locale] ? locale : "en";
  const template = ERROR_MESSAGES[language]?.[error.keyword] ?? ERROR_MESSAGES.en?.[error.keyword];
  if (!template) {
    return null;
  }
  const extractor = ERROR_PARAMETER_EXTRACTORS[error.keyword];
  const parameters = extractor ? extractor(error) : [];
  return formatTemplate(template, parameters);
}

function sanitiseDocumentMeta(meta = {}) {
  const base = isRecord(meta) ? { ...meta } : {};
  const documentUuid =
    typeof base.document_uuid === "string" && base.document_uuid.trim().length > 0
      ? base.document_uuid.trim()
      : createUUID();

  return {
    ...base,
    document_uuid: documentUuid,
    schema_uri: schemaId,
    generator: GENERATOR_URI,
    version: schemaVersion,
  };
}

function stampDocumentMeta(meta = {}, now = new Date()) {
  const isoFull = now.toISOString();
  const isoSeconds = isoFull.replace(ISO_MILLISECONDS_PATTERN, "Z");
  return {
    ...sanitiseDocumentMeta(meta),
    updated_at: isoSeconds,
    timestamp: isoFull,
  };
}

export function newDocumentMeta(meta = {}) {
  return stampDocumentMeta(meta);
}

export function attachDocumentMeta(model) {
  if (!isRecord(model)) {
    return model;
  }
  model.document_meta = stampDocumentMeta(model.document_meta);
  return model;
}

export function normalizeModel(model) {
  const source = isRecord(model) ? model : {};
  const normalized = {};

  if (isRecord(source.common)) {
    normalized.common = clone(source.common);
  }

  normalized.point = Array.isArray(source.point) ? clone(source.point) : [];
  normalized.line = Array.isArray(source.line) ? clone(source.line) : [];
  normalized.aux = Array.isArray(source.aux) ? clone(source.aux) : [];
  const metaSource = isRecord(source.document_meta)
    ? source.document_meta
    : isRecord(source.meta)
    ? source.meta
    : {};
  normalized.document_meta = isRecord(metaSource) ? clone(metaSource) : {};
  attachDocumentMeta(normalized);

  return normalized;
}

let validatorInstance;

function getValidator() {
  if (validatorInstance) {
    return validatorInstance;
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false,
    validateFormats: false,
  });
  validatorInstance = ajv.compile(schema);
  return validatorInstance;
}

function normaliseErrors(ajvErrors = [], locale = "en") {
  return ajvErrors.map((error) => {
    const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "/";
    const detail = error.message || "invalid value";
    const localizedMessage = resolveLocalizedErrorMessage(error, locale) ?? detail;
    return {
      path,
      message: localizedMessage,
      detail,
      keyword: error.keyword,
      schemaPath: error.schemaPath,
      params: error.params,
    };
  });
}

export function validateModel(model, options = {}) {
  const normalized = options.normalized === true ? model : normalizeModel(model);
  attachDocumentMeta(normalized);
  const validate = getValidator();
  const valid = validate(normalized);
  attachDocumentMeta(normalized);

  const locale = resolveLocale(options);

  if (valid) {
    return { valid: true, errors: [], normalized };
  }

  return {
    valid: false,
    errors: normaliseErrors(validate.errors ?? [], locale),
    normalized,
  };
}

export function getValidatorMetadata() {
  return {
    schemaId,
    schemaUri,
    schemaVersion,
    generator: GENERATOR_URI,
  };
}

export function validate(model, options = {}) {
  return validateModel(model, options);
}

export default validate;
