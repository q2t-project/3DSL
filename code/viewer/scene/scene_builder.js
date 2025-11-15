import { generateId } from '../../common/utils/index.js';
import { convertModelSceneToViewScene } from '../utils/model_to_view.js';
import { validateSceneStructure } from '../utils/scene_validation.js';

export function createScene(modelScene = {}) {
  const source = typeof modelScene === 'object' && modelScene !== null ? modelScene : {};
  const normalizedScene = {
    ...source,
    id: source.id ?? generateId('scene'),
    nodes: source.nodes ?? [],
    metadata: source.metadata ?? null,
    environment: source.environment ?? null,
  };

  // Builder only works with view-ready data to keep rendering code unaware of
  // authoring-layer details.
  const viewScene = convertModelSceneToViewScene(normalizedScene);
  validateSceneStructure(viewScene);
  return viewScene;
}
