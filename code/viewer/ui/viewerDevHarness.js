import { bootViewerCore } from "../core/viewerCore.js";

const DEFAULT_SAMPLE_PATH = "/data/sample/core_viewer_baseline.3dss.json";

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

function makeLogFn(logEl) {
  return (record) => {
    if (!logEl || !record) return;
    const tag = record.tag ?? "LOG";
    const msg = record.msg ? ` ${record.msg}` : "";
    const payload = record.payload !== undefined ? ` ${JSON.stringify(record.payload)}` : "";
    const line = `${tag}${msg}${payload}`;
    logEl.textContent += logEl.textContent ? `\n${line}` : line;
    logEl.scrollTop = logEl.scrollHeight;
    console.log(`[viewer-dev] ${line}`);
  };
}

function makeSummaryUpdater(summaryEl) {
  return (summary) => {
    if (!summaryEl) return;
    summaryEl.textContent = JSON.stringify(summary ?? {}, null, 2);
  };
}

async function main() {
  await waitForDomReady();
  const container = getRequiredElement("viewer-root");
  const logEl = getRequiredElement("log");
  const summaryEl = getRequiredElement("summary");

  const log = makeLogFn(logEl);
  const setSummary = makeSummaryUpdater(summaryEl);

  await bootViewerCore(container, {
    modelPath: DEFAULT_SAMPLE_PATH,
    log,
    setSummary,
    mode: "viewer_dev",
  });
}

main().catch((error) => {
  console.error(error);
  const logEl = document.getElementById("log");
  if (logEl) {
    const line = `ERROR ${error?.message ?? String(error)}`;
    logEl.textContent += logEl.textContent ? `\n${line}` : line;
  }
});
