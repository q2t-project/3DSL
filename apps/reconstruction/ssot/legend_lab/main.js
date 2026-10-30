import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/examples/jsm/controls/OrbitControls.js';
import { CSS3DObject, CSS3DRenderer } from '../vendor/three/examples/jsm/renderers/CSS3DRenderer.js';
import { fitProjectedPoints } from './projectedFit.js';

const $ = (id) => document.getElementById(id);
const stage = $('model-stage');
const surface = $('model-surface');
const support = $('support-content');
const status = $('load-status');
const source = await fetch('./model.3dss.json').then((response) => {
  if (!response.ok) throw new Error(`見本のデータを読み込めませんでした (${response.status})`);
  return response.json();
}).catch((error) => {
  status.textContent = error.message;
  throw error;
});
const originalModel = JSON.stringify(source);
const local = (value) => typeof value === 'string' ? value : value?.ja ?? value?.en ?? '';
const pointById = new Map(source.points.map((point) => [point.meta.uuid, point]));
const lineById = new Map(source.lines.map((line) => [line.meta.uuid, line]));
const legendById = new Map((source.visual_legend ?? []).map((entry) => [entry.id, entry]));
const elements = new Map([...pointById, ...lineById]);
const labels = [];
const coloredObjects = [];
let selectedId = null;
let activeTab = 'info';
let step = Number($('comparison-step').value);
let noColor = false;
let singleFont = false;
let ready = false;
let lastFitInsets = null;
const allFitPoints = [];
const labelFitPoints = new Map();
// These two reading scopes belong to this authored specimen. They are not
// inferred from names, colors, poses, or a universal process classification.
const readingGroups = {
  storage: {
    label: '保管を見る',
    ids: ['9c888f3a-3fc8-5aa9-acf3-57772f791324', 'f718df2a-696c-5eea-b110-00480e58c191', '78f6242e-6b30-5320-b6c4-8f80fe3bbd90', '75b49b41-e0af-5dfa-8116-56937161e397', 'd58c225c-b2f1-5413-ba75-2114beeed6ba'],
  },
  cooking: {
    label: '炊飯を見る',
    ids: ['908a867e-c0ba-5a73-a817-46153520398c', '4c862590-5943-5ca2-ae32-aeb7e0fae2e3', '42c89567-1b44-5c7c-9f38-82ccde2c8a3f', 'f225f07d-b1ab-5ece-8834-d60b3726bec7', '9198ffbd-1d87-5b39-9881-b5006e35fbd1', 'a37e1d91-6780-51c3-94c9-cd62cb8600a0', 'e8835fe6-016d-5ab7-b733-d1d1d7ce9cff', 'ad17bb62-8ce5-5705-a6c9-38e68d0c3652', '571f1466-2695-5f35-a327-1252976272ca'],
  },
};
for (const group of Object.values(readingGroups)) {
  if (group.ids.some((id) => !elements.has(id))) throw new Error('見本の視点に対応する要素がありません。');
}

const scene = new THREE.Scene();
const labelScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10000);
camera.up.set(0, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setClearColor(0x0b1119, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.className = 'webgl-layer';
surface.append(renderer.domElement);
const textRenderer = new CSS3DRenderer();
textRenderer.domElement.className = 'labels-layer';
surface.append(textRenderer.domElement);
const axesCanvas = document.createElement('canvas');
axesCanvas.width = 160;
axesCanvas.height = 160;
axesCanvas.className = 'axes-widget';
axesCanvas.setAttribute('role', 'img');
axesCanvas.setAttribute('aria-label', '座標軸。Xは青、Yは緑、Zは赤');
stage.append(axesCanvas);
const controls = new OrbitControls(camera, textRenderer.domElement);
controls.enableDamping = false;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.panSpeed = 1;
controls.minDistance = 25;
controls.maxDistance = 2500;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

function vector(value, fallback = [0, 0, 0]) {
  return new THREE.Vector3(...(Array.isArray(value) ? value : fallback));
}

function quaternionFromPose(pose) {
  const front = vector(pose?.front, [0, 1, 0]).normalize();
  const up = vector(pose?.up, [0, 0, 1]).normalize();
  const right = new THREE.Vector3().crossVectors(up, front).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, front));
}

function nameOf(element) {
  return local(element?.signification?.name) || local(element?.signification?.caption) || '要素';
}

function labelTextOf(point) {
  return point.appearance?.marker?.text?.content || nameOf(point);
}

