// code/modeler/selftest/importer_core.spec.js
// Basic selftests for the legacy JSON importer entry point.

import test from 'node:test';
import assert from 'node:assert/strict';

import { Model } from '../../common/types/index.js';
import { ValidationError } from '../../common/errors/index.js';
import { importModelFromJSON } from '../io/importer.js';

const { ok, strictEqual, deepStrictEqual, throws } = assert;

const MINIMAL_MODEL = {
  version: '1.0.0',
  scene: {
    id: 'scene-1',
    nodes: [],
    metadata: {},
  },
  metadata: { name: 'selftest' },
};

// ---------------------------------------------------------------------------
// Normal path: stringified JSON roundtrips into Model instance
// ---------------------------------------------------------------------------
test('importModelFromJSON: parses valid JSON and returns a Model', () => {
  const payload = JSON.stringify(MINIMAL_MODEL);
  const model = importModelFromJSON(payload);

  ok(model instanceof Model, 'importer should return a Model instance');
  strictEqual(model.version, MINIMAL_MODEL.version);
  strictEqual(model.scene.id, MINIMAL_MODEL.scene.id);
  deepStrictEqual(model.scene.nodes, []);
});

// ---------------------------------------------------------------------------
// Rejection: empty string or undefined payloads
// ---------------------------------------------------------------------------
test('importModelFromJSON: rejects empty strings or missing payloads', () => {
  throws(() => importModelFromJSON('   '), /cannot be empty/i, 'empty string should throw');
  throws(() => importModelFromJSON(undefined), ValidationError);
});

// ---------------------------------------------------------------------------
// Rejection: schema violations bubble up as ValidationError
// ---------------------------------------------------------------------------
test('importModelFromJSON: validates required fields', () => {
  const missingScene = { version: '1.0.0' };
  throws(() => importModelFromJSON(missingScene), ValidationError);
});
