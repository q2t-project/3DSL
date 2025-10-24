import Ajv from "https://cdn.jsdelivr.net/npm/ajv@8.12.0/dist/ajv2020.mjs";
import addFormats from "https://cdn.jsdelivr.net/npm/ajv-formats@2.1.1/dist/ajv-formats.mjs";
import {
  PATHS,
  bindJSONFileInput,
  downloadTextFile,
  loadJSON,
  logEvent,
  renderValidationSummary
} from "./utils.js";

let validator;
let schemaCache;

async function ensureValidator() {
  if (validator) {
    return validator;
  }
  if (!schemaCache) {
    logEvent("modeler", "Loading schema", { path: PATHS.schema });
    schemaCache = await loadJSON(PATHS.schema);
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateFormats: true,
    allowUnionTypes: true
  });
  addFormats(ajv, { mode: "fast" });
  validator = ajv.compile(schemaCache);
  logEvent("modeler", "Schema compiled");
  return validator;
}

async function validateDocument(text) {
  const compiled = await ensureValidator();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return {
      valid: false,
      errors: [{ instancePath: "(parse)", message: err.message }],
      data: null
    };
  }

  const valid = compiled(data);
  const errors = valid
    ? []
    : (compiled.errors || []).map((error) => ({
        instancePath: error.instancePath,
        schemaPath: error.schemaPath,
        message: error.message
      }));

  logEvent("modeler", valid ? "Model draft valid" : "Model draft invalid", {
    valid,
    errorCount: errors.length
  });

  return { valid, errors, data };
}

function makeUUID() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const fallback = Math.random().toString(16).slice(2, 14).padEnd(12, '0').slice(0, 12);
  return `00000000-0000-4000-8000-${fallback}`;
}

function buildPointTemplate() {
  return {
    appearance: {
      position: [0, 0, 0],
      marker: {
        common: { visible: true },
        shape: "sphere"
      }
    },
    meta: {
      uuid: makeUUID()
    }
  };
}

function buildLineTemplate(pointUuid) {
  return {
    appearance: {
      end_a: { ref: pointUuid || makeUUID() },
      end_b: { coord: [1, 0, 0] },
      line_type: "straight",
      visible: true,
      color: "#ffffff"
    },
    meta: { uuid: makeUUID() }
  };
}

function applyTemplate(textarea, templateBuilder) {
  try {
    const data = JSON.parse(textarea.value || "{}");
    if (!Array.isArray(data.points)) {
      data.points = [];
    }
    if (!Array.isArray(data.lines)) {
      data.lines = [];
    }

    const template = templateBuilder(data.points[0]?.meta?.uuid);
    if (template.meta && template.meta.uuid && !data.points.find((p) => p.meta?.uuid === template.meta.uuid)) {
      if (template.appearance?.position) {
        data.points.push(template);
      } else {
        data.lines.push(template);
      }
    } else {
      data.lines.push(template);
    }

    textarea.value = JSON.stringify(data, null, 2);
    logEvent("modeler", "Inserted template", { type: template.appearance?.position ? "point" : "line" });
  } catch (err) {
    alert(`Unable to insert template: ${err.message}`);
  }
}

function debounce(fn, delay = 400) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delay);
  };
}

function setupModelerUI() {
  const textarea = document.querySelector("#modeler-json");
  const validationPanel = document.querySelector("#modeler-validation");
  const sampleSelector = document.querySelector("#modeler-sample");
  const loadButton = document.querySelector("#modeler-load");
  const downloadButton = document.querySelector("#modeler-download");
  const pointButton = document.querySelector("#add-point");
  const lineButton = document.querySelector("#add-line");
  const fileInput = document.querySelector("#modeler-file");

  const runValidation = debounce(async () => {
    const result = await validateDocument(textarea.value || "{}");
    renderValidationSummary(validationPanel, result);
  });

  textarea.addEventListener("input", runValidation);

  bindJSONFileInput(fileInput, (data) => {
    textarea.value = JSON.stringify(data, null, 2);
    runValidation();
  });

  loadButton.addEventListener("click", async () => {
    const selection = sampleSelector.value;
    if (!selection) {
      return;
    }
    const path = `${PATHS.dataRoot}/${selection}`;
    try {
      const data = await loadJSON(path);
      textarea.value = JSON.stringify(data, null, 2);
      logEvent("modeler", "Loaded bundled sample", { path });
      runValidation();
    } catch (err) {
      logEvent("modeler", "Failed to load sample", { path, error: err.message });
      alert(err.message);
    }
  });

  downloadButton.addEventListener("click", () => {
    downloadTextFile("draft.3dss.json", textarea.value || "{}");
    logEvent("modeler", "Downloaded draft");
  });

  pointButton.addEventListener("click", () => applyTemplate(textarea, buildPointTemplate));
  lineButton.addEventListener("click", () => applyTemplate(textarea, buildLineTemplate));

  runValidation();
}

window.addEventListener("DOMContentLoaded", () => {
  setupModelerUI();
  logEvent("modeler", "Modeler UI ready");
});
