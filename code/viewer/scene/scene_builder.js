import { generateId } from '../../common/utils/index.js';
import { convertScene } from '../convert/model_to_view.js';
import { validateSceneStructure } from '../utils/scene_validation.js';

export function createScene(modelScene = {}) {
  const source = typeof modelScene === 'object' && modelScene !== null ? modelScene : {};
  const normalizedScene = {
    ...source,
    id: source.id ?? generateId('scene'),
    nodes: Array.isArray(source.nodes) ? source.nodes : [],
    metadata: source.metadata ?? null,
    environment: source.environment ?? undefined,
  };

  validateSceneStructure(normalizedScene);
  return convertScene(normalizedScene);
}