function fontFamily(token) {
  return /serif|mincho|明朝/i.test(token ?? '') && !/sans-serif/i.test(token ?? '') ? 'Lab Serif' : 'Lab Sans';
}

function addLabel(element, kind, text, position, config) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'model-label';
  button.dataset.elementId = element.meta.uuid;
  button.dataset.kind = kind;
  button.setAttribute('aria-label', `${text}を選択`);
  button.setAttribute('aria-pressed', 'false');
  const ink = document.createElement('span');
  ink.className = 'label-ink';
  ink.textContent = text;
  button.append(ink);
  const object = new CSS3DObject(button);
  object.position.copy(position);
  object.quaternion.copy(quaternionFromPose(config.pose));
  const size = kind === 'point' ? config.size ?? 8 : config.font_size ?? 8;
  object.scale.setScalar(size / 64);
  labelScene.add(object);
  const entry = { id: element.meta.uuid, kind, element, object, button, ink, config, size };
  labels.push(entry);
  button.addEventListener('click', (event) => {
    // Trusted pointer clicks are handled by the shared tap/drag decision below.
    // Keyboard activation has detail 0 and still supports accessible selection.
    if (event.detail === 0) select(entry.id);
  });
  return entry;
}

const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xd7e4ef });
for (const point of source.points) {
  const position = vector(point.appearance.position);
  const marker = point.appearance.marker ?? {};
  if (marker.primitive !== 'none') {
    const node = new THREE.Mesh(new THREE.SphereGeometry(marker.radius ?? 0.6, 10, 8), pointMaterial);
    node.position.copy(position);
    node.userData.elementId = point.meta.uuid;
    scene.add(node);
  }
  if (marker.text) addLabel(point, 'point', labelTextOf(point), position, marker.text);
}

function endpoint(line, key) {
  const reference = line.appearance?.[key]?.ref ?? line[key]?.ref;
  if (reference && pointById.has(reference)) return vector(pointById.get(reference).appearance.position);
  const geometry = line.appearance?.geometry;
  const positions = line.appearance?.path ?? geometry?.points;
  if (Array.isArray(positions) && positions.length > 1) {
    return vector(key === 'end_a' ? positions[0] : positions[positions.length - 1]);
  }
  return null;
}

function addStroke(start, end, color, radius = 0.34) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const material = new THREE.MeshBasicMaterial({ color });
  const stroke = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material);
  stroke.position.copy(start).add(end).multiplyScalar(0.5);
  stroke.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  scene.add(stroke);
  return stroke;
}

for (const line of source.lines) {
  const a = endpoint(line, 'end_a');
  const b = endpoint(line, 'end_b');
  if (!a || !b || a.distanceToSquared(b) < 0.0001) throw new Error(`線の端点を表示できません: ${line.meta.uuid}`);
  const authoredColor = line.appearance.color ?? '#d9e1e8';
  const stroke = addStroke(a, b, authoredColor);
  stroke.userData.elementId = line.meta.uuid;
  coloredObjects.push({ object: stroke, color: authoredColor });
  const arrow = line.appearance.arrow;
  if (arrow && arrow.primitive !== 'none') {
    const direction = new THREE.Vector3().subVectors(b, a).normalize();
    const arrowLength = 3.4;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, arrowLength, 9), new THREE.MeshBasicMaterial({ color: authoredColor }));
    const towardsA = arrow.placement === 'end_a';
    const forward = direction.clone().multiplyScalar(towardsA ? -1 : 1);
    cone.position.copy(towardsA ? a : b).addScaledVector(forward, -arrowLength * 0.65);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
    cone.userData.elementId = line.meta.uuid;
    scene.add(cone);
    coloredObjects.push({ object: cone, color: authoredColor });
  }
  const config = line.appearance.caption_text ?? {};
  const labelPosition = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  if (config.offset) labelPosition.add(vector(config.offset));
  addLabel(line, 'line', nameOf(line), labelPosition, config);
}

