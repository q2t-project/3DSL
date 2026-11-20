import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { validateSceneReferences } from "../../../reconstruction/ssot/shared/sceneReferences.js";

const docPath = process.argv[2];
const schemaPath = process.argv[3];

if (!docPath || !schemaPath) {
  console.error("usage: node apps/site/scripts/validate/3dss.mjs <model.3dss.json> <3DSS.schema.json>");
  process.exit(2);
}

const doc = JSON.parse(fs.readFileSync(docPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const schemaOk = validate(doc);
const issues = schemaOk ? validateSceneReferences(doc) : validate.errors;
console.log("ok =", issues.length === 0);
for (const issue of issues) console.error(`${issue.instancePath || "/"}: ${issue.message}`);
if (issues.length) process.exitCode = 1;
