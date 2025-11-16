// code/common/selftest/schema_validator.spec.js
// schema_validator の薄い自己診断

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateWithSchema,
  listSchemas,
} from '../schema/schema_validator.js';

const { strictEqual, deepStrictEqual } = assert;

// レジストリに基本スキーマが載っているか
test('schema_validator: listSchemas exposes core schemas', () => {
  const names = listSchemas().sort();

  // 少なくともこの 4 つくらいはある想定
  const expected = ['metadata', 'node', 'scene', 'transform'];

  for (const name of expected) {
    strictEqual(
      names.includes(name),
      true,
      `schema "${name}" should be registered`
    );
  }
});

// 正常系: scene スキーマで妥当な Scene が通る
test('schema_validator: validateWithSchema("scene") passes on valid payload', () => {
  const payload = {
    id: 'scene-1',
    nodes: [
      {
        id: 'n1',
        type: 'mesh',
        transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
        metadata: { name: 'node-1', tags: ['tag1'], extras: {} },
      },
    ],
    metadata: {
      name: 'scene-name',
      tags: ['scene'],
      extras: {},
    },
  };

  const { valid, errors } = validateWithSchema('scene', payload);

  strictEqual(valid, true);
  deepStrictEqual(errors ?? [], []);
});

// 異常系: 必須フィールド欠落でエラーが返る
test('schema_validator: validateWithSchema("scene") fails on missing id', () => {
  const payload = {
    // id なし
    nodes: [],
  };

  const { valid, errors } = validateWithSchema('scene', payload);

  strictEqual(valid, false);
  strictEqual(Array.isArray(errors), true);
});
