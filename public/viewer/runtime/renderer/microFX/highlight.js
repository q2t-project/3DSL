// viewer/runtime/renderer/microFX/highlight.js
//
// micro-highlight:
//   - microState の focusUuid / relatedUuids を元に、
//     元オブジェクトをなぞるオーバーレイを描く。
//   - 長さ単位には一切踏み込まず、position/rotation/scale をそのままコピー。

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

let highlightGroup = null;

function clamp01(v) {
  return Math.min(Math.max(v, 0), 1);
}

function ensureGroup(scene) {
  // 他 scene の残骸があれば破棄（parent が null の場合もケア）
  if (
    highlightGroup &&
    highlightGroup.parent &&
    highlightGroup.parent !== scene
  ) {
    highlightGroup.parent.remove(highlightGroup);
    highlightGroup = null;
  }

  if (!highlightGroup) {
    highlightGroup = new THREE.Group();
    highlightGroup.name = "micro-highlight";
    highlightGroup.renderOrder = 998;
    scene.add(highlightGroup);
  }
  return highlightGroup;
}

// focus line 用の「多層チューブグロー」を生成
// 返り値: Mesh の配列（中核 + ハロー）
function createLineGlowMeshes(src, lineGlowCfg) {
  const geom = src.geometry;
  const posAttr = geom && geom.attributes && geom.attributes.position;
  if (!posAttr) return null;

  const points = [];
  for (let i = 0; i < posAttr.count; i++) {
    points.push(
      new THREE.Vector3(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i)
      )
    );
  }
  if (points.length < 2) return null;

  let curve;
  if (points.length === 2) {
    curve = new THREE.LineCurve3(points[0], points[1]);
  } else {
    curve = new THREE.CatmullRomCurve3(points);
  }

  const radius =
    typeof lineGlowCfg.radius === "number" ? lineGlowCfg.radius : 0.06;
  const tubularPerSeg =
    typeof lineGlowCfg.tubularSegmentsPerSegment === "number"
      ? lineGlowCfg.tubularSegmentsPerSegment
      : 8;
  const tubularSegments = Math.max(
    (points.length - 1) * tubularPerSeg,
    8
  );

  const radialSegments =
    typeof lineGlowCfg.radialSegments === "number"
      ? lineGlowCfg.radialSegments
      : 8;

  // ベース不透明度
  const baseOpacity =
    typeof lineGlowCfg.opacity === "number" ? lineGlowCfg.opacity : 0.7;

 // 中心コア + 外側ハロー層
  const layers = [
    { r: 1.0, opacityMul: 1.0 },  // コア
    { r: 4.8, opacityMul: 0.35 }, // 内側ハロー
    { r: 9.6, opacityMul: 0.12 }, // 外側ハロー
  ];

  const meshes = [];

  for (const layer of layers) {
    const tubeGeom = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius * layer.r,
      radialSegments,
      false
    );

    const material = new THREE.MeshBasicMaterial({
      color: lineGlowCfg.color || "#00ffff",
      transparent: true,
      opacity: baseOpacity * layer.opacityMul,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });

    const mesh = new THREE.Mesh(tubeGeom, material);
    mesh.position.copy(src.position);
    mesh.quaternion.copy(src.quaternion);
    mesh.scale.copy(src.scale);

    // この geometry は highlight 側で作ったものなので、clear 時に dispose する目印
    mesh.userData._microFX_ownGeometry = true;

    meshes.push(mesh);
  }

  return meshes;
}

