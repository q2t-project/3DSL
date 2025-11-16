// code/common/selftest/types.spec.js
import test from 'node:test';
import assert from 'node:assert/strict';

// ※ CoreNode / SceneNode / ViewerScene は一切 import しない
import { Transform, Metadata } from '../types/core.js';

test('Transform has sane defaults', () => {
  const t = new Transform();

  // デフォルト値の確認（core.js の実装に合わせて変えてもOK）
  assert.deepEqual(t.position, [0, 0, 0]);
  assert.deepEqual(t.rotation, [0, 0, 0]);
  assert.deepEqual(t.scale, [1, 1, 1]);
});

test('Metadata keeps name/tags and separates extras', () => {
  const source = {
    name: 'doc-name',
    tags: ['a', 'b'],
    foo: 1,
    bar: 2,
  };

  const m = new Metadata(source);

  // ここも core.js の実装に合わせて調整してOK
  assert.equal(m.name, 'doc-name');
  assert.deepEqual(m.tags, ['a', 'b']);

  // name/tags 以外が extras に入る想定
  assert.deepEqual(m.extras, { foo: 1, bar: 2 });
});

test('Metadata.toJSON roundtrip', () => {
  const m = new Metadata({
    name: 'roundtrip',
    tags: ['x'],
    extra1: 10,
  });

  const json = m.toJSON();

  // 実装によって構造違うなら、ここを合わせて修正してOK
  assert.equal(json.name, 'roundtrip');
  assert.deepEqual(json.tags, ['x']);
});
