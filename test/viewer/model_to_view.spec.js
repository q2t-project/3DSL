import assert from 'node:assert/strict';
import { Metadata, Node, Scene, Transform } from '../../code/common/types/index.js';
import { convertNode, convertScene } from '../../code/viewer/convert/model_to_view.js';

// These tests can be executed with `node test/viewer/model_to_view.spec.js` once
// the runtime is wired into the CI runner. npm scripts are unavailable today, so
// we still keep them here for future automation.

function assertViewerDefaults() {
  const node = new Node({
    id: 'node-defaults',
    type: 'mesh',
    transform: new Transform({ position: [1, 2, 3] }),
    metadata: new Metadata({ name: 'Defaults', tags: ['root'], color: '#ff0000' }),
  });

  const viewNode = convertNode(node);
  assert.equal(viewNode.id, node.id);
  assert.equal(viewNode.visible, true);
  assert.deepStrictEqual(viewNode.tags, ['root']);
  assert.deepStrictEqual(viewNode.pos, { x: 1, y: 2, z: 3 });
  assert.equal(viewNode.extras.name, 'Defaults');
  assert.equal(viewNode.extras.color, '#ff0000');
  assert.equal(viewNode.extras.type, 'mesh');
}

function assertSceneFlattening() {
  const child = new Node({ id: 'child-node', type: 'mesh', transform: new Transform({ position: [0, 0, 1] }) });
  const parent = new Node({ id: 'parent-node', type: 'group', children: [child] });

  const viewScene = convertScene({ id: 'scene', nodes: [parent] });
  assert.equal(viewScene.nodes.length, 2);
  const ids = viewScene.nodes.map((node) => node.id);
  assert(ids.includes('parent-node'));
  assert(ids.includes('child-node'));
}

function assertSceneEnvironmentDefaults() {
  const scene = new Scene({
    id: 'scene-source',
    nodes: [new Node({ id: 'leaf-node', type: 'mesh' })],
    metadata: { name: 'Scene Source' },
  });
  const payload = { ...scene, environment: { background: '#445566', gridEnabled: false } };

  const viewScene = convertScene(payload);
  assert.equal(viewScene.id, scene.id);
  assert.deepStrictEqual(viewScene.environment, {
    background: '#445566',
    gridEnabled: false,
    axisEnabled: true,
  });
}

assertViewerDefaults();
assertSceneFlattening();
assertSceneEnvironmentDefaults();

console.log('model_to_view.spec.js completed');