export function applyHighlight(
  scene,
  microState,
  getObjectByUuid,
  visibleSet
) {
  clearHighlight(scene);
  if (!microState) return;

  const { focusUuid, relatedUuids } = microState;

  const ids = [];
  if (focusUuid) ids.push(focusUuid);
  if (Array.isArray(relatedUuids)) ids.push(...relatedUuids);
  const uniqIds = [...new Set(ids)].filter(Boolean);
  if (uniqIds.length === 0) return;

  const group = ensureGroup(scene);

  const focusSet = new Set(focusUuid ? [focusUuid] : []);
  const relatedSet = new Set(Array.isArray(relatedUuids) ? relatedUuids : []);

  const hlCfg = microFXConfig.highlight || {};
  const focusCfg = hlCfg.focus || {};
  const relatedCfg = hlCfg.related || {};
  const othersCfg = hlCfg.others || {};
  const lineGlowCfg = hlCfg.lineGlow || {};
  const lineGlowEnabled = lineGlowCfg.enabled !== false;

  for (const uuid of uniqIds) {
    // 7.11.5: visibleSet に含まれない要素は処理しない
    if (visibleSet && !visibleSet.has(uuid)) continue;

    // getObjectByUuid は indexMaps を閉じ込めた関数を期待している
    const src = getObjectByUuid(uuid);
    if (!src) continue;

    const isFocus = focusSet.has(uuid);
    const isRelated = relatedSet.has(uuid);

    // 役割ごとの色を決定（なければフォールバック）
    const color =
      (isFocus && focusCfg.color) ||
      (isRelated && relatedCfg.color) ||
      "#00ffff";

    const commonParams = {
      color,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // 加算合成で「光って見える」ように
      blending: THREE.AdditiveBlending,
    };

    let material;
    if (src.isLine) {
      material = new THREE.LineBasicMaterial(commonParams);
    } else if (src.isMesh) {
      material = new THREE.MeshBasicMaterial(commonParams);
    } else {
      continue;
    }

    // 元オブジェクトの opacity をベースに、focus / related でブースト
    const srcOpacity =
      src.material && typeof src.material.opacity === "number"
        ? src.material.opacity
        : 1.0;

    let opacity = srcOpacity;
    if (isFocus) {
      const boost =
        typeof focusCfg.opacityBoost === "number"
          ? focusCfg.opacityBoost
          : 0.25;
      opacity = Math.min(1, srcOpacity + boost);
    } else if (isRelated) {
      const boost =
        typeof relatedCfg.opacityBoost === "number"
          ? relatedCfg.opacityBoost
          : 0.1;
      opacity = Math.min(1, srcOpacity + boost);
    }

    // 線に関しては「最低このくらいは光らせる」
    if (src.isLine) {
      const minLineOpacity =
        (isFocus &&
          typeof focusCfg.minLineOpacity === "number" &&
          focusCfg.minLineOpacity) ||
        (isRelated &&
          typeof relatedCfg.minLineOpacity === "number" &&
          relatedCfg.minLineOpacity) ||
        null;

      if (typeof minLineOpacity === "number") {
        opacity = Math.max(opacity, minLineOpacity);
      }
    }

    material.opacity = clamp01(opacity);

    let clone;
    if (src.isLine) {
      // 対応ブラウザではちょっと太く見えるかも（効かなくても害はない）
      material.linewidth = isFocus ? 4 : 2;
      clone = new THREE.Line(src.geometry, material);
    } else {
      clone = new THREE.Mesh(src.geometry, material);
    }

    // 元ジオメトリより前面に出してハイライトを優先表示
    clone.renderOrder = 999;

    clone.position.copy(src.position);
    clone.quaternion.copy(src.quaternion);
    clone.scale.copy(src.scale);

    group.add(clone);

    // 線がフォーカス対象なら、線全体に沿った多層チューブグローを追加
    if (src.isLine && isFocus && lineGlowEnabled) {
      const glowMeshes = createLineGlowMeshes(src, lineGlowCfg);
      if (Array.isArray(glowMeshes)) {
        glowMeshes.forEach((m) => group.add(m));
      }
    }
  }
}

export function clearHighlight(scene) {
  if (!highlightGroup) return;

  // 毎フレーム作り直すマテリアル／チューブ用 geometry を破棄してリーク防止。
  for (const child of highlightGroup.children) {
    // チューブグロー（自前 geometry）のみ dispose
    if (
      child.userData &&
      child.userData._microFX_ownGeometry &&
      child.geometry &&
      typeof child.geometry.dispose === "function"
    ) {
      child.geometry.dispose();
    }

    const mat = child.material;
    if (mat && typeof mat.dispose === "function") {
      mat.dispose();
    }
  }

  highlightGroup.clear();
}
