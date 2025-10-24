import Ajv from "../../vendor/ajv/dist/ajv.bundle.js";
import addFormats from "../../vendor/ajv-formats/dist/ajv-formats.bundle.js";
import {
  PATHS,
  bindJSONFileInput,
  loadJSON,
  logEvent,
  renderValidationSummary
} from "./utils.js";

let validator;
let schemaCache;

async function registerDraft2020Schemas(ajv) {
  // ローカルに置く（※後述のファイル配置）
  const [draft, core, meta] = await Promise.all([
    loadJSON("../schemas/draft2020-12_schema.json"),
    loadJSON("../schemas/meta_core.json"),
    loadJSON("../schemas/meta_meta.json"),
  ]);
  ajv.addMetaSchema(draft);
  ajv.addMetaSchema(core);
  ajv.addMetaSchema(meta);
  logEvent("validator", "Registered Draft2020-12 metas", {
    ids: [draft.$id, core.$id, meta.$id]
  });
}

async function ensureValidator() {
  if (validator) return validator;

  if (!schemaCache) {
    logEvent("validator", "Loading schema", { path: PATHS.schema });
    schemaCache = await loadJSON(PATHS.schema);
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateFormats: true,
    allowUnionTypes: true
  });
  addFormats(ajv, { mode: "fast" });

  // ★ここを追加
  await registerDraft2020Schemas(ajv);

  validator = ajv.compile(schemaCache);
  logEvent("validator", "Schema compiled");
  return validator;
}


async function validateJSON(rawJSON) {
  const validate = await ensureValidator();
  let data;
  try {
    data = typeof rawJSON === "string" ? JSON.parse(rawJSON) : rawJSON;
  } catch (err) {
    logEvent("validator", "JSON parse failure", { error: err.message });
    return { valid: false, errors: [{ instancePath: "(parse)", message: err.message }] };
  }

  const valid = validate(data);
  const result = {
    valid,
    errors: valid ? [] : (validate.errors || []).map((error) => ({
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      message: error.message
    })),
    data
  };

  logEvent("validator", valid ? "Validation success" : "Validation failure", {
    valid,
    errorCount: result.errors.length
  });

  return result;
}

function setupSampleLoader(textarea) {
  const sampleSelector = document.querySelector("#sample-selector");
  const loadButton = document.querySelector("#load-sample");

  loadButton.addEventListener("click", async () => {
    const selection = sampleSelector.value;
    if (!selection) {
      return;
    }
    const path = `${PATHS.dataRoot}/${selection}`;
    try {
      const data = await loadJSON(path);
      textarea.value = JSON.stringify(data, null, 2);
      logEvent("validator", "Loaded bundled sample", { path });
    } catch (err) {
      logEvent("validator", "Failed to load sample", { path, error: err.message });
      alert(err.message);
    }
  });
}

function setupValidationUI() {
  const textarea = document.querySelector("#json-input");
  const resultPanel = document.querySelector("#validation-result");
  const validateButton = document.querySelector("#validate-json");
  const fileInput = document.querySelector("#file-input");
  const formatButton = document.querySelector("#format-json");

  bindJSONFileInput(fileInput, (data) => {
    textarea.value = JSON.stringify(data, null, 2);
  });

  validateButton.addEventListener("click", async () => {
    const result = await validateJSON(textarea.value);
    renderValidationSummary(resultPanel, result);
  });

  formatButton.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      logEvent("validator", "Reformatted JSON");
    } catch (err) {
      alert(`Cannot format invalid JSON: ${err.message}`);
    }
  });

  setupSampleLoader(textarea);
}

window.addEventListener("DOMContentLoaded", () => {
  setupValidationUI();
  logEvent("validator", "Validator UI ready");
});