function append(tag, parent, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function currentColor(color) {
  return step >= 3 && !noColor ? color : '#d9e1e8';
}

function applyComparison() {
  step = Number($('comparison-step').value);
  noColor = $('no-color').checked;
  singleFont = $('single-font').checked;
  for (const entry of labels) {
    const { config, ink, button } = entry;
    const writingMode = step >= 1 ? config.writing_mode ?? 'horizontal-tb' : 'horizontal-tb';
    const family = step >= 2 && !singleFont ? fontFamily(config.font) : 'Lab Sans';
    ink.style.writingMode = writingMode;
    ink.style.textOrientation = 'mixed';
    ink.style.fontFamily = `"${family}", ${family === 'Lab Serif' ? 'serif' : 'sans-serif'}`;
    ink.style.fontWeight = String(config.font_weight ?? 400);
    ink.style.color = currentColor(config.color ?? '#f3f5f7');
    button.dataset.writingMode = writingMode;
    button.dataset.font = family;
    button.dataset.size = String(entry.size);
  }
  for (const record of coloredObjects) record.object.material.color.set(currentColor(record.color));
  renderPanel();
  render();
}

function getWorldCorners(entry) {
  const width = entry.button.offsetWidth;
  const height = entry.button.offsetHeight;
  entry.object.updateMatrixWorld(true);
  const corners = [];
  for (const x of [-width / 2, width / 2]) {
    for (const y of [-height / 2, height / 2]) {
      corners.push(new THREE.Vector3(x, y, 0).applyMatrix4(entry.object.matrixWorld).toArray());
    }
  }
  return corners;
}

function getWorldBounds(entry) {
  return new THREE.Box3().setFromPoints(getWorldCorners(entry).map((corner) => vector(corner)));
}

function geometryFitPoints(includedIds = null) {
  const points = [];
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    const vertices = object.geometry?.getAttribute('position');
    if (!vertices || !object.visible || (includedIds && !includedIds.has(object.userData.elementId))) return;
    for (let index = 0; index < vertices.count; index += 1) {
      points.push(new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld).toArray());
    }
  });
  return points;
}

function actualFitPoints() {
  return [...labels.flatMap(getWorldCorners), ...geometryFitPoints()];
}

function fitReadingGroup(key) {
  const group = readingGroups[key];
  const points = group.ids.flatMap((id) => labelFitPoints.get(id) ?? []);
  points.push(...geometryFitPoints(new Set(group.ids)));
  fit(points);
}

function appendReadingViews(parent) {
  const buttons = append('div', parent, undefined, 'reading-views');
  for (const [key, group] of Object.entries(readingGroups)) {
    const button = append('button', buttons, group.label);
    button.type = 'button';
    button.id = `view-${key}`;
    button.addEventListener('click', () => fitReadingGroup(key));
  }
}

function fit(points, resetDirection = false) {
  if (!points.length) return;
  const direction = resetDirection
    ? new THREE.Vector3(1, 1.3, 1.15).normalize()
    : camera.position.clone().sub(controls.target).normalize();
  const { width, height } = stage.getBoundingClientRect();
  const horizontalInset = Math.max(16, width * 0.06);
  const insets = { left: horizontalInset, right: horizontalInset, top: 58, bottom: 30 };
  const result = fitProjectedPoints(points, {
    direction: direction.toArray(), up: camera.up.toArray(), width, height, fov: camera.fov,
    insets,
    minDistance: controls.minDistance, maxDistance: controls.maxDistance,
  });
  lastFitInsets = { ...insets };
  controls.target.fromArray(result.target);
  camera.position.fromArray(result.position);
  controls.update();
  render();
}

function render() {
  camera.updateMatrixWorld();
  scene.updateMatrixWorld();
  labelScene.updateMatrixWorld();
  renderer.render(scene, camera);
  textRenderer.render(labelScene, camera);
  drawAxes();
}

function drawAxes() {
  const context = axesCanvas.getContext('2d');
  context.clearRect(0, 0, 160, 160);
  context.fillStyle = '#0b1119cc';
  context.fillRect(0, 0, 160, 160);
  context.lineWidth = 5;
  context.font = '22px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const inverse = camera.quaternion.clone().invert();
  for (const [axis, color, direction] of [
    ['X', '#739dff', new THREE.Vector3(1, 0, 0)],
    ['Y', '#5ad995', new THREE.Vector3(0, 1, 0)],
    ['Z', '#ff8585', new THREE.Vector3(0, 0, 1)],
  ]) {
    const projected = direction.applyQuaternion(inverse);
    const x = 80 + projected.x * 48;
    const y = 80 - projected.y * 48;
    context.strokeStyle = color;
    context.beginPath(); context.moveTo(80, 80); context.lineTo(x, y); context.stroke();
    context.fillStyle = '#f3f5f7';
    context.fillText(axis, 80 + projected.x * 65, 80 - projected.y * 65);
  }
}

