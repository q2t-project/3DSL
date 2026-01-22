// viewer/runtime/renderer/loaders/gltf.js

import * as THREE from "/vendor/three/build/three.module.js";

// url -> Promise<THREE.Object3D> (template scene; NEVER attached to world)
const _templateCache = new Map();

let _GLTFLoaderCtorPromise = null;

async function getGLTFLoaderCtor() {
  if (_GLTFLoaderCtorPromise) return _GLTFLoaderCtorPromise;
  // Use importmap alias from /viewer/*.html:
  //  - "three" -> /vendor/three/build/three.module.js
  //  - "three/addons/" -> /vendor/three/examples/jsm/
  _GLTFLoaderCtorPromise = import("three/addons/loaders/GLTFLoader.js")
    .then((m) => {
      if (!m || typeof m.GLTFLoader !== "function") {
        throw new Error("GLTFLoader module loaded but GLTFLoader export is missing");
      }
      return m.GLTFLoader;
    })
    .catch((e) => {
      // allow retry on next call
      _GLTFLoaderCtorPromise = null;
      throw e;
    });
  return _GLTFLoaderCtorPromise;
}

function loadWithLoader(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(String(err)))
    );
  });
}

/**
 * Load and cache a glTF template scene. Returned Object3D is a template and MUST NOT be
 * added to the live scene graph (clone it for instances).
 */
export function loadGltfTemplate(url) {
  const u = (typeof url === "string") ? url.trim() : "";
  if (!u) return Promise.reject(new Error("marker.gltf.url is empty"));

  const cached = _templateCache.get(u);
  if (cached) return cached;

  const p = (async () => {
    const GLTFLoader = await getGLTFLoaderCtor();
    const loader = new GLTFLoader();
    const gltf = await loadWithLoader(loader, u);
    const root = gltf?.scene || gltf?.scenes?.[0] || null;
    if (!root) throw new Error("glTF loaded but scene root is missing");
    // keep template stable
    try { root.updateMatrixWorld(true); } catch (_e) {}
    return root;
  })();

  _templateCache.set(u, p);
  return p;
}

/**
 * Deep-ish clone for static glTF markers.
 * - clones Object3D tree
 * - clones geometries & materials (so per-instance dispose/opacity changes are safe)
 * NOTE: SkinnedMesh rigging is not fully supported here (use SkeletonUtils if needed).
 */
export function cloneGltfScene(templateRoot) {
  const src = templateRoot;
  if (!src) return null;

  const cloned = src.clone(true);

  cloned.traverse((obj) => {
    if (obj && obj.isMesh) {
      // geometry
      if (obj.geometry && typeof obj.geometry.clone === "function") {
        try { obj.geometry = obj.geometry.clone(); } catch (_e) {}
      }

      // material
      const m = obj.material;
      if (Array.isArray(m)) {
        obj.material = m.map((mm) => {
          try { return (mm && typeof mm.clone === "function") ? mm.clone() : mm; } catch (_e) { return mm; }
        });
      } else if (m && typeof m.clone === "function") {
        try { obj.material = m.clone(); } catch (_e) {}
      }

      // defensive: ensure material supports transparency changes later
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat) continue;
        // keep original side if set; otherwise default to DoubleSide for markers
        if (mat.side == null) mat.side = THREE.DoubleSide;
      }
    }
  });

  return cloned;
}

export function applyMaterialOverrides(root, { color, opacity, wireframe } = {}) {
  const op = Number(opacity);
  const hasOpacity = Number.isFinite(op) && op >= 0 && op <= 1;

  root?.traverse?.((obj) => {
    if (!obj || !obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;

      if (wireframe != null) {
        try { mat.wireframe = !!wireframe; } catch (_e) {}
      }

      if (hasOpacity) {
        try {
          mat.transparent = op < 1;
          mat.opacity = op;
          // when transparent, avoid z-fighting / depth artifacts for small markers
          if (op < 1) {
            mat.depthWrite = false;
          }
        } catch (_e) {}
      }

      if (color != null && mat.color && typeof mat.color.setHex === "function") {
        // If the material has a texture map, avoid forcing color (it nukes textures).
        const hasMap = !!(mat.map || mat.emissiveMap || mat.metalnessMap || mat.roughnessMap);
        if (!hasMap) {
          try { mat.color.setHex(color); } catch (_e) {}
        }
      }
    }
  });
}
