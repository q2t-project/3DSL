// code/common/selftest/threeDss_samples.spec.js
// validate3Dss を data/sample/3dss 配下の実サンプルでセルフテストする。

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validate3Dss } from '../validator/threeDssValidator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplesRoot = path.resolve(__dirname, '../../../data/sample/3dss');

function readSamples(subdir) {
  const dir = path.join(samplesRoot, subdir);
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const payload = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf-8'));
      return { name, payload };
    });
}

const validSamples = readSamples('valid');
const invalidSamples = readSamples('invalid');

function findSample(samples, name) {
  const match = samples.find((sample) => sample.name === name);
  if (!match) {
    throw new Error(`sample ${name} not found in ${samplesRoot}`);
  }
  return match;
}

test('3DSS valid samples pass validate3Dss', () => {
  for (const { name, payload } of validSamples) {
    const result = validate3Dss(payload);
    assert.strictEqual(result.ok, true, `${name} should be valid`);
    assert.strictEqual(result.errors, null, `${name} should not contain errors`);
  }
});

test('3DSS invalid samples fail validate3Dss', () => {
  for (const { name, payload } of invalidSamples) {
    const result = validate3Dss(payload);
    assert.strictEqual(result.ok, false, `${name} should be rejected`);
    assert.ok(Array.isArray(result.errors) && result.errors.length >= 1);
  }
});

test('3DSS invalid samples expose representative error metadata', () => {
  const missingMeta = validate3Dss(
    findSample(invalidSamples, 'sample02_invalid_missing_meta.3dss.json').payload
  );
  assert.strictEqual(missingMeta.errors?.[0]?.keyword, 'required');
  assert.strictEqual(missingMeta.errors?.[0]?.params?.missingProperty, 'document_meta');
  assert.strictEqual(missingMeta.errors?.[0]?.instancePath, '/document_meta');

  const badUnits = validate3Dss(
    findSample(invalidSamples, 'sample04_invalid_bad_enum.3dss.json').payload
  );
  assert.strictEqual(badUnits.errors?.[0]?.keyword, 'enum');
  assert.strictEqual(badUnits.errors?.[0]?.instancePath, '/document_meta/units');

  const missingGeometry = validate3Dss(
    findSample(invalidSamples, 'sample06_invalid_selfref.3dss.json').payload
  );
  assert.strictEqual(missingGeometry.errors?.[0]?.keyword, 'required');
  assert.strictEqual(missingGeometry.errors?.[0]?.instancePath, '/lines/0/appearance/geometry');
  assert.strictEqual(missingGeometry.errors?.[0]?.params?.missingProperty, 'geometry');

  const missingPointPosition = validate3Dss(
    findSample(invalidSamples, 'sample08_invalid_geometry_missing.3dss.json').payload
  );
  assert.strictEqual(missingPointPosition.errors?.[0]?.keyword, 'required');
  assert.strictEqual(
    missingPointPosition.errors?.[0]?.instancePath,
    '/points/0/appearance/position'
  );
  assert.strictEqual(missingPointPosition.errors?.[0]?.params?.missingProperty, 'position');

  const badUuid = validate3Dss(
    findSample(invalidSamples, 'sample10_invalid_bad_uuid.3dss.json').payload
  );
  assert.strictEqual(badUuid.errors?.[0]?.keyword, 'format');
  assert.strictEqual(badUuid.errors?.[0]?.instancePath, '/document_meta/document_uuid');
});
