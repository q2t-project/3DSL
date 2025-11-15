import assert from 'node:assert/strict';
import { ValidationError } from '../../code/common/errors/index.js';
import { validateNodeStructure, validateSceneStructure, validateTransformStructure } from '../../code/common/utils/index.js';

const sampleNode = {
  id: 'node-root',
  type: 'mesh',
  transform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  metadata: {
    name: 'Root Node',
    tags: ['entry'],
  },
};

function assertValidScene() {
  const scene = {
    id: 'scene-001',
    nodes: [sampleNode],
    metadata: { name: 'Sample Scene' },
  };

  assert.doesNotThrow(() => validateSceneStructure(scene));
}

function assertInvalidScene() {
  const invalidScene = {
    id: '   ',
    nodes: [
      {
        ...sampleNode,
        id: '',
      },
    ],
  };

  assert.throws(() => validateSceneStructure(invalidScene), ValidationError);
}

function assertInvalidNode() {
  const invalidNode = { ...sampleNode, type: '' };
  assert.throws(() => validateNodeStructure(invalidNode), ValidationError);
}

function assertInvalidTransform() {
  const invalidTransform = { position: [0, 0, 'x'] };
  assert.throws(() => validateTransformStructure(invalidTransform), ValidationError);
}

assertValidScene();
assertInvalidScene();
assertInvalidNode();
assertInvalidTransform();

console.log('schema.spec.js completed');
