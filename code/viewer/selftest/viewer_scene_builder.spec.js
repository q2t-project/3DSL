// code/viewer/selftest/viewer_scene_builder.spec.js
// viewer の scene_builder エントリの簡易 selftest

import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene } from '../scene/scene_builder.js';

const { ok, strictEqual } = assert;

// ---------------------------------------------------------------------------
// 1. すでにそこそこまともな scene を渡したときに ViewScene が返る
// ---------------------------------------------------------------------------
test('createScene: passes through a normalized scene and returns a view scene', () => {
  const modelScene = {
    id: 'scene-1',
    nodes: [
      {
        id: 'n1',
        type: 'mesh',
        transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
        metadata: {},
      },
    ],
    metadata: { name: 'test scene' },
    environment: {
      background: '#000000',
      gridEnabled: true,
      axisEnabled: true,
    },
  };

  const viewScene = createScene(modelScene);

  // 何かしら結果が返ってくること
  ok(viewScene, 'createScene should return a value');

  // convertScene の中身には踏み込まず、少なくとも nodes の数は保たれていることだけ見る
  ok(Array.isArray(viewScene.nodes), 'viewScene.nodes should be an array');
  strictEqual(viewScene.nodes.length, 1);
});

// ---------------------------------------------------------------------------
// 2. id / nodes が無いゆるい scene でもデフォルト補完される
// ---------------------------------------------------------------------------
test('createScene: fills default id and normalizes nodes to empty array', () => {
  const looseScene = {
    // id なし
    nodes: null, // 配列じゃない → []
    // metadata/environment も無しで OK なはず
  };

  const viewScene = createScene(looseScene);

  ok(typeof viewScene.id === 'string' && viewScene.id.length > 0, 'id should be auto-generated');
  ok(Array.isArray(viewScene.nodes), 'nodes should be an array after normalization');
  strictEqual(viewScene.nodes.length, 0);
});

// ---------------------------------------------------------------------------
// 3. null や変な値を渡しても「空シーン」として扱われる
// ---------------------------------------------------------------------------
test('createScene: tolerates non-object input and returns an empty view scene', () => {
  const junkInputs = [null, undefined, 0, '', 42, 'not-an-object'];

  for (const input of junkInputs) {
    const viewScene = createScene(input);

    ok(viewScene, 'createScene should not throw for junk input');
    ok(typeof viewScene.id === 'string' && viewScene.id.length > 0, 'id should be generated');
    ok(Array.isArray(viewScene.nodes), 'nodes should always be an array');
  }
});
