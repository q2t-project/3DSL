import fs from "node:fs";
import Ajv from "ajv";

const docPath = process.argv[2];
const schemaPath = process.argv[3];

if (!docPath || !schemaPath) {
  console.error("usage: node tools/validate-3dss.mjs <model.3dss.json> <3DSS.schema.json>");
  process.exit(2);
}

const doc = JSON.parse(fs.readFileSync(docPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const ok = validate(doc);
console.log("ok =", ok);

if (!ok) {
  for (const e of validate.errors ?? []) {
    console.log(`${e.instancePath || "/"}: ${e.message} ${e.params ? JSON.stringify(e.params) : ""}`);
  }
  process.exit(1);
}
