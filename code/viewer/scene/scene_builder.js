import { ViewerScene } from '../../common/types/index.js';
import { generateId } from '../../common/utils/index.js';
import { validateSceneStructure } from '../utils/scene_validation.js';

export function createScene({ nodes = [], metadata = {}, environment = {}, id } = {}) {
  const scene = new ViewerScene({
    id: id ?? generateId('scene'),
    nodes,
    metadata,
    environment,
  });
  validateSceneStructure(scene);
  return scene;
}
