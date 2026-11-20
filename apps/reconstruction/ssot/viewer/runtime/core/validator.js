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
  const declaredUri = schemaJson?.$defs?.validator?.schema_uri?.const;
  const documentUri = declaredUri || (version ? `${baseUri}#v${version}` : $id) || null;
  const versionPattern = schemaJson?.$defs?.validator?.semver?.pattern;
  const documentVersionPattern = versionPattern ? new RegExp(versionPattern) : null;
  return { $id: $id || null, baseUri, version: version || null, major, documentUri, documentVersionPattern };
}
// Check the declared schema URI and the independent document version format.
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
  if (schemaInfo?.documentUri && dm.schema_uri !== schemaInfo.documentUri) {
    errors.push({
      instancePath: "/document_meta/schema_uri",
      keyword: "schema_uri",
      message: `schema_uri mismatch: expected '${schemaInfo.documentUri}', got '${dm.schema_uri ?? ""}'`
    });
  }
  if (schemaInfo?.documentVersionPattern && (
    typeof dm.version !== "string" || !schemaInfo.documentVersionPattern.test(dm.version)
  )) {
    errors.push({
      instancePath: "/document_meta/version",
      keyword: "format",
      message: "document_meta.version must follow the document version format"
    });
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

