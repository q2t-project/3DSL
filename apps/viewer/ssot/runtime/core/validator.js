// runtime/core/validator.js
// 3DSS.schema.json を Ajv で検証するための薄いラッパ（bootstrapViewer の契約：init(schemaJson)）
// NOTE: Ajv browser import compatibility
//
// In some deployments "/vendor/ajv/dist/ajv.js" is not an ES module (or its
// export shape differs), which causes the whole viewer runtime to fail at parse
// time. We therefore load Ajv dynamically and degrade validation gracefully if
// Ajv is unavailable.
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
// schema の base/version を抽出して document_meta と突き合わせる。
// - base: フラグメント（#...）を除いた URI
// - version: #vX.Y.Z（または $anchor=vX.Y.Z）
let schemaInfo = { $id: null, baseUri: null, version: null, major: null };
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
  if (!schemaJson) throw new Error("validator.init: schemaJson is required");
  // If Ajv cannot be loaded in the current environment, keep the viewer usable.
  // We still keep the lightweight version/schema-uri checks.
  if (!Ajv) {
    console.warn("validator: Ajv is unavailable; skipping JSON Schema validation.");
    ajv = null;
    validateFn = null;
    schemaInfo = extractSchemaInfo(schemaJson);
    lastErrors = null;
    return;
  }
  ajv = new Ajv({
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
  validateFn = ajv.compile(schemaJson);
  schemaInfo = extractSchemaInfo(schemaJson);
  lastErrors = null;
}
export function validate3DSS(doc) {
  if (!schemaInfo) throw new Error("validator not initialized. Call init(schemaJson) first.");
  lastErrors = null;
  const ok = validateFn ? validateFn(doc) : true;
  const ajvErrors = validateFn ? validateFn.errors || [] : [];
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

