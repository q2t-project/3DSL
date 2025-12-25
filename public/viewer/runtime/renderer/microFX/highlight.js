// viewer/runtime/renderer/microFX/highlight.js
//
// micro-highlight:
//   - microState の focusUuid / relatedUuids を元に、
//     元オブジェクトをなぞるオーバーレイを描く。
//   - microState.focusPosition / localBounds には依存しない。
//     （three.js 側の src.position / src.quaternion / src.scale をそのままコピー）
//   - 長さ単位は「元 geometry の座標系」に丸投げし、カメラ距離や sceneRadius には踏み込まない。

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";
import { clamp01, normalizeIntensity } from "./utils.js";

let highlightGroup = null;

// ------------------------------------------------------------
// focus line glow cache（TubeGeometry は重いので focus 変更時だけ生成）
// ------------------------------------------------------------
let _lineGlowCache = {
  scene: null,
  focusUuid: null,
  geomKey: null,
  meshes: null, // Array<THREE.Mesh>
};

function _disposeGlowMeshes(meshes) {
  if (!Array.isArray(meshes)) return;
  for (const m of meshes) {
    if (!m) continue;
    // TubeGeometry は自前生成なので確実に dispose
    if (m.geometry && typeof m.geometry.dispose === "function") {
      try { m.geometry.dispose(); } catch (_e) {}
    }
    if (m.material && typeof m.material.dispose === "function") {
      try { m.material.dispose(); } catch (_e) {}
    }
    try { m.parent?.remove(m); } catch (_e) {}
  }
}

function _resetLineGlowCache(dispose = true) {
  if (dispose) _disposeGlowMeshes(_lineGlowCache.meshes);
  _lineGlowCache.scene = null;
  _lineGlowCache.focusUuid = null;
  _lineGlowCache.geomKey = null;
  _lineGlowCache.meshes = null;
}

// ---------------- visibleSet を判定関数に正規化 ----------------
function buildVisiblePredicate(vs) {
  if (!vs) return null;

  // うっかり getVisibleSet 関数が渡ってきたケース
  if (typeof vs === "function") {
    try {
      vs = vs();
    } catch {
      return null;
    }
  }

  // 旧仕様: Set<uuid>
  if (vs instanceof Set) {
    return (uuid) => vs.has(uuid);
  }

  // 新仕様: { points:Set|uuid[], lines:Set|uuid[], aux:Set|uuid[] }
  if (typeof vs === "object") {
    const pools = [];
    if (vs.points) pools.push(vs.points);
    if (vs.lines) pools.push(vs.lines);
    if (vs.aux) pools.push(vs.aux);

    if (!pools.length) return null;

    return (uuid) => {
      for (const pool of pools) {
        if (!pool) continue;
        if (pool instanceof Set && pool.has(uuid)) return true;
        if (Array.isArray(pool) && pool.includes(uuid)) return true;
      }
      return false;
    };
  }

  return null;
}
// ------------------------------------------------------------

function ensureGroup(scene) {
  // 他 scene の残骸があれば破棄（parent が null の場合もケア）
  if (
    highlightGroup &&
    highlightGroup.parent &&
    highlightGroup.parent !== scene
  ) {
    highlightGroup.parent.remove(highlightGroup);
    highlightGroup = null;
    // scene が変わったら cache も破棄（旧 scene にぶら下がった参照を残さない）
    _resetLineGlowCache(true);
  }

  if (!highlightGroup) {
    highlightGroup = new THREE.Group();
    highlightGroup.name = "micro-highlight";
    highlightGroup.renderOrder = 998;
    scene.add(highlightGroup);
  }
  return highlightGroup;
}

function _getLineGlowLayersCfg(lineGlowCfg) {
  return Array.isArray(lineGlowCfg?.layers)
    ? lineGlowCfg.layers
    : [
        { radiusMul: 1.0, opacityMul: 1.0 },  // コア
        { radiusMul: 4.8, opacityMul: 0.35 }, // 内側ハロー
        { radiusMul: 9.6, opacityMul: 0.12 }, // 外側ハロー
      ];
}

