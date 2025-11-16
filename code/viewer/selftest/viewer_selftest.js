import assert from 'node:assert/strict';
import { convertScene } from '../convert/model_to_view.js';

function runSelfTest() {
  const viewScene = convertScene({
    id: 'viewer-selftest-scene',
    nodes: [
      {
        id: 'viewer-selftest-node',
        type: 'point',
        transform: { position: [0.5, 1.25, -2] },
        metadata: { tags: ['selftest'], label: 'SelfTest' },
      },
    ],
    environment: { background: '#202840', axisEnabled: false },
  });

  assert.equal(viewScene.id, 'viewer-selftest-scene');
  assert.equal(viewScene.nodes.length, 1);
  assert.deepStrictEqual(viewScene.nodes[0].pos, { x: 0.5, y: 1.25, z: -2 });
  assert.deepStrictEqual(viewScene.nodes[0].tags, ['selftest']);
  assert.equal(viewScene.environment.background, '#202840');
  assert.equal(viewScene.environment.axisEnabled, false);
  console.log('viewer_selftest passed');
}

runSelfTest();
