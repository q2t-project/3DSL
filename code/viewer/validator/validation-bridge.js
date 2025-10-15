import { Color, MeshBasicMaterial } from '../../../common/vendor/three/three.module.js';
import { validate as runValidate } from '../../validator/validate.js';
import { validateModel } from "../../validator/validate.js";

export async function initValidationBridge(ctx, modelData) {
  const result = validateModel(modelData);
  return result;
}

const HIGHLIGHT_COLOR = new Color('#f87171');
const HIGHLIGHT_OPACITY = 0.55;

const state = {
  scene: null,
  overlay: null,
  indices: null,
  highlighted: new Map(),
  lastResults: null,
  validationToken: 0,
  activeValidation: null,
};

function ensureIndex() {
  if (!state.indices && state.scene) {
    state.indices = buildSceneIndex(state.scene);
  }
  return state.indices;
}

function initValidationBridge(scene, overlayApi = null) {
  if (!scene || typeof scene.traverse !== 'function') {
    throw new Error('initValidationBridge requires a valid THREE.Scene instance');
  }

  state.scene = scene;
  state.overlay = overlayApi || null;
  state.indices = buildSceneIndex(scene);
  state.lastResults = null;

  clearValidationHighlights();

  if (state.overlay?.updateValidationOverlay) {
    state.overlay.updateValidationOverlay({ status: 'pending' });
  }

  return {
    highlightCount: state.highlighted.size,
    indexSize: state.indices?.uuid?.size ?? 0,
  };
}

async function validateModelData(modelData, options = {}) {
  if (!state.scene) {
    throw new Error('validateModelData requires initValidationBridge to be called first');
  }

  if (modelData == null) {
    clearValidationHighlights();
    state.lastResults = null;
    state.overlay?.updateValidationOverlay?.({ status: 'pending' });
    return { valid: false, errors: [] };
  }

  const currentToken = (state.validationToken += 1);
  const overlay = state.overlay;

  overlay?.updateValidationOverlay?.({ status: 'pending' });

  const validationPromise = Promise.resolve()
    .then(() => runValidate(modelData, options))
    .then((result) => {
      if (currentToken !== state.validationToken) {
        return { ...result, skipped: true };
      }

      const enriched = {
        ...result,
        timestamp: result.timestamp ?? Date.now(),
      };

      const applied = applyValidationResults(enriched);
      return {
        ...enriched,
        highlighted: applied.highlighted,
      };
    })
    .catch((error) => {
      if (currentToken === state.validationToken) {
        console.error('validation-bridge: validator execution failed', error);
        state.lastResults = null;
        clearValidationHighlights();
        overlay?.updateValidationOverlay?.({
          status: 'error',
          message: error?.message || 'Validation failed',
          error,
          updatedAt: Date.now(),
        });
      }
      throw error;
    })
    .finally(() => {
      if (state.activeValidation?.token === currentToken) {
        state.activeValidation = null;
      }
    });

  state.activeValidation = { token: currentToken, promise: validationPromise };
  return validationPromise;
}

function applyValidationResults(results) {
  if (!state.scene) {
    console.warn('validation-bridge: applyValidationResults called before init');
    return { highlighted: 0, errors: [] };
  }

  if (results == null) {
    state.lastResults = null;
    clearValidationHighlights();
    state.overlay?.updateValidationOverlay?.({ status: 'pending' });
    return { highlighted: state.highlighted.size, errors: [] };
  }

  const normalized = normalizeResults(results);
  state.lastResults = normalized;

  const targets = mapErrorsToTargets(normalized.errors);

  updateHighlights(targets);
  publishOverlayUpdate(normalized, targets);

  return {
    highlighted: targets.size,
    errors: normalized.errors,
  };
}

function clearValidationHighlights() {
  for (const entry of state.highlighted.values()) {
    restoreHighlight(entry);
  }
  state.highlighted.clear();

  if (state.overlay?.updateValidationOverlay && (!state.lastResults || state.lastResults.errors.length === 0)) {
    state.overlay.updateValidationOverlay({ status: 'pending' });
  }
}

