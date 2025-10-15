import Ajv from "../vendor/ajv/ajv2020.mjs";
import { registerDefaultFormats } from "./formats.js";
import schema from "../../schemas/3DSS.schema.json" with { type: "json" };

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

const rootId = typeof schema.$id === "string" ? schema.$id.split("#")[0] : "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json";
const pointDocumentSchema = {
  $id: `${rootId.replace(/\/$/, "")}/point-document`,
  type: "object",
  required: ["point"],
  additionalProperties: false,
  properties: {
    point: clone(schema.properties?.point ?? {}),
  },
  $defs: clone(schema.$defs ?? {}),
};

let validator;

function getValidator() {
  if (validator) {
    return validator;
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false,
  });
  registerDefaultFormats(ajv);
  validator = ajv.compile(pointDocumentSchema);
  return validator;
}

function normaliseErrors(ajvErrors = []) {
  return ajvErrors.map((error) => ({
    path: error.instancePath && error.instancePath !== "" ? error.instancePath : "#",
    message: error.message || "Validation error",
    keyword: error.keyword,
    params: error.params,
    schemaPath: error.schemaPath,
  }));
}

export function validate3DSS(data) {
  const validate = getValidator();
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: normaliseErrors(validate.errors ?? []),
  };
}
