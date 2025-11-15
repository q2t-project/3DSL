import { SceneObject, Transform } from '../../common/types/index.js';
import { generateId } from '../../common/utils/index.js';

export function createSceneObject({ nodeRef, transform = new Transform(), metadata, id } = {}) {
  return new SceneObject({
    id: id ?? generateId('scene-object'),
    nodeRef,
    transform,
    metadata,
  });
}
