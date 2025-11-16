// code/modeler/selftest/importer_prep.spec.js

import { Buffer } from 'node:buffer';
import test from 'node:test';
import assert from 'node:assert/strict';

import { importFromPrep } from '../io/importer.js';

const { strictEqual, ok, deepStrictEqual, match } = assert;

const SAMPLE_PREP = {
  document_meta: {
    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS-prep.schema.json#v1.0.0',
    generator: 'selftest',
    source: 'unit-test-suite',
  },
  points: [
    { name: 'alpha' },
    { name: 'beta', position: [1, 2, 3] },
  ],
};

// ---------------------------------------------------------------------------
// 正常系
// ---------------------------------------------------------------------------
test('importFromPrep: parses and converts valid prep JSON payloads', () => {
  const jsonInput = JSON.stringify(SAMPLE_PREP);
  const result = importFromPrep(jsonInput);

  ok(result.ok, 'result should be ok for valid prep input');
  ok(result.document, 'document should be defined when ok=true');

  const document = result.document;
  strictEqual(document.points.length, SAMPLE_PREP.points.length, 'all points should be converted');
  strictEqual(document.points[0].label, 'alpha');
  deepStrictEqual(document.points[0].position, [0, 0, 0], 'points default to origin when no position is provided');
  strictEqual(document.points[1].label, 'beta');
  deepStrictEqual(document.points[1].position, [1, 2, 3], 'explicit positions are preserved');
  ok(document.points.every((point) => typeof point.id === 'string' && point.id.length > 0));

  ok(document.document_meta.document_uuid, 'document meta should include a uuid');
  strictEqual(document.document_meta.schema_uri, SAMPLE_PREP.document_meta.schema_uri);
});

// ---------------------------------------------------------------------------
// 異常系: 入力文字列
// ---------------------------------------------------------------------------
test('importFromPrep: rejects empty or malformed JSON strings', () => {
  const emptyResult = importFromPrep('   ');
  strictEqual(emptyResult.ok, false);
  match(emptyResult.errors?.[0] ?? '', /cannot be empty/);

  const malformedResult = importFromPrep('{"points":');
  strictEqual(malformedResult.ok, false);
  match(malformedResult.errors?.[0] ?? '', /failed to parse prep JSON/);
});

// ---------------------------------------------------------------------------
// 異常系: 型違い / スキーマ違反
// ---------------------------------------------------------------------------
test('importFromPrep: validates payload shape against PREP schema', () => {
  const typeResult = importFromPrep(123);
  strictEqual(typeResult.ok, false);
  match(typeResult.errors?.[0] ?? '', /must be an object/i);

  const schemaResult = importFromPrep({ document_meta: SAMPLE_PREP.document_meta });
  strictEqual(schemaResult.ok, false);
  ok(schemaResult.errors?.some((message) => /points/i.test(message)), 'error should mention points field');
});

// ---------------------------------------------------------------------------
// バイナリ入力と warning 生成
// ---------------------------------------------------------------------------
test('importFromPrep: accepts binary inputs and emits warnings for data issues', () => {
  const duplicateAndInvalidPoints = {
    document_meta: SAMPLE_PREP.document_meta,
    points: [
      { name: 'alpha', position: [0, 'x', 3], style: 'plain-text' },
      { name: 'alpha', position: [1, 2, 3] },
      { name: '' },
    ],
  };

  const bufferInput = Buffer.from(JSON.stringify(duplicateAndInvalidPoints), 'utf8');
  const result = importFromPrep(bufferInput);

  ok(result.ok, 'buffer input should be accepted');
  ok(Array.isArray(result.warnings) && result.warnings.length >= 2, 'warnings should be surfaced');
  strictEqual(result.document.points[0].label, 'alpha');
  deepStrictEqual(result.document.points[0].position, [0, 0, 0], 'invalid coordinates fall back to default');
  strictEqual(result.document.points[1].label, 'alpha-2', 'duplicate labels are uniquified');
  strictEqual(result.document.points[2].label, 'prep-point-3', 'missing names receive fallback labels');
  ok(result.warnings.some((warning) => /style/i.test(warning)), 'style warning should be present');
  ok(result.warnings.some((warning) => /duplicated label/i.test(warning)), 'duplicate label warning should be present');
});