function focusOnInvalid(identifier) {
  if (!state.scene) {
    console.warn('validation-bridge: focusOnInvalid called before init');
    return null;
  }

  const object = resolveIdentifier(identifier);
  if (!object) {
    console.warn('validation-bridge: unable to locate object for identifier', identifier);
    return null;
  }

  if (!state.highlighted.has(object.uuid)) {
    const tracked = applyHighlight(object);
    if (tracked.length) {
      state.highlighted.set(object.uuid, { object, tracked, errors: [] });
    }
  }

  state.overlay?.focusOnObject?.(object);

  return object;
}

function publishOverlayUpdate(result, targets) {
  if (!state.overlay?.updateValidationOverlay) {
    return;
  }

  if (!result) {
    state.overlay.updateValidationOverlay({ status: 'pending' });
    return;
  }

  const errorCount = result.errors.length;
  if (result.valid && errorCount === 0) {
    state.overlay.updateValidationOverlay({
      status: 'valid',
      valid: true,
      errorCount: 0,
      updatedAt: result.timestamp ?? Date.now(),
      errors: [],
    });
    return;
  }

  if (errorCount === 0) {
    state.overlay.updateValidationOverlay({
      status: 'invalid',
      valid: false,
      errorCount: 0,
      updatedAt: result.timestamp ?? Date.now(),
      errors: [],
    });
    return;
  }

  const overlayErrors = result.errors.map((error) => {
    const primaryPath = error.path || error.instancePath || error.dataPath || '#';
    const relatedObjects = targets.get(getPrimaryTargetId(error))?.objects ?? [];
    const objectName = relatedObjects.length
      ? relatedObjects[0].name || relatedObjects[0].userData?.type || relatedObjects[0].uuid
      : null;

    return {
      message: error.message || 'Validation error',
      path: primaryPath,
      keyword: error.keyword,
      target: objectName,
      identifier: deriveBestIdentifier(error, relatedObjects[0]),
    };
  });

  state.overlay.updateValidationOverlay({
    status: 'invalid',
    valid: false,
    errorCount,
    updatedAt: result.timestamp ?? Date.now(),
    errors: overlayErrors,
  });
}

function normalizeResults(results = null) {
  if (!results || typeof results !== 'object') {
    return { valid: false, errors: [] };
  }

  const errors = Array.isArray(results.errors) ? results.errors : [];
  const valid = results.valid === true && errors.length === 0;

  const timestamp = results.timestamp ?? results.generatedAt ?? results.updatedAt ?? Date.now();

  return {
    valid,
    errors,
    timestamp,
  };
}

function mapErrorsToTargets(errors) {
  ensureIndex();

  const map = new Map();

  for (const error of errors) {
    const objects = resolveTargetsForError(error);
    const id = getPrimaryTargetId(error);

    if (!map.has(id)) {
      map.set(id, { error, objects: [] });
    }

    const entry = map.get(id);
    for (const object of objects) {
      if (!entry.objects.includes(object)) {
        entry.objects.push(object);
      }
    }
  }

  return map;
}

function updateHighlights(targets) {
  const seen = new Set();

  for (const { objects } of targets.values()) {
    for (const object of objects) {
      if (!object) {
        continue;
      }

      seen.add(object.uuid);
      if (state.highlighted.has(object.uuid)) {
        continue;
      }

      const tracked = applyHighlight(object);
      if (tracked.length) {
        state.highlighted.set(object.uuid, { object, tracked, errors: [] });
      }
    }
  }

  for (const [uuid, entry] of state.highlighted.entries()) {
    if (!seen.has(uuid)) {
      restoreHighlight(entry);
      state.highlighted.delete(uuid);
    }
  }
}

function applyHighlight(object) {
  const tracked = [];

  object.traverse((child) => {
    if (!child.isObject3D) {
      return;
    }

    const sourceMaterial = child.material;

    if (!sourceMaterial) {
      return;
    }

    if (Array.isArray(sourceMaterial)) {
      const highlight = sourceMaterial.map(createHighlightMaterial);
      if (highlight.length) {
        tracked.push({ object: child, original: sourceMaterial, highlight });
        child.material = highlight;
      }
      return;
    }

    const highlightMaterial = createHighlightMaterial(sourceMaterial);
    if (highlightMaterial) {
      tracked.push({ object: child, original: sourceMaterial, highlight: highlightMaterial });
      child.material = highlightMaterial;
    }
  });

  return tracked;
}

