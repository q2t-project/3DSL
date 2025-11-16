import { bootViewerCore } from "../core/viewerCore.js";

const DEFAULT_SAMPLE_PATH = "/data/sample/core_viewer_baseline.3dss.json";
const DEFAULT_CAMERA = Object.freeze({
  position: [6, 4, 10],
  target: [0, 0, 0],
  fov: 55,
});

const LOG_PREFIX = "[viewer-dev]";

function waitForDomReady() {
  if (document.readyState === "interactive" || document.readyState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

function getRequiredElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Required element #${id} not found`);
  }
  return el;
}

function appendLog(logElem, message, extra) {
  const timestamp = new Date().toISOString();
  const serializedExtra =
    extra == null ? "" : ` ${typeof extra === "string" ? extra : JSON.stringify(extra)}`;
  const line = `${LOG_PREFIX} ${timestamp} ${message}${serializedExtra}`;
  console.log(line);
  if (logElem) {
    logElem.textContent += (logElem.textContent ? "\n" : "") + line;
    logElem.scrollTop = logElem.scrollHeight;
  }
}

function updateSummary(summaryElem, summary) {
  if (!summaryElem) return;
  summaryElem.textContent = JSON.stringify(summary ?? {}, null, 2);
}

function handleError(logElem, error) {
  const message = error?.message ?? String(error);
  appendLog(logElem, `error: ${message}`);
  console.error(error);
}

async function initializeHarness() {
  await waitForDomReady();
  const container = getRequiredElement("viewer-root");
  const logElem = document.getElementById("log");
  const summaryElem = document.getElementById("summary");
  const pathInput = document.getElementById("samplePath");
  const reloadBtn = document.getElementById("reloadBtn");

  const bootConfig = {
    mode: "dev",
    logLevel: "debug",
    initial3dssPath: pathInput?.value?.trim() || DEFAULT_SAMPLE_PATH,
    camera: { ...DEFAULT_CAMERA },
    backgroundColor: "#000000",
  };

  if (pathInput && !pathInput.value) {
    pathInput.value = bootConfig.initial3dssPath;
  }

  appendLog(logElem, "boot viewerCore", {
    path: bootConfig.initial3dssPath,
    mode: bootConfig.mode,
  });

  const runtime = await bootViewerCore(container, bootConfig);
  const lastSummary = runtime.getLastLoadSummary?.() ?? null;
  if (lastSummary) {
    updateSummary(summaryElem, lastSummary);
    appendLog(logElem, "initial load", lastSummary);
  }

  async function loadFromInput() {
    const requestedPath = pathInput?.value?.trim() || bootConfig.initial3dssPath;
    appendLog(logElem, "load request", { path: requestedPath });
    const summary = await runtime.loadDocument(requestedPath);
    updateSummary(summaryElem, summary);
    appendLog(logElem, "load success", summary);
  }

  reloadBtn?.addEventListener("click", () => {
    loadFromInput().catch((error) => handleError(logElem, error));
  });
}

initializeHarness().catch((error) => {
  console.error(error);
  const logElem = document.getElementById("log");
  handleError(logElem, error);
});

export { initializeHarness as bootstrapViewerDev };