function select(id) {
  if (!elements.has(id)) return;
  selectedId = id;
  activeTab = 'info';
  for (const entry of labels) {
    entry.button.classList.toggle('is-selected', entry.id === id);
    entry.button.setAttribute('aria-pressed', String(entry.id === id));
  }
  $('fit-selected').disabled = false;
  renderPanel();
  support.scrollTop = 0;
}

function poseName(pose) {
  const front = pose?.front ?? [0, 1, 0];
  if (Math.abs(front[0]) > 0.99) return 'YZ面';
  if (Math.abs(front[1]) > 0.99) return 'XZ面';
  if (Math.abs(front[2]) > 0.99) return 'XY面';
  return '指定された文字面';
}

function renderPanel() {
  $('tab-info').setAttribute('aria-pressed', String(activeTab === 'info'));
  $('tab-legend').setAttribute('aria-pressed', String(activeTab === 'legend'));
  $('selection-summary').textContent = selectedId ? nameOf(elements.get(selectedId)) : '同じ図で比較';
  const previousScroll = support.scrollTop;
  support.replaceChildren();
  if (activeTab === 'legend') {
    append('h2', support, 'この見本の凡例');
    append('p', support, '面とサイズは全段階で同じです。縦書き・書体・色を順に加えて比べます。');
    const list = append('ul', support, undefined, 'legend-list');
    for (const item of source.visual_legend ?? []) {
      const li = append('li', list);
      const title = append('div', li, undefined, 'legend-title');
      const swatch = append('span', title, undefined, 'legend-swatch');
      swatch.style.setProperty('--swatch', currentColor(item.sample?.color ?? '#d9e1e8'));
      swatch.setAttribute('aria-hidden', 'true');
      append('span', title, local(item.label));
      append('p', li, local(item.description));
    }
    append('p', support, 'X＝青、Y＝緑、Z＝赤は座標の色。線の系列色とは別です。', 'quiet');
    append('p', support, '色なしでも接続の言葉、単一書体でも「注：」を残します。サイズの差は量ではなく、見るスコープの差です。', 'quiet');
  } else if (selectedId) {
    const element = elements.get(selectedId);
    const entry = labels.find((label) => label.id === selectedId);
    append('h2', support, nameOf(element));
    append('p', support, local(element.meta.creator_memo));
    if (entry) {
      const mode = entry.button.dataset.writingMode === 'vertical-rl' ? '縦書き' : '横書き';
      append('p', support, `${poseName(entry.config.pose)} · ${mode} · サイズ ${entry.size}`, 'meta-line');
    }
    const selectedLegends = (element.meta.legend_refs ?? []).map((id) => legendById.get(id)).filter(Boolean);
    if (selectedLegends.length) append('p', support, selectedLegends.map((legend) => local(legend.label)).join(' / '), 'meta-line');
    appendReadingViews(support);
    const connections = [];
    if (pointById.has(selectedId)) {
      for (const line of source.lines) {
        const a = line.appearance?.end_a?.ref ?? line.end_a?.ref;
        const b = line.appearance?.end_b?.ref ?? line.end_b?.ref;
        if (a === selectedId || b === selectedId) {
          const target = a === selectedId ? b : a;
          if (elements.has(target)) connections.push({ text: `${nameOf(line)} → ${nameOf(elements.get(target))}`, id: target });
        }
      }
    } else {
      for (const key of ['end_a', 'end_b']) {
        const id = element.appearance?.[key]?.ref ?? element[key]?.ref;
        if (elements.has(id)) connections.push({ text: nameOf(elements.get(id)), id });
      }
    }
    if (connections.length) {
      append('h3', support, '接続をたどる');
      const list = append('ul', support, undefined, 'connection-list');
      for (const item of connections) {
        const li = append('li', list);
        append('span', li, item.text);
        const button = append('button', li, '辿る');
        button.type = 'button';
        button.addEventListener('click', () => { select(item.id); support.scrollTop = 0; });
      }
    }
  } else {
    append('h2', support, '米の状態・保管・炊飯を比べる');
    append('p', support, '文字をタップすると、図を残したままここに説明が出ます。');
    appendReadingViews(support);
    append('p', support, '「比較」で表現を順に加えて、保管と炊飯の違い、調理役との関係が読み取りやすくなるか確かめてください。');
    append('p', support, local(source.document_meta.document_summary), 'quiet');
  }
  support.scrollTop = previousScroll;
}

