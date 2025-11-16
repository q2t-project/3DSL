// code/viewer/scene/scene_builder.js
import { generateId } from '../../common/utils/index.js';
import { convertScene } from '../convert/model_to_view.js';
import { validateSceneStructure } from '../utils/scene_validation.js';

export function createScene(modelScene = {}) {
  const source =
    typeof modelScene === 'object' && modelScene !== null ? modelScene : {};

  const normalizedScene = {
    ...source,
    id: source.id ?? generateId('scene'),
    nodes: Array.isArray(source.nodes) ? source.nodes : [],
    // metadata: schema が object 要求なので、非 object や undefined/null は安全に {} に寄せる
    metadata:
      source.metadata &&
      typeof source.metadata === 'object' &&
      !Array.isArray(source.metadata)
        ? source.metadata
        : {},
    environment: source.environment ?? undefined,
  };

  validateSceneStructure(normalizedScene);
  return convertScene(normalizedScene);
}
