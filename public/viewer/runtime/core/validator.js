// runtime/core/validator.js

// Ajv の import パスは環境に合わせて調整してな。
// - Astro / bundler 環境 → `import Ajv from "ajv";` で OK
// - 生ブラウザで使う場合 → vendor 下に ESM を置いて相対パス import など
import Ajv from "../../../vendor/ajv/dist/ajv.bundle.js";

let ajv = null;
let validateFn = null;
let lastErrors = null;

// schema 側（$id）から抜き出したバージョン情報。
// ここを基準に document_meta.schema_uri / document_meta.version の major をチェックする。
const schemaInfo = {
  $id: null,
  baseUri: null,  // "#v1.0.1" より前のベース URL
  version: null,  // "1.0.1" など
  major: null,    // 1 など
};
 

function parseSemverMajor(v) {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

// "....#v1.0.1" 形式の末尾から version を抜き出すユーティリティ
function extractVersionFromId(id) {
  if (typeof id !== "string") {
    return { base: null, version: null, major: null };
  }
  const m = id.match(/^(.*)#v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)$/);
  if (!m) {
    return { base: id, version: null, major: null };
  }
  const base = m[1];
  const version = m[2];
  return { base, version, major: parseSemverMajor(version) };
}

/**
 * schemaJson: /schemas/3DSS.schema.json の中身
 */
export function init(schemaJson) {
  if (!schemaJson) {
    throw new Error("validator.init: schemaJson is required");
  }

  ajv = new Ajv({
    allErrors: true,

    // ★ A-4 要件：strict full validation
    strict: true,
    strictSchema: true,
    strictTypes: true,

    // ★ A-4 要件：「viewer が勝手に直さない」
    removeAdditional: false,
    useDefaults: false,
    coerceTypes: false,
  });

  validateFn = ajv.compile(schemaJson);
  lastErrors = null;

  // schema 側の $id から「この validator が想定している 3DSS の major version」を決める。
  // 例: "https://.../3DSS.schema.json#v1.0.1" → base / version / major(=1)
  const fromId = extractVersionFromId(schemaJson.$id || "");

  schemaInfo.$id = schemaJson.$id || null;
  schemaInfo.baseUri = fromId.base || null;
  schemaInfo.version = fromId.version || null;
  schemaInfo.major = fromId.major;
}

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

  // --- schema_uri のベース URL / major version の一致チェック ---
  if (schemaInfo.baseUri) {
    const uriInfo = extractVersionFromId(dm.schema_uri || "");

    // ベース URL が違う → そもそも別スキーマ用データ
    if (uriInfo.base && uriInfo.base !== schemaInfo.baseUri) {
      errors.push({
        instancePath: "/document_meta/schema_uri",
        keyword: "schema_uri",
        message: `schema_uri base mismatch: expected '${schemaInfo.baseUri}', got '${uriInfo.base}'`,
      });
    }

    if (schemaInfo.major != null) {
      // $id 側に major があるなら、schema_uri 側にも #vX.Y.Z を必須とする
      if (!uriInfo.version) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message:
            "schema_uri must include '#v<major.minor.patch>' (e.g. ...#v1.0.1)",
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

  // --- document_meta.version の major も $id と一致させる ---
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

export function validate3DSS(doc) {
  if (!ajv || !validateFn) {
    throw new Error("validator not initialized. Call init(schemaJson) first.");
  }

  lastErrors = null;

  const ok = validateFn(doc);
  const ajvErrors = validateFn.errors || [];

  const versionResult = checkVersionAndSchemaUri(doc);

  if (!ok || !versionResult.ok) {
    // AJV エラー + version/schema_uri エラーをまとめて保持
    lastErrors = [...ajvErrors, ...versionResult.errors];
    return false;
  }

  return true;
}

export function getErrors() {
  return lastErrors;
}
