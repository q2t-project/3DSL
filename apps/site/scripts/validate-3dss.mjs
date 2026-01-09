import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const docPath = process.argv[2];
const schemaPath = process.argv[3];

if (!docPath || !schemaPath) {
  console.error("usage: node apps/site/scripts/validate-3dss.mjs <model.3dss.json> <3DSS.schema.json>");
  process.exit(2);
}

const doc = JSON.parse(fs.readFileSync(docPath, "utf8"));
const schemaRaw = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const schemaUri = doc?.document_meta?.schema_uri;
if (typeof schemaUri !== "string" || !schemaUri.includes("#")) {
  console.error("[ng] document_meta.schema_uri is missing or invalid");
  console.error("[debug] document_meta =", JSON.stringify(doc?.document_meta ?? null, null, 2));
  process.exit(2);
}

const schemaBase = schemaUri.split("#")[0];      // .../3DSS.schema.json
const idNoHash = schemaBase;                     // .../3DSS.schema.json
const idWithHash = `${schemaBase}#`;             // .../3DSS.schema.json#

// schema を clone して $id を “このドキュメントが要求してる base” に合わせる
const schema = structuredClone(schemaRaw);
schema.$id = idWithHash; // ←アンカー(#v1.1.1)を安定させるため、末尾 # 付きに寄せる

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
});

// Ajv は $id の正規化で末尾 # を落とすことがあるので、両方の key で登録しとく
const rawId = typeof schemaRaw?.$id === "string" ? schemaRaw.$id : null;
const keys = new Set(
  [idNoHash, idWithHash, rawId, rawId?.replace(/#$/, ""), rawId && `${rawId.replace(/#$/, "")}#`].filter(Boolean)
);

for (const k of keys) {
  try {
    ajv.addSchema(schema, k);
  } catch {
    // duplicate などは無視
  }
}

// ここ重要：一回 compile してアンカーや内部参照を展開させる
try {
  ajv.compile(schema);
} catch (e) {
  console.error("[ng] failed to compile root schema");
  console.error(String(e?.stack ?? e));
  console.error("[debug] keys =", [...keys]);
  process.exit(1);
}

const validate =
  ajv.getSchema(schemaUri) ||
  ajv.getSchema(idNoHash) ||
  ajv.getSchema(idWithHash);

if (!validate) {
  console.error("[ng] validator not found after compile");
  console.error("[debug] schemaUri =", schemaUri);
  console.error("[debug] keys =", [...keys]);
  process.exit(1);
}

const ok = validate(doc);
console.log("ok =", ok);

if (!ok) {
  for (const e of validate.errors ?? []) {
    console.log(`${e.instancePath || "/"}: ${e.message} ${e.params ? JSON.stringify(e.params) : ""}`);
  }
  process.exit(1);
}
