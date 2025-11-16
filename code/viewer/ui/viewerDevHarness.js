import {
  bootViewerCore,
  updateFrameId,
  getFrameId,
  updateLayerVisibility,
  getLayerVisibility,
} from "../core/viewerCore.js";

const DEFAULT_SAMPLE_PATH = "/data/sample/core_viewer_baseline.3dss.json";
const ROTATE_SPEED = 0.01;
const PAN_SPEED = 0.02;
const ZOOM_IN_FACTOR = 0.9;
const ZOOM_OUT_FACTOR = 1.1;

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
  const controlsEl = getRequiredElement("controls");
  const logEl = getRequiredElement("log");
  const summaryEl = getRequiredElement("summary");

  const log = makeLogFn(logEl);
  const setSummary = makeSummaryUpdater(summaryEl);

  const runtime = await bootViewerCore(container, {
    modelPath: DEFAULT_SAMPLE_PATH,
    log,
    setSummary,
    mode: "viewer_dev",
  });

  setupFrameControls(runtime, controlsEl, log, setSummary);
  setupLayerControls(runtime, controlsEl, log, setSummary);
  setupCameraProtoControls(container, runtime);
}

main().catch((error) => {
  console.error(error);
  const logEl = document.getElementById("log");
  if (logEl) {
    const line = `ERROR ${error?.message ?? String(error)}`;
    logEl.textContent += logEl.textContent ? `\n${line}` : line;
  }
});

function setupCameraProtoControls(container, runtime) {
  if (!container || !runtime) return;
  const doc = container.ownerDocument ?? document;
  const win = doc?.defaultView ?? window;
  const pointerState = {
    dragging: false,
    mode: null,
    lastX: 0,
    lastY: 0,
  };

  const stopDragging = () => {
    pointerState.dragging = false;
    pointerState.mode = null;
  };

  container.addEventListener("mousedown", (event) => {
    if (event.button !== 0 && event.button !== 2) {
      return;
    }
    event.preventDefault();
    pointerState.dragging = true;
    pointerState.mode = event.button === 2 || event.shiftKey ? "pan" : "rotate";
    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;
  });

  container.addEventListener("mousemove", (event) => {
    if (!pointerState.dragging) {
      return;
    }
    const deltaX = event.clientX - pointerState.lastX;
    const deltaY = event.clientY - pointerState.lastY;
    pointerState.lastX = event.clientX;
    pointerState.lastY = event.clientY;
    if (pointerState.mode === "pan") {
      panCamera(runtime, deltaX, deltaY);
    } else {
      orbitCamera(runtime, deltaX, deltaY);
    }
  });

  const mouseUpTargets = [container];
  if (doc && doc !== container) {
    mouseUpTargets.push(doc);
  }
  if (win && win !== container && win !== doc) {
    mouseUpTargets.push(win);
  }
  for (const target of mouseUpTargets) {
    if (typeof target?.addEventListener !== "function") continue;
    target.addEventListener("mouseup", stopDragging);
    target.addEventListener("mouseleave", stopDragging);
  }

  container.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  container.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomCamera(runtime, event.deltaY);
    },
    { passive: false }
  );
}

function setupFrameControls(runtime, controlsEl, log, _setSummary) {
  if (!runtime || !controlsEl) {
    return;
  }
  controlsEl.textContent = "";
  const label = document.createElement("div");
  label.textContent = "Frame:";
  label.style.marginBottom = "4px";
  controlsEl.appendChild(label);

  const frames = [0, 1, 2, 3];
  frames.forEach((id) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(id);
    btn.style.marginRight = "4px";
    btn.addEventListener("click", () => {
      try {
        updateFrameId(runtime, id);
        log({ tag: "FRAME_UI", msg: "set frame", payload: { frame_id: id } });
        updateActiveFrameLabel();
      } catch (error) {
        log({ tag: "ERROR", msg: "updateFrameId failed", payload: { message: error?.message } });
      }
    });
    controlsEl.appendChild(btn);
  });

  const activeLabel = document.createElement("div");
  activeLabel.style.marginTop = "8px";
  activeLabel.style.fontSize = "12px";
  activeLabel.dataset.role = "active-frame-label";
  const updateActiveFrameLabel = () => {
    const current = getFrameId(runtime);
    activeLabel.textContent = `Active frame: ${current ?? "default"}`;
  };
  updateActiveFrameLabel();
  controlsEl.appendChild(activeLabel);
}

