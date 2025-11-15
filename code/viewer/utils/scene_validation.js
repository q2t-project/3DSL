export function validateSceneStructure(scene) {
  if (!scene) {
    throw new Error('Scene is required');
  }
  return true;
}
