import { ViewerScene } from '../../common/types/index.js';
import { generateId } from '../../common/utils/index.js';
import { validateSceneStructure } from '../utils/scene_validation.js';

export function createScene({ objects = [], environment = {}, id } = {}) {
  const scene = new ViewerScene({
    id: id ?? generateId('viewer-scene'),
    objects,
    environment,
  });
  validateSceneStructure(scene);
  return scene;
}