function setupLayerControls(runtime, controlsEl, log, _setSummary) {
  if (!controlsEl || !runtime) return;

  let current = null;
  try {
    current = getLayerVisibility(runtime);
  } catch (error) {
    log?.({
      tag: "WARN",
      msg: "getLayerVisibility failed",
      payload: { message: error?.message },
    });
    current = { points: true, lines: true, aux: true };
  }

  const container = document.createElement("div");
  container.style.marginTop = "8px";

  const label = document.createElement("div");
  label.textContent = "Layers:";
  label.style.marginBottom = "4px";
  container.appendChild(label);

  const layers = [
    { key: "points", label: "Points" },
    { key: "lines", label: "Lines" },
    { key: "aux", label: "Aux" },
  ];

  layers.forEach(({ key, label: text }) => {
    const wrapper = document.createElement("label");
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.marginRight = "8px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = current?.[key] ?? true;

    const span = document.createElement("span");
    span.textContent = text;
    span.style.marginLeft = "4px";

    checkbox.addEventListener("change", () => {
      try {
        updateLayerVisibility(runtime, key, checkbox.checked);
        log({
          tag: "LAYERS_UI",
          msg: "toggle layer",
          payload: { layer: key, visible: checkbox.checked },
        });
      } catch (error) {
        log({
          tag: "ERROR",
          msg: "updateLayerVisibility failed",
          payload: { message: error?.message },
        });
      }
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(span);
    container.appendChild(wrapper);
  });

  controlsEl.appendChild(container);
}

function orbitCamera(runtime, deltaX, deltaY) {
  const state = runtime.getCameraState();
  const position = Array.isArray(state.position) ? state.position : [0, 0, 0];
  const target = Array.isArray(state.target) ? state.target : [0, 0, 0];
  const offset = [position[0] - target[0], position[1] - target[1], position[2] - target[2]];
  const radius = Math.hypot(offset[0], offset[1], offset[2]) || 0.001;

  let theta = Math.atan2(offset[0], offset[2]);
  let phi = Math.acos(Math.max(-1, Math.min(1, offset[1] / radius)));
  theta -= deltaX * ROTATE_SPEED;
  phi -= deltaY * ROTATE_SPEED;
  const EPS = 0.01;
  phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

  const sinPhi = Math.sin(phi);
  const newX = target[0] + radius * sinPhi * Math.sin(theta);
  const newZ = target[2] + radius * sinPhi * Math.cos(theta);
  const newY = target[1] + radius * Math.cos(phi);

  runtime.updateCameraState({ position: [newX, newY, newZ] });
}

function panCamera(runtime, deltaX, deltaY) {
  const state = runtime.getCameraState();
  const delta = [-deltaX * PAN_SPEED, deltaY * PAN_SPEED, 0];
  const applyDelta = (vector = [0, 0, 0]) => [vector[0] + delta[0], vector[1] + delta[1], vector[2] + delta[2]];
  runtime.updateCameraState({
    position: applyDelta(Array.isArray(state.position) ? state.position : [0, 0, 0]),
    target: applyDelta(Array.isArray(state.target) ? state.target : [0, 0, 0]),
  });
}

function zoomCamera(runtime, deltaY) {
  const state = runtime.getCameraState();
  const position = Array.isArray(state.position) ? state.position : [0, 0, 0];
  const target = Array.isArray(state.target) ? state.target : [0, 0, 0];
  const offset = [position[0] - target[0], position[1] - target[1], position[2] - target[2]];
  const distance = Math.hypot(offset[0], offset[1], offset[2]) || 0.001;
  const zoomFactor = deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
  const newDistance = Math.max(0.1, distance * zoomFactor);
  const ratio = newDistance / distance;
  const newPosition = [target[0] + offset[0] * ratio, target[1] + offset[1] * ratio, target[2] + offset[2] * ratio];
  runtime.updateCameraState({ position: newPosition });
}
