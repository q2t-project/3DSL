import test from 'node:test';
import assert from 'node:assert/strict';

import { ValidationError } from '../../common/errors/index.js';
import { importModelFromJSON } from '../io/importer.js';
import { exportToThreeDss } from '../exporter/threeDssExporter.js';

const { deepStrictEqual, strictEqual, throws } = assert;

const MINIMAL_SCENE = {
  id: 'scene-root',
  nodes: [
    {
      id: 'node-1',
      type: 'point',
      transform: {
        position: [1, 2, 3],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      metadata: { name: 'origin', tags: ['core'] },
      children: [
        {
          id: 'node-1-1',
          type: 'point',
        },
      ],
    },
  ],
  metadata: { name: 'scene', tags: ['root'] },
};

test('exportToThreeDss: normalizes model-like documents and validates schema', () => {
  const doc = {
    version: '2.0.0',
    scene: MINIMAL_SCENE,
    metadata: { name: 'example' },
  };

  const exported = exportToThreeDss(doc);

  deepStrictEqual(exported.version, '2.0.0');
  deepStrictEqual(exported.scene.nodes[0].transform.position, [1, 2, 3]);
  deepStrictEqual(exported.scene.nodes[0].metadata.tags, ['core']);
  deepStrictEqual(exported.scene.nodes[0].children[0], {
    id: 'node-1-1',
    type: 'point',
  });
  deepStrictEqual(exported.metadata.tags, []);
});

test('exportToThreeDss: derives metadata from document_meta when metadata is missing', () => {
  const doc = {
    version: '1.5.0',
    scene: { id: 'scene', nodes: [] },
    document_meta: {
      author: 'exporter-selftest',
      tags: ['alpha', 123],
    },
  };

  const exported = exportToThreeDss(doc);
  deepStrictEqual(exported.metadata, { name: 'exporter-selftest', tags: ['alpha'] });
});

test('exportToThreeDss: rejects invalid inputs', () => {
  throws(() => exportToThreeDss(null), ValidationError);
  throws(() => exportToThreeDss({ scene: { id: 'scene', nodes: [] } }), ValidationError);
  throws(
    () =>
      exportToThreeDss({
        version: '1.0.0',
        scene: { id: '', nodes: [] },
      }),
    ValidationError,
  );
});

test('exportToThreeDss: round-trips importer_core payloads', () => {
  const source = {
    version: '3.1.4',
    scene: {
      id: 'round-trip',
      nodes: [
        {
          id: 'node-a',
          type: 'mesh',
          metadata: { name: 'primary' },
        },
      ],
    },
    metadata: { name: 'rt', tags: ['modeler'] },
  };

  const model = importModelFromJSON(JSON.stringify(source));
  const exported = exportToThreeDss(model.toJSON());

  strictEqual(exported.version, source.version);
  strictEqual(exported.scene.id, source.scene.id);
  strictEqual(exported.scene.nodes.length, source.scene.nodes.length);
  strictEqual(exported.scene.nodes[0].id, source.scene.nodes[0].id);
  strictEqual(exported.scene.nodes[0].type, source.scene.nodes[0].type);
  strictEqual(exported.scene.nodes[0].metadata.name, source.scene.nodes[0].metadata.name);
  deepStrictEqual(exported.metadata, source.metadata);
});