function createHighlightMaterial(material) {
  if (!material || typeof material.clone !== 'function') {
    return new MeshBasicMaterial({
      color: HIGHLIGHT_COLOR,
      transparent: true,
      opacity: HIGHLIGHT_OPACITY,
      depthWrite: false,
    });
  }

  const clone = material.clone();

  if (clone.color && clone.color.isColor) {
    clone.color.copy(HIGHLIGHT_COLOR);
  }

  if (clone.emissive && clone.emissive.isColor) {
    clone.emissive.copy(HIGHLIGHT_COLOR);
    clone.emissiveIntensity = Math.max(clone.emissiveIntensity ?? 0.75, 0.75);
  }

  if (typeof clone.opacity === 'number') {
    clone.opacity = Math.max(clone.opacity, HIGHLIGHT_OPACITY);
    clone.transparent = true;
  }

  if ('depthWrite' in clone) {
    clone.depthWrite = false;
  }

  clone.needsUpdate = true;
  return clone;
}

function restoreHighlight(entry) {
  if (!entry || !Array.isArray(entry.tracked)) {
    return;
  }

  for (const item of entry.tracked) {
    if (!item || !item.object) {
      continue;
    }

    disposeMaterial(item.highlight);
    item.object.material = item.original;
  }
}

function disposeMaterial(material) {
  if (!material) {
    return;
  }

  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  material.dispose?.();
}

function resolveTargetsForError(error) {
  const identifiers = collectIdentifiers(error);
  const result = new Set();

  for (const id of identifiers.ids) {
    const object = resolveIdentifier(id);
    if (object) {
      result.add(object);
    }
  }

  for (const path of identifiers.paths) {
    const object = resolvePath(path);
    if (object) {
      result.add(object);
    }
  }

  if (result.size > 0) {
    return Array.from(result);
  }

  if (typeof error.targetIndex === 'number' && typeof error.targetType === 'string') {
    const object = resolveByTypeIndex(error.targetType, error.targetIndex);
    if (object) {
      result.add(object);
    }
  }

  return Array.from(result);
}

function resolveIdentifier(identifier) {
  const indices = ensureIndex();

  if (!identifier || !indices) {
    return null;
  }

  if (indices.uuid.has(identifier)) {
    return indices.uuid.get(identifier);
  }

  if (indices.dataUuid.has(identifier)) {
    return indices.dataUuid.get(identifier);
  }

  if (identifier.includes(':')) {
    const [, uuid] = identifier.split(':');
    if (uuid && indices.dataUuid.has(uuid)) {
      return indices.dataUuid.get(uuid);
    }
  }

  return resolvePath(identifier);
}

function resolvePath(path) {
  const indices = ensureIndex();

  if (!path || !indices) {
    return null;
  }

  const normalized = normalizeInstancePath(path);
  if (!normalized) {
    return null;
  }

  if (indices.path.has(normalized)) {
    return indices.path.get(normalized);
  }

  const segments = normalized.split('/').filter(Boolean);
  while (segments.length > 2) {
    segments.pop();
    const candidate = `/${segments.join('/')}`;
    if (indices.path.has(candidate)) {
      return indices.path.get(candidate);
    }
  }

  return null;
}

function resolveByTypeIndex(type, index) {
  const indices = ensureIndex();

  if (!indices || typeof index !== 'number') {
    return null;
  }

  const base = `/${type}/${index}`;
  return indices.path.get(base) || indices.path.get(base.slice(1)) || null;
}

