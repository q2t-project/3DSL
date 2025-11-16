// code/common/selftest/validation.spec.js

import { test } from 'node:test';
import { strictEqual, throws } from 'node:assert/strict';
import { validateSceneStructure, validateNodeStructure } from '../utils/validation.js';

// ---------------------------------------------------------------------------
// 1. 正常系：最低限の Scene が通る
// ---------------------------------------------------------------------------
test('validateSceneStructure: valid scene passes', () => {
  const scene = {
    id: 'scene-1',  // ← これを追加
    nodes: [
      {
        id: 'n1',
        type: 'mesh',
        transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
        metadata: {}
      }
    ]
  };

  strictEqual(
    validateSceneStructure(scene),
    true
  );
});

// ---------------------------------------------------------------------------
// 2. node.id が string じゃない → エラー
// ---------------------------------------------------------------------------
test('validateNodeStructure: non-string id throws', () => {
  const badNode = {
    id: 123, // NG
    type: 'mesh',
    transform: { x:0,y:0,z:0, rx:0,ry:0,rz:0 },
    metadata: {}
  };

  throws(() => validateNodeStructure(badNode));
});

// ---------------------------------------------------------------------------
// 3. scene.nodes が Array じゃない → エラー
// ---------------------------------------------------------------------------
test('validateSceneStructure: nodes must be array', () => {
  const badScene = {
    nodes: 'not array',
  };

  throws(() => validateSceneStructure(badScene));
});

// ---------------------------------------------------------------------------
// 4. 必須フィールド欠落 → エラー
// ---------------------------------------------------------------------------
test('validateNodeStructure: missing type throws', () => {
  const badNode = {
    id: 'abc',
    // type 無い
    transform: { x:0,y:0,z:0, rx:0,ry:0,rz:0 },
    metadata: {}
  };

  throws(() => validateNodeStructure(badNode));
});
