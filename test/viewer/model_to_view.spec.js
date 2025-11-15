import assert from 'node:assert/strict';
import { Metadata, Node, Scene, Transform } from '../../code/common/types/index.js';
import { convertModelNodeToViewNode, convertModelSceneToViewScene } from '../../code/viewer/utils/model_to_view.js';

// These tests can be executed with `node test/viewer/model_to_view.spec.js` once
// the runtime is wired into the CI runner. npm scripts are unavailable today, so
// we still keep them here for future automation.

function assertViewerDefaults() {
  const node = new Node({
    id: 'node-defaults',
    type: 'mesh',
    transform: new Transform({ position: [1, 2, 3] }),
    metadata: new Metadata({ name: 'Defaults', tags: ['root'] }),
  });

  const viewNode = convertModelNodeToViewNode(node);
  assert.equal(viewNode.id, node.id);
  assert.equal(viewNode.visible, true);
  assert.deepStrictEqual(viewNode.tags, []);
  assert.deepStrictEqual(viewNode.transform, node.transform.toJSON());
  assert.deepStrictEqual(viewNode.metadata, node.metadata.toJSON());
}

function assertChildConversion() {
  const child = new Node({ id: 'child-node', type: 'mesh' });
  const parent = new Node({ id: 'parent-node', type: 'group', children: [child] });

  const viewNode = convertModelNodeToViewNode(parent);
  assert.equal(viewNode.children.length, 1);
  assert.equal(viewNode.children[0].id, child.id);
  assert.equal(viewNode.children[0].visible, true);
  assert.strictEqual(viewNode.children[0].internalOnly, undefined);
}

function assertSceneConversion() {
  const leaf = new Node({ id: 'leaf-node', type: 'mesh' });
  leaf.internalOnly = true;

  const scene = new Scene({
    id: 'scene-source',
    nodes: [leaf],
    metadata: { name: 'Scene Source' },
  });
  const payload = { ...scene, environment: { sky: 'blue' }, stats: { triangles: 12 } };

  const viewScene = convertModelSceneToViewScene(payload);
  assert.equal(viewScene.id, scene.id);
  assert.deepStrictEqual(viewScene.environment, { sky: 'blue' });
  assert.strictEqual(viewScene.stats, undefined);
  assert.equal(viewScene.nodes[0].id, leaf.id);
  assert.strictEqual(viewScene.nodes[0].internalOnly, undefined);
}

assertViewerDefaults();
assertChildConversion();
assertSceneConversion();

console.log('model_to_view.spec.js completed');
