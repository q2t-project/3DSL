import assert from 'node:assert/strict';

import { createEmptyDocument } from '../../common/core/modelTypes.js';
import { ROOT_IDS, HUD_FIELDS } from '../../common/ui/domIds.js';
import { createViewerContext, loadDocument } from '../core/viewerCommands.js';
import { ViewerRenderer } from '../renderer/viewerRenderer.js';
import { createScene } from '../scene/scene_builder.js';
import { updateViewerHud } from '../hud/viewerHudController.js';

function countModelNodes(nodes = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return 0;
  }
  return nodes.reduce((acc, node) => acc + 1 + countModelNodes(node.children), 0);
}

function buildSelfTestDocument() {
  const doc = createEmptyDocument();
  doc.version = '1.2.3';
  doc.document_meta = {
    document_uuid: 'viewer-selftest-doc',
    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json',
    author: 'viewer-selftest',
    version: '1.2.3',
    coordinate_system: 'Z+up/freeXY',
    units: 'mm',
    language: 'en',
  };

  doc.points = [
    { id: 'point-root', label: 'Root', position: [0, 0, 0], style: { color: '#ffaa00' } },
    { id: 'point-offset', label: 'Offset', position: [0.5, 1.25, -2], style: { color: '#55ffcc' } },
  ];

  doc.lines = [
    { id: 'line-root', from: 'point-root', to: 'point-offset', kind: 'edge', style: { width: 1 } },
  ];

  doc.scene = {
    id: 'viewer-selftest-scene',
    nodes: [
      {
        id: 'viewer-selftest-node',
        type: 'point',
        transform: {
          position: [0.5, 1.25, -2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        metadata: { name: 'SelfTest Anchor', tags: ['selftest', 'anchor'] },
      },
    ],
    metadata: { name: 'Viewer Selftest Scene', tags: ['viewer', 'selftest'] },
    environment: {
      background: '#202840',
      gridEnabled: false,
      axisEnabled: false,
    },
  };

  return doc;
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
  register(ROOT_IDS.viewerCanvas, { nodeName: 'CANVAS' });

  return {
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };
}

function runSelfTest() {
  const doc = buildSelfTestDocument();

  const viewScene = createScene(doc.scene);
  assert.equal(viewScene.id, doc.scene.id);
  assert.equal(viewScene.nodes.length, countModelNodes(doc.scene.nodes));
  assert.deepEqual(viewScene.nodes[0].pos, { x: 0.5, y: 1.25, z: -2 });
  assert.deepEqual(viewScene.environment, {
    background: '#202840',
    gridEnabled: false,
    axisEnabled: false,
  });

  const ctx = createViewerContext();
  loadDocument(ctx, doc);
  assert.equal(ctx.document.scene.id, 'viewer-selftest-scene');
  assert.equal(ctx.document.points.length, 2);

  const mockDom = createMockDom();
  const canvasElement = mockDom.getElementById(ROOT_IDS.viewerCanvas);
  const renderer = new ViewerRenderer(canvasElement);
  renderer.init();
  assert.equal(renderer.initialized, true, 'renderer should initialize without DOM errors');
  renderer.render(doc);

  updateViewerHud(doc, mockDom);
  assert.equal(
    mockDom.getElementById(HUD_FIELDS.documentUuid)?.textContent,
    doc.document_meta.document_uuid,
    'HUD should display document UUID',
  );
  assert.equal(
    mockDom.getElementById(HUD_FIELDS.version)?.textContent,
    doc.document_meta.version,
    'HUD should display document version',
  );
  assert.equal(
    mockDom.getElementById(HUD_FIELDS.units)?.textContent,
    doc.document_meta.units,
    'HUD should display document units',
  );

  console.log(
    'viewer_selftest summary',
    JSON.stringify(
      {
        nodesInScene: viewScene.nodes.length,
        documentUuid: doc.document_meta.document_uuid,
        rendererInitialized: renderer.initialized,
      },
      null,
      2,
    ),
  );
}

runSelfTest();
