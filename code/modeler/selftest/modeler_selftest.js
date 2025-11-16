import assert from 'node:assert/strict';

import { ROOT_IDS, HUD_FIELDS } from '../../common/ui/domIds.js';
import { importFromPrep, importModelFrom3DssSource } from '../io/importer.js';
import { createModelerContext, openDocument } from '../core/modelerCommands.js';
import { ModelerRenderer } from '../renderer/modelerRenderer.js';
import { updateModelerHud } from '../hud/modelerHudController.js';
import { validateModelerDocument } from '../validator/modelerValidator.js';

const SAMPLE_PREP_PAYLOAD = {
  document_meta: {
    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS-prep.schema.json#v1.0.0',
    generator: 'modeler-selftest',
    source: 'selftest-suite',
  },
  points: [
    { name: 'origin', position: [0, 0, 0] },
    { name: 'offset-anchor', position: [0.25, 1.5, -0.75] },
  ],
};

const SAMPLE_CORE_DOCUMENT = {
  document_meta: {
    document_uuid: '00000000-0000-4000-8000-000000000001',
    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0',
    author: 'modeler-selftest',
    version: '1.4.2-selftest',
  },
  scene: {
    id: 'modeler-core-import-scene',
    metadata: { name: 'Modeler Core Import Scene', tags: ['core-import'] },
    nodes: [
      {
        id: 'modeler-core-import-node',
        type: 'anchor',
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        metadata: { name: 'Core Import Anchor', tags: ['core', 'selftest'] },
        children: [],
      },
    ],
  },
  points: [],
  lines: [],
  aux: [],
};

function buildSceneFromPoints(points) {
  const anchorPoint = points[1] ?? points[0];
  return {
    id: 'modeler-selftest-scene',
    metadata: { name: 'Modeler Selftest Scene', tags: ['modeler', 'selftest'] },
    nodes: [
      {
        id: 'modeler-selftest-node',
        type: 'point',
        transform: {
          position: [...(anchorPoint?.position ?? [0, 0, 0])],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        metadata: { name: 'Anchor Node', tags: ['hud', 'renderer'] },
        children: [],
      },
    ],
  };
}

function createMockDom() {
  const elements = new Map();
  const register = (id, extra = {}) => {
    const element = { id, textContent: '', ...extra };
    elements.set(id, element);
    return element;
  };

  register(HUD_FIELDS.documentUuid);
  register(HUD_FIELDS.version);
  register(HUD_FIELDS.units);
  register(ROOT_IDS.modelerCanvas, { nodeName: 'CANVAS' });

  return {
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };
}

function createSelftestDocumentFromPrep() {
  const importResult = importFromPrep(SAMPLE_PREP_PAYLOAD);
  assert.equal(importResult.ok, true, `importFromPrep failed: ${importResult.errors?.join(', ')}`);
  const doc = importResult.document;
  assert.ok(doc, 'importer should produce a ThreeDSSDocument');

  doc.lines = [
    {
      id: 'modeler-selftest-line',
      from: doc.points[0]?.id,
      to: doc.points[1]?.id,
      kind: 'edge',
      style: { width: 1.25 },
    },
  ];
  doc.aux = [];
  doc.scene = buildSceneFromPoints(doc.points);
  doc.document_meta = {
    ...doc.document_meta,
    author: 'modeler-selftest',
    version: '1.0.0-selftest',
    coordinate_system: 'Z+up/freeXY',
    units: 'mm',
    language: 'en',
  };

  return doc;
}

function createStubThreeDssValidator() {
  const validator = (doc) => {
    const hasUuid = typeof doc?.document_meta?.document_uuid === 'string' && doc.document_meta.document_uuid.length > 0;
    const hasPoints = Array.isArray(doc?.points) && doc.points.length >= 2;
    const hasLines = Array.isArray(doc?.lines) && doc.lines.length >= 1;
    const hasScene = typeof doc?.scene?.id === 'string' && Array.isArray(doc.scene?.nodes);

    const ok = Boolean(hasUuid && hasPoints && hasLines && hasScene);
    if (!ok) {
      validator.errors = [
        {
          message: 'document is missing required sections for selftest',
          instancePath: '/document',
          keyword: 'selftest',
          params: {},
        },
      ];
    } else {
      validator.errors = null;
    }
    return ok;
  };
  return validator;
}

async function runCoreImporterSmokeTest() {
  const model = await importModelFrom3DssSource(SAMPLE_CORE_DOCUMENT);
  assert.equal(
    model.version,
    SAMPLE_CORE_DOCUMENT.document_meta.version,
    'core importer should preserve version',
  );
  assert.equal(model.scene.id, SAMPLE_CORE_DOCUMENT.scene.id, 'core importer should hydrate scene id');
  assert.equal(model.scene.nodes.length, SAMPLE_CORE_DOCUMENT.scene.nodes.length, 'core importer should keep nodes');
  return model;
}

async function runSelftest() {
  const document = createSelftestDocumentFromPrep();
  assert.equal(document.points.length, SAMPLE_PREP_PAYLOAD.points.length, 'all PREP points should be converted');
  assert.equal(document.scene.id, 'modeler-selftest-scene');

  const validatorFn = createStubThreeDssValidator();
  const validationResult = validateModelerDocument(document, validatorFn);
  assert.equal(validationResult.ok, true, validationResult.errors?.[0]?.message ?? 'document failed validation');

  const ctx = createModelerContext();
  openDocument(ctx, document);
  assert.equal(ctx.document, document, 'context should hold the imported document');

  const mockDom = createMockDom();
  const canvasElement = mockDom.getElementById(ROOT_IDS.modelerCanvas);
  assert.ok(canvasElement, 'mock DOM should expose a canvas element');

  const renderer = new ModelerRenderer(canvasElement);
  renderer.init();
  assert.equal(renderer.initialized, true, 'renderer should initialize successfully');
  renderer.render(document);

  updateModelerHud(document, mockDom);
  assert.equal(
    mockDom.getElementById(HUD_FIELDS.documentUuid)?.textContent,
    document.document_meta.document_uuid,
    'HUD should reflect document UUID',
  );
  assert.equal(
    mockDom.getElementById(HUD_FIELDS.version)?.textContent,
    document.document_meta.version,
    'HUD should reflect document version',
  );
  assert.equal(
    mockDom.getElementById(HUD_FIELDS.units)?.textContent,
    document.document_meta.units,
    'HUD should reflect document units',
  );

  const coreModel = await runCoreImporterSmokeTest();

  console.log(
    'modeler_selftest summary',
    JSON.stringify(
      {
        nodesInScene: document.scene.nodes.length,
        points: document.points.length,
        documentUuid: document.document_meta.document_uuid,
        rendererInitialized: renderer.initialized,
        coreImporterVersion: coreModel.version,
      },
      null,
      2,
    ),
  );
}

runSelftest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
