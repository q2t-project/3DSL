/**
 * Shared utilities for the 3DSS prototype suite.
 * These modules are intentionally framework-free and rely only on
 * browser-standard APIs plus CDN hosted dependencies.
 */

export const PATHS = {
  schema: "../../schemas/3DSS.schema.json",
  dataRoot: "./data",
  runtimeLogEndpoint: "../../logs/runtime/runtime-log.jsonl"
};

/**
 * Lightweight runtime logger.
 * Logs to the console, mirrors into the DOM when available, and attempts to
 * persist to /logs/runtime/ via fetch/sendBeacon. The persistence attempt is
 * best-effort and silently ignored when running from the filesystem.
 */
export function logEvent(context, message, detail = {}) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, context, message, detail };

  console.info(`[${context}] ${message}`, detail);

  const logContainer = document.querySelector("[data-runtime-log]");
  if (logContainer) {
    const line = document.createElement("div");
    line.className = "runtime-log-entry";
    line.textContent = `${timestamp} [${context}] ${message}`;
    logContainer.prepend(line);
  }

  tryPersistRuntimeLog(entry);
  return entry;
}

async function tryPersistRuntimeLog(entry) {
  const payload = JSON.stringify(entry) + "\n";

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(PATHS.runtimeLogEndpoint, blob)) {
      return;
    }
  }

  if (typeof fetch === "function") {
    try {
      await fetch(PATHS.runtimeLogEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      });
      return;
    } catch (err) {
      // ignored; running without a writable endpoint
    }
  }

  try {
    if (window?.localStorage) {
      const key = "proto-runtime-log";
      const existing = window.localStorage.getItem(key) || "";
      window.localStorage.setItem(key, `${existing}${payload}`);
    }
  } catch (err) {
    // ignore storage errors (e.g., storage disabled)
  }
}

/**
 * Fetch JSON content with helpful error reporting.
 */
export async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Render structured Ajv errors into a human readable list.
 */
export function renderValidationSummary(container, result) {
  container.innerHTML = "";
  const summary = document.createElement("div");
  summary.className = `validation-summary validation-${result.valid ? "ok" : "error"}`;
  summary.textContent = result.valid ? "Document is valid ✅" : "Document is invalid ❌";
  container.appendChild(summary);

  if (!result.valid && Array.isArray(result.errors) && result.errors.length > 0) {
    const list = document.createElement("ul");
    list.className = "validation-error-list";
    for (const error of result.errors) {
      const item = document.createElement("li");
      const instancePath = error.instancePath || error.schemaPath || "(root)";
      item.textContent = `${instancePath} → ${error.message}`;
      list.appendChild(item);
    }
    container.appendChild(list);
  }
}

/**
 * Helper to attach file input reading logic.
 */
export function bindJSONFileInput(inputElement, onLoad) {
  inputElement.addEventListener("change", () => {
    const [file] = inputElement.files || [];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        logEvent("file", `Loaded JSON from ${file.name}`);
        onLoad(parsed, file.name);
      } catch (err) {
        logEvent("file", `Failed to parse ${file.name}`, { error: err.message });
        alert(`Could not parse JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  });
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
