// runtime/core/validator.js
// 3DSS.schema.json を Ajv で検証するための薄いラッパ（bootstrapViewer の契約：init(schemaJson)）
// NOTE: Ajv browser import compatibility
//
// In some deployments "/vendor/ajv/dist/ajv.js" is not an ES module (or its
// export shape differs), which causes the whole viewer runtime to fail at parse
// time. Load Ajv dynamically so the host can report initialization failures.
// An unavailable validator must never turn an unchecked document into valid input.
let Ajv = globalThis?.Ajv;
if (!Ajv) {
  try {
    const mod = await import("/vendor/ajv/dist/ajv.js");
    Ajv = mod?.default ?? mod?.Ajv ?? mod;
  } catch {
    Ajv = null;
  }
}
let ajv = null;
let validateFn = null;
let lastErrors = null;
let initializationError = "validator is not initialized. Call init(schemaJson) first.";
// schema の base/version を抽出して document_meta と突き合わせる。
// - base: フラグメント（#...）を除いた URI
// - version: #vX.Y.Z（または $anchor=vX.Y.Z）
let schemaInfo = null;
function failInitialization(message, cause) {
  ajv = null;
  validateFn = null;
  schemaInfo = null;
  initializationError = message;
  lastErrors = [{ instancePath: "", keyword: "validator", message }];
  const error = new Error(message);
  if (cause) error.cause = cause;
  throw error;
}
function parseSemverMajor(v) {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}
function normalizeSchemaBase(uri) {
  if (typeof uri !== "string") return null;
  const s = uri.trim();
  if (!s) return null;
  // drop fragment and trailing '#'
  const base = s.split("#")[0];
  return base || null;
}

function extractVersionFromFragment(uri) {
  if (typeof uri !== "string") return { version: null, major: null };
  const i = uri.indexOf("#v");
  if (i < 0) return { version: null, major: null };
  const version = uri.slice(i + 2);
  return { version, major: parseSemverMajor(version) };
}

function extractVersionFromAnchor(anchor) {
  if (typeof anchor !== "string") return null;
  const a = anchor.trim();
  const m = a.match(/^v?(\d+\.\d+\.\d+)$/);
  return m ? m[1] : null;
}

function extractSchemaInfo(schemaJson) {
  const $id = schemaJson?.$id || "";
  const baseUri = normalizeSchemaBase($id);

  // Prefer #vX.Y.Z in $id, fallback to $anchor (vX.Y.Z)
  let version = extractVersionFromFragment($id).version;
  if (!version) version = extractVersionFromAnchor(schemaJson?.$anchor);

  const major = parseSemverMajor(version);
  return { $id: $id || null, baseUri, version: version || null, major };
}
// document_meta の major 整合をチェック（viewerが勝手に直さない）
function checkVersionAndSchemaUri(doc) {
  const errors = [];
  const dm = doc && doc.document_meta;
  if (!dm) {
    errors.push({
      instancePath: "",
      schemaPath: "#/required/document_meta",
      keyword: "required",
      message: "document_meta is required",
    });
    return { ok: false, errors };
  }
  // schema_uri の base / major
  if (schemaInfo.baseUri) {
    const gotBase = normalizeSchemaBase(dm.schema_uri || "");
    const uriV = extractVersionFromFragment(dm.schema_uri || "");

    if (gotBase && gotBase !== schemaInfo.baseUri) {
      errors.push({
        instancePath: "/document_meta/schema_uri",
        keyword: "schema_uri",
        message: `schema_uri base mismatch: expected '${schemaInfo.baseUri}', got '${gotBase}'`,
      });
    }
    // If schema version is known (from #v or $anchor), require schema_uri to include #v
    if (schemaInfo.major != null) {
      if (!uriV.version) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: "schema_uri must include '#v<major.minor.patch>' (e.g. ...#v1.0.2)",
        });
      } else if (uriV.major == null) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: `invalid schema_uri version '${uriV.version}'`,
        });
      } else if (uriV.major !== schemaInfo.major) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: `schema_uri major mismatch: expected ${schemaInfo.major}, got ${uriV.major}`,
        });
      }
    }
  }
  // document_meta.version の major
  if (schemaInfo.major != null) {
    if (typeof dm.version !== "string") {
      errors.push({
        instancePath: "/document_meta/version",
        keyword: "type",
        message: "document_meta.version must be a string",
      });
    } else {
      const docMajor = parseSemverMajor(dm.version);
      if (docMajor == null) {
        errors.push({
          instancePath: "/document_meta/version",
          keyword: "format",
          message: `invalid semver version '${dm.version}'`,
        });
      } else if (docMajor !== schemaInfo.major) {
        errors.push({
          instancePath: "/document_meta/version",
          keyword: "version",
          message: `major version mismatch: expected ${schemaInfo.major}, got ${docMajor}`,
        });
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
/**
 * bootstrapViewer から呼ばれる契約：init(schemaJson)
 */
export function init(schemaJson) {
  // Clear any previous compiled schema before attempting replacement. A failed
  // reinitialization must not validate the new input with an older validator.
  ajv = null;
  validateFn = null;
  schemaInfo = null;
  lastErrors = null;
  initializationError = "validator initialization did not complete.";
  if (!schemaJson) failInitialization("validator.init: schemaJson is required");
  if (typeof Ajv !== "function") {
    failInitialization("validator.init: Ajv is unavailable; JSON Schema validation is required. Viewer loading was stopped.");
  }
  try {
    const nextAjv = new Ajv({
    allErrors: true,
    // strictは維持
    strict: true,
    strictSchema: false,
    strictTypes: true,
    // ★ここだけOFF（例の strictRequired 落ちを止める）
    strictRequired: false,
    // schema自体の検証で落ちるのも止血
    validateSchema: false,
    // viewerが勝手に直さない
    removeAdditional: false,
    useDefaults: false,
    coerceTypes: false,
    });
    const nextValidate = nextAjv.compile(schemaJson);
    if (typeof nextValidate !== "function") throw new Error("schema compilation did not return a validator");
    ajv = nextAjv;
    validateFn = nextValidate;
    schemaInfo = extractSchemaInfo(schemaJson);
    initializationError = null;
  } catch (cause) {
    failInitialization(`validator.init: JSON Schema validation could not be initialized: ${cause?.message || cause}. Viewer loading was stopped.`, cause);
  }
}
export function validate3DSS(doc) {
  if (!schemaInfo || typeof validateFn !== "function") {
    failInitialization(initializationError || "validator is unavailable. Viewer loading was stopped.");
  }
  lastErrors = null;
  const ok = validateFn(doc);
  const ajvErrors = validateFn.errors || [];
  const versionResult = checkVersionAndSchemaUri(doc);
  if (!ok || !versionResult.ok) {
    lastErrors = [...ajvErrors, ...versionResult.errors];
    return false;
  }
  return true;
}
export function getErrors() {
  return lastErrors;
}

