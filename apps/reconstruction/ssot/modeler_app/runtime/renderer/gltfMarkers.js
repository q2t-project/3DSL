import * as THREE from 'three';

function release(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene?.traverse?.(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose?.();
  }
  for (const geometry of geometries) geometry.dispose?.();
  for (const texture of textures) {
    texture.source?.data?.close?.();
    texture.dispose?.();
  }
}

const vector = (value, fallback) => fallback.map((v, i) => Number.isFinite(value?.[i]) ? value[i] : v);
const rotation = (object, value) => {
  const [yaw, pitch, roll] = vector(value, [0, 0, 0]);
  object.rotation.set(pitch, yaw, roll, 'YXZ');
};

/** Independent loaded scenes: no geometry/material ownership shared across documents. */
export function createGltfMarkers({ invalidate = () => {}, onError = () => {}, load } = {}) {
  let loaderPromise;
  const loadScene = load || (async url => {
    loaderPromise ||= import('three/addons/loaders/GLTFLoader.js')
      .then(({ GLTFLoader }) => new GLTFLoader())
      .catch(error => { loaderPromise = null; throw error; });
    const loader = await loaderPromise;
    return (await loader.loadAsync(url)).scene;
  });
  const slots = new Set();
  let generation = 0;
  function reset() {
    generation++;
    for (const slot of slots) { slot.removeFromParent(); release(slot); }
    slots.clear();
  }
  async function attach(parent, config, uuid, common = {}) {
    if (!config || typeof config.url !== 'string' || !config.url.trim()) return;
    const token = generation;
    const slot = new THREE.Group();
    rotation(slot, common.orientation);
    slot.scale.fromArray(vector(common.scale, [1, 1, 1]));
    parent.add(slot);
    slots.add(slot);
    let scene = null;
    try {
      scene = await loadScene(config.url.trim());
      if (generation !== token || !slots.has(slot)) { release(scene); return; }
      if (!scene?.isObject3D) throw new Error('GLB scene is missing');
      rotation(scene, config.rotation);
      scene.scale.fromArray(vector(config.scale, [1, 1, 1]));
      scene.position.fromArray(vector(config.offset, [0, 0, 0]));
      scene.traverse(object => {
        object.userData.uuid = uuid;
        object.userData.kind = 'point';
        for (const material of [].concat(object.material || [])) {
          if (Number.isFinite(common.opacity)) {
            material.opacity *= Math.max(0, Math.min(1, common.opacity));
            material.transparent ||= material.opacity < 1;
          }
          if (typeof common.wireframe === 'boolean') material.wireframe = common.wireframe;
        }
      });
      slot.add(scene);
      invalidate();
    } catch (error) {
      release(scene);
      slot.removeFromParent();
      slots.delete(slot);
      if (generation !== token) return;
      parent.userData.gltfError = String(error?.message || error);
      onError(uuid, error);
      invalidate();
    }
  }
  return { attach, reset, dispose: reset };
}