const downPointers = new Map();
let gestureMoved = false;
let gestureMulti = false;
textRenderer.domElement.addEventListener('pointerdown', (event) => {
  if (downPointers.size === 0) { gestureMoved = false; gestureMulti = false; }
  const label = event.target.closest('[data-element-id]');
  downPointers.set(event.pointerId, { x: event.clientX, y: event.clientY, id: label?.dataset.elementId ?? null });
  if (downPointers.size > 1) gestureMulti = true;
}, true);
textRenderer.domElement.addEventListener('pointermove', (event) => {
  const start = downPointers.get(event.pointerId);
  if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) gestureMoved = true;
}, true);
textRenderer.domElement.addEventListener('pointerup', (event) => {
  const start = downPointers.get(event.pointerId);
  downPointers.delete(event.pointerId);
  if (start && !gestureMoved && !gestureMulti && start.id && event.button === 0) {
    select(start.id);
    support.scrollTop = 0;
  }
}, true);
textRenderer.domElement.addEventListener('pointercancel', (event) => {
  downPointers.delete(event.pointerId);
  gestureMoved = true;
}, true);

for (const id of ['comparison-step', 'no-color', 'single-font']) $(id).addEventListener('change', applyComparison);
$('tab-info').addEventListener('click', () => { activeTab = 'info'; renderPanel(); support.scrollTop = 0; });
$('tab-legend').addEventListener('click', () => { activeTab = 'legend'; renderPanel(); support.scrollTop = 0; });
$('reset-view').addEventListener('click', () => fit(allFitPoints, true));
$('fit-all').addEventListener('click', () => fit(actualFitPoints()));
$('fit-selected').addEventListener('click', () => {
  const entry = labels.find((label) => label.id === selectedId);
  if (entry) fit(getWorldCorners(entry));
});
for (const [id, factor] of [['zoom-in', 0.8], ['zoom-out', 1.25]]) $(id).addEventListener('click', () => {
  const offset = camera.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(distance));
  controls.update();
  render();
});
controls.addEventListener('change', render);

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  if (width < 1 || height < 1) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  textRenderer.setSize(width, height);
  if (ready) fit(allFitPoints);
  else render();
}
new ResizeObserver(resize).observe(stage);
resize();

window.legendLab = {
  get ready() { return ready; },
  getState() {
    return {
      ready, model: JSON.parse(originalModel), modelUnchanged: JSON.stringify(source) === originalModel,
      camera: { position: camera.position.toArray(), target: controls.target.toArray(), up: camera.up.toArray(), fov: camera.fov, aspect: camera.aspect },
      selectedId, step, noColor, singleFont,
      fitInsets: lastFitInsets ? { ...lastFitInsets } : null,
      initialFitPoints: allFitPoints.map((point) => point.slice()),
      readingGroups: Object.fromEntries(Object.entries(readingGroups).map(([key, group]) => [key, { label: group.label, ids: group.ids.slice() }])),
      renderColors: coloredObjects.map((record) => record.object.material.color.getHexString()),
      labels: labels.map((entry) => {
        const rect = entry.ink.getBoundingClientRect();
        const bounds = getWorldBounds(entry);
        return {
          id: entry.id, kind: entry.kind, position: entry.object.position.toArray(), quaternion: entry.object.quaternion.toArray(),
          size: entry.size, writingMode: entry.button.dataset.writingMode, font: entry.button.dataset.font,
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
          worldCorners: getWorldCorners(entry),
        };
      }),
    };
  },
};

try {
  await Promise.all([
    document.fonts.load('400 64px "Lab Sans"'),
    document.fonts.load('700 64px "Lab Sans"'),
    document.fonts.load('400 64px "Lab Serif"'),
  ]);
  await document.fonts.ready;
  const intendedStep = $('comparison-step').value;
  // One common initial framing contains every comparison step. Changing the
  // writing mode or typeface therefore never moves the camera by itself.
  allFitPoints.push(...geometryFitPoints());
  for (const value of ['0', '1', '2', '3']) {
    $('comparison-step').value = value;
    applyComparison();
    for (const entry of labels) {
      const corners = getWorldCorners(entry);
      allFitPoints.push(...corners);
      const previous = labelFitPoints.get(entry.id) ?? [];
      previous.push(...corners);
      labelFitPoints.set(entry.id, previous);
    }
  }
  $('comparison-step').value = intendedStep;
  applyComparison();
  ready = true;
  fit(allFitPoints, true);
  status.hidden = true;
} catch (error) {
  status.textContent = '書体を読み込めませんでした。再読み込みして確認してください。';
  console.error(error);
}
