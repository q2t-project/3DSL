// runtime/core/validator.js
// 3DSS.schema.json を Ajv で検証するための薄いラッパ（bootstrapViewer の契約：init(schemaJson)）
import Ajv from "../../../vendor/ajv/dist/ajv.bundle.js";
let ajv = null;
let validateFn = null;
let lastErrors = null;
// schema $id からバージョン情報を抜く（#vX.Y.Z 形式）
let schemaInfo = { $id: null, baseUri: null, version: null, major: null };
function parseSemverMajor(v) {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}
function extractVersionFromId(id) {
  if (typeof id !== "string") return { base: null, version: null, major: null };
  const m = id.match(/^(.*)#v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)$/);
  if (!m) return { base: id, version: null, major: null };
  const base = m[1];
  const version = m[2];
  return { base, version, major: parseSemverMajor(version) };
}
function extractSchemaInfo(schemaJson) {
  const fromId = extractVersionFromId(schemaJson?.$id || "");
  return {
    $id: schemaJson?.$id || null,
    baseUri: fromId.base || null,
    version: fromId.version || null,
    major: fromId.major,
  };
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
    const uriInfo = extractVersionFromId(dm.schema_uri || "");
    if (uriInfo.base && uriInfo.base !== schemaInfo.baseUri) {
      errors.push({
        instancePath: "/document_meta/schema_uri",
        keyword: "schema_uri",
        message: `schema_uri base mismatch: expected '${schemaInfo.baseUri}', got '${uriInfo.base}'`,
      });
    }
    if (schemaInfo.major != null) {
      if (!uriInfo.version) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: "schema_uri must include '#v<major.minor.patch>' (e.g. ...#v1.0.2)",
        });
      } else if (uriInfo.major == null) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: `invalid schema_uri version '${uriInfo.version}'`,
        });
      } else if (uriInfo.major !== schemaInfo.major) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: `schema_uri major mismatch: expected ${schemaInfo.major}, got ${uriInfo.major}`,
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
  if (!schemaJson) throw new Error("validator.init: schemaJson is required");
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
  if (!ajv || !validateFn) {
    throw new Error("validator not initialized. Call init(schemaJson) first.");
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

