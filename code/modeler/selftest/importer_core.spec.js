// code/modeler/selftest/importer_core.spec.js
// Basic selftests for the legacy JSON importer entry point.

import test from 'node:test';
import assert from 'node:assert/strict';

import { Model } from '../../common/types/index.js';
import { ValidationError } from '../../common/errors/index.js';
import { importModelFrom3DssSource } from '../io/importer.js';

const { ok, strictEqual, deepStrictEqual, rejects } = assert;

const MINIMAL_3DSS_DOCUMENT = {
  document_meta: {
    document_uuid: 'importer-selftest-doc',
    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0',
    author: 'importer-selftest',
    version: '1.0.0',
  },
  points: [
    {
      id: 'point-root',
      signification: { name: 'Root point' },
      appearance: {
        position: [0, 0, 0],
        marker: { common: { orientation: [0, 0, 0], scale: [1, 1, 1] } },
      },
    },
  ],
  lines: [],
  aux: [],
};

// ---------------------------------------------------------------------------
// Normal path: stringified JSON roundtrips into Model instance
// ---------------------------------------------------------------------------
test('importModelFrom3DssSource: parses valid JSON and returns a Model', async () => {
  const payload = JSON.stringify(MINIMAL_3DSS_DOCUMENT);
  const model = await importModelFrom3DssSource(payload);

  ok(model instanceof Model, 'importer should return a Model instance');
  strictEqual(model.version, MINIMAL_3DSS_DOCUMENT.document_meta.version);
  strictEqual(model.scene.id, 'scene-importer-selftest-doc');
  deepStrictEqual(model.scene.nodes[0].transform.position, [0, 0, 0]);
});

// ---------------------------------------------------------------------------
// Rejection: empty string or undefined payloads
// ---------------------------------------------------------------------------
test('importModelFrom3DssSource: rejects empty strings or missing payloads', async () => {
  await rejects(importModelFrom3DssSource('   '), /cannot be empty/i, 'empty string should throw');
  await rejects(importModelFrom3DssSource(undefined), ValidationError);
});

// ---------------------------------------------------------------------------
// Rejection: schema violations bubble up as ValidationError
// ---------------------------------------------------------------------------
test('importModelFrom3DssSource: validates required fields', async () => {
  const missingMeta = { points: [] };
  await rejects(importModelFrom3DssSource(missingMeta), ValidationError);
});