function _makeLineGlowGeomKey(src, lineGlowCfg) {
  const geom = src?.geometry;
  const posAttr = geom?.attributes?.position;
  const geomUuid = geom?.uuid || "";
  const posCount = Number(posAttr?.count) || 0;
  const posVer = Number(posAttr?.version) || 0;

  const radius = Number(lineGlowCfg?.radius) || 0;
  const tubularPerSeg = Number(lineGlowCfg?.tubularSegmentsPerSegment) || 0;
  const radialSeg = Number(lineGlowCfg?.radialSegments) || 0;
  const baseOpacity = Number(lineGlowCfg?.opacity) || 0;
  const color = String(lineGlowCfg?.color || "");
  const layers = _getLineGlowLayersCfg(lineGlowCfg)
    .map((l) => `${Number(l?.radiusMul) || 0}:${Number(l?.opacityMul) || 0}`)
    .join(",");

  // focusUuid と組み合わせて使う前提（ここは geometry + config の fingerprint）
  return `${geomUuid}|${posCount}|${posVer}|r=${radius}|tps=${tubularPerSeg}|rs=${radialSeg}|op=${baseOpacity}|c=${color}|L=${layers}`;
}

function _syncCachedGlowMeshes(meshes, src, intensity) {
  if (!Array.isArray(meshes) || !src) return;
  const s = normalizeIntensity(intensity, 1);
  for (const m of meshes) {
    if (!m) continue;
    // transform は毎フレーム src に追従（position/quaternion/scale は cheap）
    try { m.position.copy(src.position); } catch (_e) {}
    try { m.quaternion.copy(src.quaternion); } catch (_e) {}
    try { m.scale.copy(src.scale); } catch (_e) {}

    const base = Number(m.userData?._microFX_lineGlow_baseOpacity);
    const mul = Number(m.userData?._microFX_lineGlow_opacityMul);
    const baseOpacity = Number.isFinite(base) ? base : 0;
    const opacityMul = Number.isFinite(mul) ? mul : 1;

    const mat = m.material;
    if (mat && "opacity" in mat) {
      mat.transparent = true;
      mat.opacity = clamp01(baseOpacity * opacityMul * s);
      mat.needsUpdate = true;
    }
  }
}

