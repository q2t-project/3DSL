// viewer/runtime/renderer/microFX/bounds.js
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";
import { clamp, clamp01, normalizeIntensity, sanitizeVec3 } from "./utils.js";

// このモジュールは microState.localBounds（world 座標系での局所 AABB）を
// そのまま受け取って可視化する専用。
// center / size は world 座標 / edge 長で、shrinkFactor / minEdge / maxEdge も
// すべて「同じ world 長さ単位のスカラー」として扱う。
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

  const material = new THREE.MeshBasicMaterial({
    color: "#88ccff",
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });

  const corners = [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [-0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
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
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(boxGeom, boxMat);
    mesh.renderOrder = 10;
    boundsGroup.add(mesh);

    // 外枠 Wireframe
    const wireGeom = new THREE.EdgesGeometry(boxGeom);
    const wireMat = new THREE.LineBasicMaterial({
      color: baseWireColor.clone(),
      transparent: true,
      opacity: 0.9,
      // 半透明ボックスと同じく、深度バッファは汚さない
      depthWrite: false,
      // depthTest はそのまま true（デフォルト）で OK
    });
    const wire = new THREE.LineSegments(wireGeom, wireMat);
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
 *  Utility（microState.localBounds.* 用の軽いサニタイズ）
 * ----------------------------------------------------- */
function sanitizeVector3(arr) {
  return sanitizeVec3(arr, [0, 0, 0]);
}

/* -------------------------------------------------------
 *  Handles resize according to bounding box size
 * ----------------------------------------------------- */
function updateHandles(group, size, intensity = 1) {
  const handlesGroup = group.userData?.handlesGroup;
  if (!handlesGroup) return;

  // size は unitless world 空間での edge 長
  const magnitudes = size.map((v) => Math.abs(v));
  const minSize = Math.max(Math.min(...magnitudes), 0.0);

  // AABB が小さくてもある程度は見えるように最低サイズを確保
  const baseScale = minSize > 0 ? minSize * 0.18 : 0.18;

  const s = normalizeIntensity(intensity, 1);

  const handleScale = baseScale * s;

  handlesGroup.children.forEach((handle) => {
    handle.scale.setScalar(handleScale);
    if (handle.material && "opacity" in handle.material) {
      handle.material.opacity = clamp01(s);
      handle.material.transparent = true;
    }
  });
}

/* -------------------------------------------------------
 *  Main update entry
 * ----------------------------------------------------- */
export function updateBounds(group, localBounds, intensity = 1) {
  if (!group || !localBounds) return;

  const s = normalizeIntensity(intensity, 1);

  if (s <= 0) {
    group.visible = false;
    return;
  }

  group.visible = true;

  // localBounds は microState.localBounds 前提：
  // - center: world 座標系での AABB 中心
  // - size:   world 座標系での AABB edge 長（raw）
  const center = sanitizeVector3(localBounds.center);
  const rawSize = sanitizeVector3(localBounds.size);

  // 元の AABB edge サイズ（unitless）
  const baseSize = rawSize.map((v) => Math.abs(Number(v)) || 0);

  // かなり大きなラインでも画面を支配しすぎないように、
  // ・全体を少し縮小（shrinkFactor: 無次元スカラー）
  // ・極端な最小/最大をクランプ（minEdge/maxEdge: unitless edge 長）
  const cfg = microFXConfig.bounds;

  const size = baseSize.map((v) => {
    const scaled = v * cfg.shrinkFactor;
    return clamp(scaled, cfg.minEdge, cfg.maxEdge);
  });

  group.position.set(center[0], center[1], center[2]);
  group.scale.set(size[0], size[1], size[2]);

  // handles のスケールは “描画中の box の最小寸法（unitless）× intensity”
  updateHandles(group, size, s);

  // Box / Wire の opacity も intensity に合わせてフェード
  const box = group.children[0];
  const wire = group.children[1];

  if (box && box.material && "opacity" in box.material) {
    const baseOpacity = 0.15;
    box.material.opacity = clamp01(baseOpacity * s);
    box.material.transparent = true;
    box.material.depthWrite = false;
  }

  if (wire && wire.material && "opacity" in wire.material) {
    const baseOpacity = 0.9;
    wire.material.opacity = clamp01(baseOpacity * s);
    wire.material.transparent = true;
    wire.material.depthWrite = false;
  }
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
  boundsGroup.parent?.remove(boundsGroup);
  boundsGroup = null;
}
