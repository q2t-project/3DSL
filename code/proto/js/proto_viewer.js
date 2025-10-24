import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import Ajv from "https://cdn.jsdelivr.net/npm/ajv@8.12.0/dist/ajv2020.mjs";
import addFormats from "https://cdn.jsdelivr.net/npm/ajv-formats@2.1.1/dist/ajv-formats.mjs";
import {
  PATHS,
  bindJSONFileInput,
  loadJSON,
  logEvent,
  renderValidationSummary
} from "./utils.js";

let renderer;
let scene;
let camera;
let controls;
let rootGroup;
let validator;
let schemaCache;

async function ensureValidator() {
  if (validator) {
    return validator;
  }
  if (!schemaCache) {
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
  return validator;
}

function initThree() {
  const canvasContainer = document.querySelector("#viewer-canvas");
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(6, 6, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  canvasContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  const grid = new THREE.GridHelper(20, 20, 0x334155, 0x1f2937);
  scene.add(grid);

  const axes = new THREE.AxesHelper(3);
  scene.add(axes);

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  window.addEventListener("resize", onResize);
  animate();
}

function onResize() {
  if (!renderer) return;
  const container = document.querySelector("#viewer-canvas");
  const width = container.clientWidth;
  const height = container.clientHeight || 1;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  controls?.update();
  renderer?.render(scene, camera);
}

function clearRootGroup() {
  if (!rootGroup) {
    return;
  }
  while (rootGroup.children.length > 0) {
    const child = rootGroup.children[0];
    rootGroup.remove(child);
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((mat) => mat.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  }
}

function createMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex || "#60a5fa"),
    metalness: 0.1,
    roughness: 0.4
  });
}

function addPoint(point) {
  const position = point?.appearance?.position;
  if (!Array.isArray(position) || position.length < 3) {
    return null;
  }
  const color = point?.appearance?.marker?.common?.color || "#60a5fa";
  const material = createMaterial(color);
  const geometry = new THREE.SphereGeometry(0.15, 24, 24);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  rootGroup.add(mesh);
  return mesh.position.clone();
}

function resolveEndpoint(endpoint, pointsMap) {
  if (!endpoint) return null;
  if (endpoint.ref) {
    return pointsMap.get(endpoint.ref) || null;
  }
  if (Array.isArray(endpoint.coord)) {
    return new THREE.Vector3(...endpoint.coord);
  }
  return null;
}

function addLine(line, pointsMap) {
  const endA = resolveEndpoint(line?.appearance?.end_a, pointsMap);
  const endB = resolveEndpoint(line?.appearance?.end_b, pointsMap);
  if (!endA || !endB) {
    return;
  }
  const color = line?.appearance?.color || "#f97316";
  const material = new THREE.LineBasicMaterial({ color });
  const points = [endA, endB];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMesh = new THREE.Line(geometry, material);
  rootGroup.add(lineMesh);
}

async function validateAndRender(data) {
  const validate = await ensureValidator();
  const valid = validate(data);
  const errors = valid
    ? []
    : (validate.errors || []).map((error) => ({
        instancePath: error.instancePath,
        schemaPath: error.schemaPath,
        message: error.message
      }));

  const panel = document.querySelector("#viewer-validation");
  renderValidationSummary(panel, { valid, errors });

  if (!valid) {
    logEvent("viewer", "Validation failed", { errorCount: errors.length });
    clearRootGroup();
    return;
  }

  logEvent("viewer", "Rendering document", {
    pointCount: data.points?.length || 0,
    lineCount: data.lines?.length || 0
  });

  clearRootGroup();
  const pointsMap = new Map();
  (data.points || []).forEach((point) => {
    const position = addPoint(point);
    if (position && point?.meta?.uuid) {
      pointsMap.set(point.meta.uuid, position);
    }
  });

  (data.lines || []).forEach((line) => addLine(line, pointsMap));
}

function setupViewerUI() {
  const sampleSelector = document.querySelector("#viewer-sample");
  const loadButton = document.querySelector("#viewer-load");
  const fileInput = document.querySelector("#viewer-file");

  bindJSONFileInput(fileInput, (data) => {
    validateAndRender(data);
  });

  loadButton.addEventListener("click", async () => {
    const selection = sampleSelector.value;
    if (!selection) {
      return;
    }
    const path = `${PATHS.dataRoot}/${selection}`;
    try {
      const data = await loadJSON(path);
      validateAndRender(data);
      logEvent("viewer", "Loaded bundled sample", { path });
    } catch (err) {
      logEvent("viewer", "Failed to load sample", { path, error: err.message });
      alert(err.message);
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  initThree();
  setupViewerUI();
  logEvent("viewer", "Viewer ready");
  try {
    const data = await loadJSON(`${PATHS.dataRoot}/sample_valid.3dss.json`);
    validateAndRender(data);
  } catch (err) {
    logEvent("viewer", "Failed to auto-load sample", { error: err.message });
  }
});