// focus line 用の「多層チューブグロー」を生成
// 返り値: Mesh の配列（中核 + ハロー）
function createLineGlowMeshes(src, lineGlowCfg, intensity = 1) {
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
  const layersCfg = _getLineGlowLayersCfg(lineGlowCfg);

  const meshes = [];
  const s = normalizeIntensity(intensity, 1);

  for (const layer of layersCfg) {
    const radiusMul =
      typeof layer.radiusMul === "number" ? layer.radiusMul : 1.0;
    const opacityMul =
      typeof layer.opacityMul === "number" ? layer.opacityMul : 1.0;

    const tubeGeom = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius * radiusMul,
      radialSegments,
      false
    );

    const material = new THREE.MeshBasicMaterial({
      color: lineGlowCfg.color || "#00ffff",
      transparent: true,
      opacity: clamp01(baseOpacity * opacityMul * s),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
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
  visibleSet,
  intensity = 1
) {
  // 毎フレームの clear では cache は残す（TubeGeometry を再利用する）
  clearHighlight(scene, { disposeCache: false });
  if (!microState) return;

  const s = normalizeIntensity(intensity, 1);
  if (s <= 0) return;

  const isVisible = buildVisiblePredicate(visibleSet);

  const { focusUuid, relatedUuids, focusKind } = microState;
  const focusKindStr = typeof focusKind === "string" ? focusKind : null;

  const ids = [];
  if (focusUuid) ids.push(focusUuid);
  if (Array.isArray(relatedUuids)) ids.push(...relatedUuids);
  const uniqIds = [...new Set(ids)].filter(Boolean);
  if (uniqIds.length === 0) return;

  const group = ensureGroup(scene);

  const focusSet   = new Set(focusUuid ? [focusUuid] : []);
  const relatedSet = new Set(Array.isArray(relatedUuids) ? relatedUuids : []);

  const hlCfg       = microFXConfig.highlight || {};
  const focusCfg    = hlCfg.focus   || {};
  const relatedCfg  = hlCfg.related || {};
  const lineGlowCfg = hlCfg.lineGlow || {};
  const lineCfg     = hlCfg.line || {};
  const lineGlowEnabled = lineGlowCfg.enabled !== false;

  for (const uuid of uniqIds) {
    // 7.11.5: visibleSet に含まれない要素は処理しない（新旧どっちも対応）
    if (typeof isVisible === "function" && !isVisible(uuid)) continue;

  // getObjectByUuid は indexMaps を閉じ込めた関数を期待している
    const src = getObjectByUuid(uuid);
    if (!src) continue;

    const isFocus = focusSet.has(uuid);
    const isRelated = relatedSet.has(uuid);

    // aux を focus したときは、grid 等の補助線が「全面発光」して見た目が荒れる。
    // focus の aux は marker/bounds/axes だけで十分なので、uuid overlay はスキップする。
    // （related は従来通り処理する）
    if (isFocus && focusKindStr === "aux") {
      continue;
    }

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

    // ★ intensity を掛けて最終不透明度にする
    material.opacity = clamp01(opacity * s);

    // opacity がゼロに落ちたら生成しても見えないので、そのまま続行する
    let clone;
    if (src.isLine) {
      // 対応ブラウザではちょっと太く見えるかも（効かなくても害はない）
      const focusWidth =
        typeof lineCfg.focusWidth === "number" ? lineCfg.focusWidth : 4;
      const relatedWidth =
        typeof lineCfg.relatedWidth === "number" ? lineCfg.relatedWidth : 2;
      material.linewidth = isFocus ? focusWidth : relatedWidth;
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

    // focus line の強調表示として、線全体に沿った多層チューブグローを追加。
    // 以前は effect_type="glow" のみに限定していたが、
    // WebGL の linewidth 制約で「太さが効かない」環境では見え方が弱くなるため、
    // デフォルトは focus line なら常に有効にする。
    // 旧挙動に戻したい場合は lineGlow.requireEffectTypeGlow=true を使う。
    let wantsLineGlow = true;
    if (src.isLine && lineGlowCfg?.requireEffectTypeGlow === true) {
      const ud = src.userData || {};
      const eff = ud.effect;
      const effType = ud.effectType || (eff && (eff.effect_type || eff.type));
      wantsLineGlow = effType === "glow";
    }

    // lineGlow（Tube）は「線を focus したとき」だけ。
    // aux の grid（LineSegments）を focus した場合に太いチューブが出ると見た目が汚くなる。
    if (src.isLine && isFocus && focusKindStr === "lines" && lineGlowEnabled && wantsLineGlow) {
      // focusUuid + geomKey でキャッシュ（TubeGeometry の再生成を抑止）
      const geomKey = _makeLineGlowGeomKey(src, lineGlowCfg);
      const cacheHit =
        _lineGlowCache.scene === scene &&
        _lineGlowCache.focusUuid === focusUuid &&
        _lineGlowCache.geomKey === geomKey &&
        Array.isArray(_lineGlowCache.meshes) &&
        _lineGlowCache.meshes.length > 0;

      if (!cacheHit) {
        _resetLineGlowCache(true);
        const meshes = createLineGlowMeshes(src, lineGlowCfg, 1);
        if (Array.isArray(meshes) && meshes.length > 0) {
          const baseOpacity =
            typeof lineGlowCfg.opacity === "number" ? lineGlowCfg.opacity : 0.7;
          const layersCfg = _getLineGlowLayersCfg(lineGlowCfg);
          meshes.forEach((m, i) => {
            // clearHighlight で毎フレーム dispose されないようにマーク
            m.userData._microFX_cachedLineGlow = true;
            m.userData._microFX_lineGlow_baseOpacity = baseOpacity;
            m.userData._microFX_lineGlow_opacityMul =
              typeof layersCfg?.[i]?.opacityMul === "number"
                ? layersCfg[i].opacityMul
                : 1.0;
          });

          _lineGlowCache.scene = scene;
          _lineGlowCache.focusUuid = focusUuid;
          _lineGlowCache.geomKey = geomKey;
          _lineGlowCache.meshes = meshes;
        }
      }

      // 毎フレームは transform + opacity だけ同期して add
      if (Array.isArray(_lineGlowCache.meshes)) {
        _syncCachedGlowMeshes(_lineGlowCache.meshes, src, s);
        _lineGlowCache.meshes.forEach((m) => group.add(m));
      }
    }
  }
}


let glowLine = null;
let glowMat = null;
let glowSrcUuid = null;

function disposeGlowLine(scene) {
  if (!glowLine) return;
  scene.remove(glowLine);
  glowLine.geometry?.dispose?.();
  glowMat?.dispose?.();
  glowLine = null;
  glowMat = null;
  glowSrcUuid = null;
}

function findLineObject(root) {
  let found = null;
  root.traverse?.((o) => {
    // Line2 / LineSegments2 / THREE.Line 系を拾う
    if (o && (o.isLine2 || o.isLineSegments2 || o.isLine || o.type?.includes("Line"))) {
      found = o;
    }
  });
  return found;
}

export function updateHighlight(scene, microState, deps) {
  const { focusUuid, focusKind } = microState;
  const cfg = microFXConfig?.highlight?.lineGlow;

  // lines 以外なら消す
  if (!cfg?.enabled || focusKind !== "lines" || !focusUuid) {
    disposeGlowLine(scene);
    return;
  }

  const srcRoot = deps.getObjectByUuid?.(focusUuid);
  const src = srcRoot ? findLineObject(srcRoot) : null;
  if (!src || !src.geometry || !src.material) {
    disposeGlowLine(scene);
    return;
  }

  // 初回 or 対象が変わったら作り直し
  if (!glowLine || glowSrcUuid !== focusUuid) {
    disposeGlowLine(scene);

    // material clone（Additive発光）
    glowMat = src.material.clone();
    if (glowMat.color) glowMat.color = new THREE.Color(cfg.color ?? 0xffffff);
    glowMat.transparent = true;
    glowMat.opacity = cfg.opacity ?? 0.35;
    glowMat.depthWrite = false;
    glowMat.depthTest = cfg.depthTest ?? false;
    glowMat.blending = THREE.AdditiveBlending;

    // LineMaterial 系は linewidth/resolution が効く
    if ("linewidth" in glowMat) {
      const base = (src.material.linewidth ?? glowMat.linewidth ?? 1);
      glowMat.linewidth = base * (cfg.widthFactor ?? 3.0);
    }
    if (glowMat.resolution && deps.renderer?.domElement) {
      const c = deps.renderer.domElement;
      glowMat.resolution.set(c.width, c.height);
    }

    // geometry は clone（元の更新に引っ張られないように）
    const g = src.geometry.clone();

    // できるだけ同じクラスで作る（Line2/LineSegments2 を維持）
    glowLine = new src.constructor(g, glowMat);
    glowLine.renderOrder = 999;
    glowLine.frustumCulled = false;

    scene.add(glowLine);
    glowSrcUuid = focusUuid;
  }

  // 毎フレーム、transform と resolution を追従
  glowLine.position.copy(src.getWorldPosition(new THREE.Vector3()));
  glowLine.quaternion.copy(src.getWorldQuaternion(new THREE.Quaternion()));
  glowLine.scale.copy(src.getWorldScale(new THREE.Vector3()));

  if (glowMat?.resolution && deps.renderer?.domElement) {
    const c = deps.renderer.domElement;
    glowMat.resolution.set(c.width, c.height);
  }
}


export function clearHighlight(scene, opts = {}) {
  if (!highlightGroup) return;

  const disposeCache = opts?.disposeCache !== false;
  if (disposeCache) {
    // フルリセット時（microFX OFF / dispose）だけ cache も捨てる
    _resetLineGlowCache(true);
  }

  // 毎フレーム作り直すマテリアル／チューブ用 geometry を破棄してリーク防止。
  for (const child of highlightGroup.children) {
    // cached glow は毎フレーム dispose しない（フルリセット時は上で捨ててる）
    if (child?.userData?._microFX_cachedLineGlow) continue;
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