function collectIdentifiers(error = {}) {
  const ids = new Set();
  const paths = new Set();

  const addId = (value) => {
    if (typeof value === 'string' && value.trim()) {
      ids.add(value.trim());
    }
  };

  const addPath = (value) => {
    if (typeof value === 'string' && value.trim()) {
      paths.add(value.trim());
    }
  };

  addId(error.objectUUID);
  addId(error.uuid);
  addId(error.id);
  addId(error.nodeUUID);
  addId(error.nodeId);
  addId(error.objectId);
  addId(error.targetUUID);
  addId(error.targetId);
  addId(error.meta?.uuid);
  addId(error.target?.uuid);
  addId(error.target?.meta?.uuid);
  addId(error.source?.uuid);
  addId(error.source?.meta?.uuid);

  addPath(error.instancePath);
  addPath(error.path);
  addPath(error.dataPath);
  addPath(error.dataPointer);
  addPath(error.pointer);
  addPath(error.target?.path);
  addPath(error.targetPath);
  addPath(error.source?.path);

  return { ids: Array.from(ids), paths: Array.from(paths) };
}

function normalizeInstancePath(path) {
  if (typeof path !== 'string') {
    return null;
  }

  let value = path.trim();

  if (!value) {
    return null;
  }

  value = value.replace(/^#/, '');

  if (!value.startsWith('/')) {
    value = `/${value}`;
  }

  value = value.replace(/\/+/g, '/');

  return value;
}

function buildSceneIndex(scene) {
  const uuid = new Map();
  const dataUuid = new Map();
  const path = new Map();

  scene.traverse((object) => {
    uuid.set(object.uuid, object);

    const sourceUuid = object.userData?.source?.meta?.uuid || object.userData?.meta?.uuid;
    if (sourceUuid) {
      dataUuid.set(sourceUuid, object);
    }
  });

  const registerPath = (type, object, index) => {
    if (!object || typeof index !== 'number') {
      return;
    }

    const base = `/${type}/${index}`;
    path.set(base, object);
    path.set(base.slice(1), object);
    path.set(`${type}[${index}]`, object);

    const uuid = object.userData?.source?.meta?.uuid;
    if (uuid && !dataUuid.has(uuid)) {
      dataUuid.set(uuid, object);
    }
  };

  const pointsGroup = scene.getObjectByName('3dss:points');
  if (pointsGroup) {
    const points = pointsGroup.children.filter((child) => child.userData?.type === 'point');
    points.forEach((child, index) => registerPath('point', child, index));
  }

  const linesGroup = scene.getObjectByName('3dss:lines');
  if (linesGroup) {
    const lines = linesGroup.children.filter((child) => child.userData?.type === 'line');
    lines.forEach((child, index) => registerPath('line', child, index));
  }

  const auxGroup = scene.getObjectByName('3dss:aux');
  if (auxGroup) {
    const auxChildren = auxGroup.children.filter((child) => child.userData?.source);
    auxChildren.forEach((child, index) => registerPath('aux', child, index));
  }

  return { uuid, dataUuid, path };
}

function getPrimaryTargetId(error) {
  if (!error || typeof error !== 'object') {
    return '__generic__';
  }

  const identifiers = collectIdentifiers(error);
  if (identifiers.ids.length > 0) {
    return identifiers.ids[0];
  }

  if (identifiers.paths.length > 0) {
    return identifiers.paths[0];
  }

  if (typeof error.targetType === 'string' && typeof error.targetIndex === 'number') {
    return `${error.targetType}:${error.targetIndex}`;
  }

  return '__generic__';
}

function deriveBestIdentifier(error, object) {
  if (error?.objectUUID) {
    return error.objectUUID;
  }

  if (error?.uuid) {
    return error.uuid;
  }

  if (error?.meta?.uuid) {
    return error.meta.uuid;
  }

  if (object?.userData?.source?.meta?.uuid) {
    return object.userData.source.meta.uuid;
  }

  const basePath = error?.path || error?.instancePath;
  if (basePath) {
    return normalizeInstancePath(basePath);
  }

  return object?.uuid || null;
}

export {
  initValidationBridge,
  validateModelData,
  applyValidationResults,
  clearValidationHighlights,
  focusOnInvalid,
};

export default {
  initValidationBridge,
  validateModelData,
  applyValidationResults,
  clearValidationHighlights,
  focusOnInvalid,
};
