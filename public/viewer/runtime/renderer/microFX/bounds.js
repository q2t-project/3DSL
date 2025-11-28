// viewer/runtime/renderer/microFX/bounds.js

import * as THREE from "../../../../vendor/three/build/three.module.js";

let boundsGroup = null;

const baseWireColor = new THREE.Color("#66ccff");
const outlineWireColor = new THREE.Color("#44ddff");
const handleGeometry = new THREE.SphereGeometry(0.1, 16, 16); // 統一して倍精細

/* -------------------------------------------------------
 *  Handle Group
 * ----------------------------------------------------- */
function createHandlesGroup() {
  const handlesGroup = new THREE.Group();
  handlesGroup.name = "micro-bounds-handles";
  handlesGroup.renderOrder = 12;

  const material = new THREE.MeshBasicMaterial({ color: "#88ccff" });

  const corners = [
    [-0.5, -0.5, -0.5],
    [ 0.5, -0.5, -0.5],
    [-0.5,  0.5, -0.5],
    [ 0.5,  0.5, -0.5],
    [-0.5, -0.5,  0.5],
    [ 0.5, -0.5,  0.5],
    [-0.5,  0.5,  0.5],
    [ 0.5,  0.5,  0.5],
  ];

  for (const c of corners) {
    const mesh = new THREE.Mesh(handleGeometry, material.clone());
    mesh.position.set(c[0], c[1], c[2]);
    handlesGroup.add(mesh);
  }

  handlesGroup.visible = false;
  return handlesGroup;
}

/* -------------------------------------------------------
 *  Bounds Object (1 per viewer)
 * ----------------------------------------------------- */
export function ensureBounds(scene) {
  // 他 scene の残骸を排除
  if (boundsGroup && boundsGroup.parent !== scene) {
    boundsGroup.parent.remove(boundsGroup);
    boundsGroup = null;
  }

  if (!boundsGroup) {
    boundsGroup = new THREE.Group();
    boundsGroup.name = "micro-bounds";

    // 半透明 Box
    const boxGeom = new THREE.BoxGeometry(1, 1, 1); // scale で変形する
    const boxMat = new THREE.MeshBasicMaterial({
      color: "#44aaff",
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(boxGeom, boxMat);
    mesh.renderOrder = 10;
    boundsGroup.add(mesh);

    // 外枠 Wireframe
    const wireGeom = new THREE.BoxGeometry(1, 1, 1);
    const wireMat = new THREE.LineBasicMaterial({
      color: baseWireColor.clone(),
      transparent: true,
      opacity: 0.9
    });
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(wireGeom),
      wireMat
    );
    wire.renderOrder = 11;
    boundsGroup.add(wire);

    // Corner handles
    const handles = createHandlesGroup();
    boundsGroup.add(handles);
    boundsGroup.userData.handlesGroup = handles;
  }

  if (!boundsGroup.parent) {
    scene.add(boundsGroup);
  }

  return boundsGroup;
}

/* -------------------------------------------------------
 *  Utility
 * ----------------------------------------------------- */
function sanitizeVector3(arr) {
  if (!Array.isArray(arr)) return [0, 0, 0];
  return [
    Number(arr[0]) || 0,
    Number(arr[1]) || 0,
    Number(arr[2]) || 0
  ];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* -------------------------------------------------------
 *  Handles resize according to bounding box size
 * ----------------------------------------------------- */
function updateHandles(group, size) {
  const handlesGroup = group.userData?.handlesGroup;
  if (!handlesGroup) return;

  const magnitudes = size.map(v => Math.abs(v));
  const minSize = Math.max(Math.min(...magnitudes), 0.0);

  const baseScale = clamp(minSize, 0.2, 1.0);
  const handleScale = 0.05 * baseScale;

  handlesGroup.children.forEach((handle) => {
    handle.scale.setScalar(handleScale);
  });
}

/* -------------------------------------------------------
 *  Main update entry
 * ----------------------------------------------------- */
export function updateBounds(group, localBounds) {
  if (!group || !localBounds) return;

  const center = sanitizeVector3(localBounds.center);
  const rawSize = sanitizeVector3(localBounds.size);

  const size = rawSize.map(v => Math.abs(Number(v)));

  group.position.set(center[0], center[1], center[2]);
  group.scale.set(size[0], size[1], size[2]);

  // handles のスケールは “箱の最小寸法に比例”
  updateHandles(group, size);
}

/* -------------------------------------------------------
 *  Outline hover on/off
 * ----------------------------------------------------- */
export function setOutlineMode(enabled) {
  if (!boundsGroup) return;
  const wire = boundsGroup.children[1];
  if (!wire?.material) return;

  wire.material.color.copy(enabled ? outlineWireColor : baseWireColor);
  wire.material.needsUpdate = true;
}

/* -------------------------------------------------------
 *  Handles
 * ----------------------------------------------------- */
export function setHandlesVisible(visible) {
  if (!boundsGroup?.userData?.handlesGroup) return;
  boundsGroup.userData.handlesGroup.visible = !!visible;
}

/* -------------------------------------------------------
 *  Remove
 * ----------------------------------------------------- */
export function removeBounds(scene) {
  if (!boundsGroup) return;
  if (boundsGroup.parent === scene) {
    scene.remove(boundsGroup);
  }
  boundsGroup = null;
}
