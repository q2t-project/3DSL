// viewer/runtime/renderer/context.js

import * as THREE from "../../../vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl } from "./microFX/index.js";
import { buildPointLabelIndex } from "../core/labelModel.js";
import { createLabelRuntime } from "./labels/labelRuntime.js";
import { createWorldAxesLayer } from "./worldAxes.js";
import { createLineEffectsRuntime } from "./effects/lineEffects.js";
import {
  getUuid,
  getPointPosition,
  getColor,
  getOpacity,
  clamp01,
} from "./shared.js";

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------

const DEBUG_RENDERER = false; // 開発中だけ true にする

function debugRenderer(...args) {
  if (!DEBUG_RENDERER) return;
  console.log(...args);
}

// ============================================================
// createRendererContext 本体
// ============================================================

export function createRendererContext(canvasOrOptions) {
  const canvas =
    canvasOrOptions instanceof HTMLCanvasElement
      ? canvasOrOptions
      : canvasOrOptions?.canvas ?? canvasOrOptions;
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("canvas must be an HTMLCanvasElement");
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directional = new THREE.DirectionalLight(0xffffff, 0.6);
  directional.position.set(5, 10, 7.5);
  scene.add(directional);

  // ------------------------------------------------------------
  // ワールド軸レイヤ（背景）: X=青, Y=緑, Z=赤
  // ------------------------------------------------------------

  const worldAxes = createWorldAxesLayer(scene);

  // three.js オブジェクト群
  const pointObjects = new Map(); // uuid -> THREE.Mesh（point）
  const lineObjects = new Map(); // uuid -> THREE.Line / LineSegments
  const auxObjects = new Map(); // uuid -> THREE.Object3D

  // ベーススタイル（selection/microFX から参照）
  const baseStyle = new Map(); // uuid -> { color: THREE.Color, opacity: number }

  // ラベルランタイム
  const labelRuntime = createLabelRuntime(scene);
  const labelSprites = labelRuntime.labelSprites; // applyFrame / pick から参照

  // シーンメトリクス
  let sceneRadius = 1;
  const sceneCenter = new THREE.Vector3(0, 0, 0);

  // structIndex（あれば）
  let currentIndices = null;
  let lineProfileByUuid = null;

  // 3DSS points の位置キャッシュ（line の end_a/end_b 参照用）
  //   - position: [x,y,z]
  //   - radius:   SphereGeometry の半径（代表半径）
  let pointPositionByUuid = new Map();
  let pointRadiusByUuid = new Map();

  const lookupByUuid = (uuid) =>
    pointObjects.get(uuid) || lineObjects.get(uuid) || auxObjects.get(uuid);

  const raycaster = new THREE.Raycaster();

  // ラインエフェクトランタイム（flow/glow/pulse + selection overlay）
  const lineEffects = createLineEffectsRuntime({
    lineObjects,
    baseStyle,
  });

  // ------------------------------------------------------------
  // マップ類のクリア
  // ------------------------------------------------------------

  function clearMaps() {
    for (const obj of [
      ...pointObjects.values(),
      ...lineObjects.values(),
      ...auxObjects.values(),
    ]) {
      scene.remove(obj);
    }
    pointObjects.clear();
    lineObjects.clear();
    auxObjects.clear();
    baseStyle.clear();

    pointPositionByUuid = new Map();
    pointRadiusByUuid = new Map();
    currentIndices = null;
    lineProfileByUuid = null;

    // ラベル Sprite / Plane も掃除
    labelRuntime.clear();
  }

  // ============================================================
  // 3DSS: points
  // ============================================================

  // 3DSS v1.0.2: appearance.marker.primitive 別にジオメトリと「代表半径」を決める
  const createPoint = (pointNode) => {
    const uuid = getUuid(pointNode);
    if (!uuid) return null;

    // 位置（structIndex 優先）
    const posArr = getPointPosition(pointNode, currentIndices);
    const pos =
      Array.isArray(posArr) && posArr.length === 3 ? posArr : [0, 0, 0];

    const marker = pointNode?.appearance?.marker || {};
    const common = marker.common || {};

    // 共通スタイル
    const color = common.color
      ? new THREE.Color(common.color)
      : getColor(pointNode, "#ffffff");

    const opacity =
      typeof common.opacity === "number"
        ? common.opacity
        : getOpacity(pointNode, 0.9);

    const scaleArr =
      Array.isArray(common.scale) && common.scale.length === 3
        ? common.scale
        : [1, 1, 1];

    const sx = scaleArr[0] ?? 1;
    const sy = scaleArr[1] ?? 1;
    const sz = scaleArr[2] ?? 1;

    const primitive = marker.primitive || "sphere";

    const ensurePositive = (v, def) =>
      typeof v === "number" && v > 0 ? v : def;

    let geometry;
    let bboxRadius = 0.5; // world 単位での代表半径（fallback）

    switch (primitive) {
      case "none": {
        // ジオメトリ無しだと pick できないので、ごく小さい球を置いておく
        const r = 0.03;
        geometry = new THREE.SphereGeometry(r, 12, 12);
        bboxRadius = r;
        break;
      }

      case "sphere": {
        const r = ensurePositive(marker.radius, 1);
        geometry = new THREE.SphereGeometry(r, 24, 24);
        bboxRadius = r * Math.max(sx, sy, sz);
        break;
      }

      case "box": {
        const size = Array.isArray(marker.size) ? marker.size : [1, 1, 1];
        const wx = ensurePositive(size[0], 1);
        const wy = ensurePositive(size[1], 1);
        const wz = ensurePositive(size[2], 1);
        geometry = new THREE.BoxGeometry(wx, wy, wz);

        const hx = (wx * sx) / 2;
        const hy = (wy * sy) / 2;
        const hz = (wz * sz) / 2;
        bboxRadius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        break;
      }

      case "cone": {
        const r = ensurePositive(marker.radius, 1);
        const h = ensurePositive(marker.height, 2 * r);
        // three.js の ConeGeometry は [-h/2, +h/2] に分布して原点中心
        geometry = new THREE.ConeGeometry(r, h, 24);

        const hx = r * sx;
        const hz = r * sz;
        const hy = (h * sy) / 2;
        bboxRadius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        break;
      }

      case "pyramid": {
        const base = Array.isArray(marker.base) ? marker.base : [1, 1];
        const bw = ensurePositive(base[0], 1);
        const bd = ensurePositive(base[1] ?? base[0], 1);
        const h = ensurePositive(marker.height, Math.max(bw, bd));

        // 四角錐は 4 分割 cone で近似
        const baseRadius = Math.max(bw, bd) / 2;
        geometry = new THREE.ConeGeometry(baseRadius, h, 4);
        geometry.rotateY(Math.PI / 4);

        const hx = (bw * sx) / 2;
        const hz = (bd * sz) / 2;
        const hy = (h * sy) / 2;
        bboxRadius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        break;
      }

      case "corona": {
        const inner = ensurePositive(marker.inner_radius, 0.5);
        const outer = ensurePositive(marker.outer_radius, inner * 1.5);

        geometry = new THREE.RingGeometry(inner, outer, 32);
        // Z+ up 系なので、そのまま XY 平面に置いて OK

        bboxRadius = outer * Math.max(sx, sy, sz);
        break;
      }

      default: {
        // 未知 primitive はとりあえず unit sphere
        const r = 1;
        geometry = new THREE.SphereGeometry(r, 16, 16);
        bboxRadius = r * Math.max(sx, sy, sz);
        break;
      }
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
    });

    const obj = new THREE.Mesh(geometry, material);
    obj.position.set(pos[0], pos[1], pos[2]);
    obj.scale.set(sx, sy, sz);
    obj.userData.uuid = uuid;

    // orientation (Z+ up 基準)
    if (Array.isArray(common.orientation) && common.orientation.length === 3) {
      const [rx, ry, rz] = common.orientation;
      obj.rotation.set(rx, ry, rz);
    }

    baseStyle.set(uuid, {
      color: color.clone(),
      opacity: material.opacity,
    });

    // line 端部計算用キャッシュ
    pointPositionByUuid.set(uuid, pos);
    // 少しマージンを乗せておくと、線が確実に marker の外から出る
    pointRadiusByUuid.set(uuid, bboxRadius * 1.05);

    return obj;
  };

  // ============================================================
  // line 端点の補正と arrow 用ヘルパ
  // ============================================================

  function resolveLineEndpoint(endNode) {
    const position = new THREE.Vector3();
    let radius = 0;
    let refUuid = null;

    if (!endNode) {
      return { position, radius, refUuid };
    }

    // ref(uuid) → point の中心＋代表半径
    if (typeof endNode.ref === "string") {
      refUuid = endNode.ref;

      // point → center + radius
      let p = pointPositionByUuid.get(refUuid);

      // point に無ければ aux（structIndex）も見る
      if (!p && currentIndices && currentIndices.auxPosition instanceof Map) {
        p = currentIndices.auxPosition.get(refUuid) || null;
      }

      if (Array.isArray(p) && p.length === 3) {
        position.set(p[0], p[1], p[2]);
      } else if (p && typeof p.x === "number") {
        position.set(p.x, p.y, p.z);
      }

      const r = pointRadiusByUuid.get(refUuid);
      if (typeof r === "number" && Number.isFinite(r) && r > 0) {
        radius = r;
      }

      return { position, radius, refUuid };
    }

    // coord([x,y,z]) → 直接座標（代表半径 0）
    if (Array.isArray(endNode.coord) && endNode.coord.length >= 3) {
      position.set(endNode.coord[0], endNode.coord[1], endNode.coord[2]);
    }

    return { position, radius, refUuid };
  }

  function computeTrimmedSegment(posA, posB, radiusA, radiusB) {
    const start = posA.clone();
    const end = posB.clone();

    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();

    if (!Number.isFinite(length) || length === 0) {
      return {
        start,
        end,
        dir: new THREE.Vector3(1, 0, 0),
        length: 0,
      };
    }

    dir.divideScalar(length);

    if (radiusA > 0 || radiusB > 0) {
      // 端点同士が食い違わないよう、最大でも 49% だけカット
      const maxCut = length * 0.49;
      const cutA = Math.min(radiusA, maxCut);
      const cutB = Math.min(radiusB, maxCut);

      start.addScaledVector(dir, cutA);
      end.addScaledVector(dir, -cutB);
    }

    return {
      start,
      end,
      dir,
      length: start.distanceTo(end),
    };
  }

  const ARROW_BASE_AXIS = new THREE.Vector3(0, 1, 0);

  // glow / pulse 共通の二重ハロー帯を作る
  function createHaloMeshesForLine(
    segmentInfo,
    color,
    rawEffect,
    baseRenderOrder
  ) {
    if (!segmentInfo || !(segmentInfo.length > 0)) {
      return { inner: null, outer: null };
    }

    const length = segmentInfo.length;

    const ampRaw =
      rawEffect && typeof rawEffect.amplitude === "number"
        ? rawEffect.amplitude
        : 0.6;
    const amp = clamp01(ampRaw);

    // 線の長さに対する割合で半径を決める
    const baseRatioInner = 0.012; // 1.2%
    const extraRatioInner = 0.018; // +1.8% まで
    const baseRatioOuter = 0.02; // 2.0%
    const extraRatioOuter = 0.03; // +3.0% まで

    const innerRadius = length * (baseRatioInner + extraRatioInner * amp);
    const outerRadius = length * (baseRatioOuter + extraRatioOuter * amp);

    const innerGeom = new THREE.CylinderGeometry(
      innerRadius,
      innerRadius,
      length,
      16,
      1,
      true
    );
    innerGeom.translate(0, length / 2, 0);

    const outerGeom = new THREE.CylinderGeometry(
      outerRadius,
      outerRadius,
      length,
      16,
      1,
      true
    );
    outerGeom.translate(0, length / 2, 0);

    const innerMat = new THREE.MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.85, // 濃い帯
      depthWrite: false,
    });

    const outerMat = new THREE.MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.35, // 薄い帯
      depthWrite: false,
    });

    const inner = new THREE.Mesh(innerGeom, innerMat);
    const outer = new THREE.Mesh(outerGeom, outerMat);

    // A→B 方向にそろえる
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(
      ARROW_BASE_AXIS,
      segmentInfo.dir.clone().normalize()
    );
    inner.quaternion.copy(q);
    outer.quaternion.copy(q);

    // A 側の表面から出す
    inner.position.copy(segmentInfo.start);
    outer.position.copy(segmentInfo.start);

    const baseOrder =
      typeof baseRenderOrder === "number" && Number.isFinite(baseRenderOrder)
        ? baseRenderOrder
        : 0;

    // 線より少しだけ奥（=先に描画されるように）
    inner.renderOrder = baseOrder - 0.1;
    outer.renderOrder = baseOrder - 0.2;

    inner.userData.isHaloInner = true;
    outer.userData.isHaloOuter = true;

    inner.userData.baseOpacity =
      typeof innerMat.opacity === "number" ? innerMat.opacity : 1.0;
    outer.userData.baseOpacity =
      typeof outerMat.opacity === "number" ? outerMat.opacity : 1.0;

    inner.userData.baseScale = inner.scale.clone();
    outer.userData.baseScale = outer.scale.clone();

    return { inner, outer };
  }

  function createArrowMesh(
    arrowCfg,
    color,
    segmentLength,
    opacity = 1.0,
    renderOrder = 0
  ) {
    if (!arrowCfg) return null;

    // v1.0.2: primitive, v1.0.1: shape の両対応
    const primitive = arrowCfg.primitive || arrowCfg.shape || "none";
    if (primitive === "none") return null;

    let geometry = null;

    switch (primitive) {
      case "line": {
        const length =
          typeof arrowCfg.length === "number" && arrowCfg.length > 0
            ? arrowCfg.length
            : Math.max(0.03, Math.min(segmentLength * 0.2, 0.5));
        const thickness =
          typeof arrowCfg.thickness === "number" && arrowCfg.thickness > 0
            ? arrowCfg.thickness
            : length * 0.15;

        const radius = thickness * 0.5;
        geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
        // base がローカル原点になるように
        geometry.translate(0, length / 2, 0);
        break;
      }

      case "cone": {
        // v1.0.1: size & aspect からも復元できるようにしておく
        const fallbackLen = Math.max(
          0.03,
          Math.min(segmentLength * 0.2, 0.5)
        );
        const size =
          typeof arrowCfg.size === "number" && arrowCfg.size > 0
            ? arrowCfg.size
            : fallbackLen;
        const aspect =
          typeof arrowCfg.aspect === "number" && arrowCfg.aspect > 0
            ? arrowCfg.aspect
            : 2.0;

        const radius =
          typeof arrowCfg.radius === "number" && arrowCfg.radius > 0
            ? arrowCfg.radius
            : size / aspect;
        const height =
          typeof arrowCfg.height === "number" && arrowCfg.height > 0
            ? arrowCfg.height
            : size;

        geometry = new THREE.ConeGeometry(radius, height, 16);
        // base をローカル原点に
        geometry.translate(0, height / 2, 0);
        break;
      }

      case "pyramid": {
        const base = Array.isArray(arrowCfg.base) ? arrowCfg.base : null;
        const bw =
          typeof base?.[0] === "number" && base[0] > 0
            ? base[0]
            : Math.max(0.03, Math.min(segmentLength * 0.15, 0.3));
        const bd =
          typeof base?.[1] === "number" && base[1] > 0 ? base[1] : bw;
        const height =
          typeof arrowCfg.height === "number" && arrowCfg.height > 0
            ? arrowCfg.height
            : bw * 2;

        const radius = 0.5 * Math.max(bw, bd);
        geometry = new THREE.ConeGeometry(radius, height, 4);
        geometry.rotateY(Math.PI / 4); // 正方形っぽく
        geometry.translate(0, height / 2, 0); // base を原点
        break;
      }

      default:
        return null;
    }

    const matOpacity =
      typeof opacity === "number" && Number.isFinite(opacity) ? opacity : 1.0;

    const material = new THREE.MeshBasicMaterial({
      color: color.clone ? color.clone() : new THREE.Color(color),
      transparent: true,
      opacity: matOpacity,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // line 本体と同じ renderOrder をベースに、ほんの少しだけ前面に
    const baseOrder =
      typeof renderOrder === "number" && Number.isFinite(renderOrder)
        ? renderOrder
        : 0;
    mesh.renderOrder = baseOrder + 0.1;

    return mesh;
  }

  function positionArrowMesh(mesh, basePosition, dir) {
    if (!mesh) return;

    const normDir = dir.clone().normalize();
    if (!Number.isFinite(normDir.lengthSq()) || normDir.lengthSq() === 0) {
      return;
    }

    // base（= marker 表面）をこの位置に置く
    mesh.position.copy(basePosition);

    const q = new THREE.Quaternion();
    q.setFromUnitVectors(ARROW_BASE_AXIS, normDir);
    mesh.quaternion.copy(q);
  }

  function resolveArrowPlacement(lineNode, arrowCfg) {
    if (!arrowCfg) return "none";

    if (arrowCfg.placement) {
      return arrowCfg.placement;
    }

    const sense = lineNode?.signification?.sense;
    switch (sense) {
      case "a_to_b":
        return "end_b";
      case "b_to_a":
        return "end_a";
      case "bidirectional":
        return "both";
      default:
        return "none";
    }
  }

  // ============================================================
  // 3DSS: lines
  // ============================================================

  const createLine = (lineNode, lineProfile = null) => {
    const uuid = getUuid(lineNode);
    if (!uuid) return null;

    let positions = null;
    let segmentInfo = null;

    // 3DSS 正式: end_a / end_b から「表面で止まる線分」を計算
    const endA = lineNode?.appearance?.end_a;
    const endB = lineNode?.appearance?.end_b;

    if (endA || endB) {
      const a = resolveLineEndpoint(endA);
      const b = resolveLineEndpoint(endB);
      segmentInfo = computeTrimmedSegment(
        a.position,
        b.position,
        a.radius,
        b.radius
      );

      positions = [
        segmentInfo.start.x,
        segmentInfo.start.y,
        segmentInfo.start.z,
        segmentInfo.end.x,
        segmentInfo.end.y,
        segmentInfo.end.z,
      ];
    }

    // 旧プロト互換: vertices: [[x,y,z], ...]
    if (!positions && Array.isArray(lineNode?.vertices)) {
      const flat = [];
      for (const v of lineNode.vertices) {
        if (Array.isArray(v) && v.length === 3) {
          flat.push(v[0], v[1], v[2]);
        }
      }
      if (flat.length >= 6) {
        positions = flat;

        // arrow 用に dir だけは拾っておく
        const start = new THREE.Vector3(flat[0], flat[1], flat[2]);
        const end = new THREE.Vector3(flat[3], flat[4], flat[5]);
        const dir = new THREE.Vector3().subVectors(end, start);
        const len = dir.length();
        if (len > 0) dir.divideScalar(len);
        segmentInfo = { start, end, dir, length: len };
      }
    }

    if (!positions) return null; // データ不足

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const color = getColor(lineNode, "#ffffff");
    const opacity = getOpacity(lineNode, 1.0);

    // -------- effect 情報の取り出し（doc優先＋profile補完でマージ） --------
    const docEffect =
      lineNode?.appearance && typeof lineNode.appearance.effect === "object"
        ? lineNode.appearance.effect
        : null;

    const profileEffect =
      lineProfile && typeof lineProfile.effect === "object"
        ? lineProfile.effect
        : null;

    // profile → doc の順で上書き（profile がデフォルト、doc が上書き）
    const mergedEffect = {
      ...(profileEffect || {}),
      ...(docEffect || {}),
    };

    const hasEffect = Object.keys(mergedEffect).length > 0;

    // effect_type / type / kind のどれでも拾う
    const effectType =
      mergedEffect.effect_type ||
      mergedEffect.type ||
      mergedEffect.kind ||
      null;

    const isFlow  = effectType === "flow";
    const isGlow  = effectType === "glow";
    const isPulse = effectType === "pulse";

    // -------- line visual style (solid / dashed / dotted ...) --------
    let lineVisualStyle = "solid";
    if (lineProfile && typeof lineProfile.lineStyle === "string") {
      lineVisualStyle = lineProfile.lineStyle;
    } else if (
      lineNode?.appearance &&
      typeof lineNode.appearance.line_style === "string"
    ) {
      lineVisualStyle = lineNode.appearance.line_style;
    }
    const isDashedStyle =
      lineVisualStyle === "dashed" || lineVisualStyle === "dotted";

    // flow じゃなくても dashed/dotted は LineDashedMaterial を使う
    const useDashedMaterial = isFlow || isDashedStyle;

    let material;

    if (useDashedMaterial) {
      let dashSize;
      let gapSize;

      if (isFlow) {
        dashSize =
          typeof mergedEffect?.dash_size === "number"
            ? mergedEffect.dash_size
            : typeof mergedEffect?.dashSize === "number"
            ? mergedEffect.dashSize
            : 0.4;
        gapSize =
          typeof mergedEffect?.gap_size === "number"
            ? mergedEffect.gap_size
            : typeof mergedEffect?.gapSize === "number"
            ? mergedEffect.gapSize
            : 0.2;
      } else {
        // 静的な dashed/dotted のデフォルトパターン
        if (lineVisualStyle === "dotted") {
          dashSize = 0.06;
          gapSize = 0.18;
        } else {
          // dashed
          dashSize = 0.35;
          gapSize = 0.25;
        }
      }

      material = new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize,
        gapSize,
      });
    } else {
      // glow はちょい明るめ＋加算ブレンド
      let finalColor = color.clone();

      if (isGlow) {
        const hsl = { h: 0, s: 0, l: 0 };
        finalColor.getHSL(hsl);

        const rawIntensity =
          mergedEffect && typeof mergedEffect.intensity === "number"
            ? mergedEffect.intensity
            : 0.3; // 0〜1
        const intensity = Math.max(0, Math.min(rawIntensity, 1));

        hsl.l = Math.min(1.0, hsl.l + intensity);
        finalColor.setHSL(hsl.h, hsl.s, hsl.l);
      }

      material = new THREE.LineBasicMaterial({
        color: finalColor,
        transparent: true,
        opacity,
        depthWrite: !isGlow,
        blending: isGlow ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
    }

    const obj = new THREE.Line(geometry, material);
    obj.userData.uuid = uuid;

    // dashed 系は一度だけ距離を計算
    if (
      typeof obj.computeLineDistances === "function" &&
      obj.material &&
      obj.material.isLineDashedMaterial
    ) {
      obj.computeLineDistances();
    }

    // effect 情報を userData に保持
    obj.userData.effect = mergedEffect;
    obj.userData.effectType = effectType || null;

    // renderOrder を決定（lineProfile → appearance.render_order の順で参照）
    let renderOrder = null;
    if (lineProfile && typeof lineProfile.renderOrder === "number") {
      renderOrder = lineProfile.renderOrder;
    } else if (
      lineNode?.appearance &&
      (lineNode.appearance.render_order !== undefined ||
        lineNode.appearance.renderOrder !== undefined)
    ) {
      const raw =
        lineNode.appearance.render_order ?? lineNode.appearance.renderOrder;
      const n = Number(raw);
      if (Number.isFinite(n)) renderOrder = n;
    }
    if (renderOrder !== null) {
      obj.renderOrder = renderOrder;
    }

    // structIndex lineProfile から意味情報を userData にコピー
    if (lineProfile) {
      obj.userData.relation = lineProfile.relation || null;
      obj.userData.sense = lineProfile.sense || "a_to_b";
      obj.userData.lineStyle = lineProfile.lineType || "straight";
      obj.userData.lineVisualStyle = lineVisualStyle;
      obj.userData.frames =
        lineProfile.frames instanceof Set ? lineProfile.frames : null;
    } else {
      const sig = lineNode?.signification || {};
      obj.userData.relation = null;
      obj.userData.sense = sig.sense || "a_to_b";
      obj.userData.lineStyle =
        lineNode?.appearance?.line_type || "straight";
      obj.userData.lineVisualStyle = lineVisualStyle;
      obj.userData.frames = null;
    }

    baseStyle.set(uuid, {
      color: color.clone(),
      opacity: material.opacity,
    });

    if (segmentInfo) {
      obj.userData.segment = {
        start: segmentInfo.start.clone(),
        end: segmentInfo.end.clone(),
        dir: segmentInfo.dir.clone(),
        length: segmentInfo.length,
      };
    }

    // glow / pulse 用の二重ハロー帯（flow では使わない）
    if ((isGlow || isPulse) && segmentInfo && segmentInfo.length > 0) {
      const baseOrder =
        typeof obj.renderOrder === "number" && Number.isFinite(obj.renderOrder)
          ? obj.renderOrder
          : 0;

      const { inner, outer } = createHaloMeshesForLine(
        segmentInfo,
        color,
        mergedEffect,
        baseOrder
      );

      if (inner) {
        obj.add(inner);
        obj.userData.haloInner = inner;
      }
      if (outer) {
        obj.add(outer);
        obj.userData.haloOuter = outer;
      }
    }

    // arrow: base が marker 表面に乗るように配置
    if (segmentInfo && segmentInfo.length > 0) {
      const arrowCfg = lineNode?.appearance?.arrow;
      const placement = resolveArrowPlacement(lineNode, arrowCfg);

      if (arrowCfg && placement !== "none") {
        const arrowOpacity = material.opacity;
        const baseOrder =
          typeof obj.renderOrder === "number" &&
          Number.isFinite(obj.renderOrder)
            ? obj.renderOrder
            : 0;

        const arrowA =
          placement === "end_a" || placement === "both"
            ? createArrowMesh(
                arrowCfg,
                color,
                segmentInfo.length,
                arrowOpacity,
                baseOrder
              )
            : null;
        const arrowB =
          placement === "end_b" || placement === "both"
            ? createArrowMesh(
                arrowCfg,
                color,
                segmentInfo.length,
                arrowOpacity,
                baseOrder
              )
            : null;

        if (arrowA) {
          // A 側は B→A 方向に向ける
          positionArrowMesh(
            arrowA,
            segmentInfo.start,
            segmentInfo.dir.clone().multiplyScalar(-1)
          );
          arrowA.userData.uuid = uuid;
          obj.add(arrowA);
        }
        if (arrowB) {
          // B 側は A→B 方向
          positionArrowMesh(arrowB, segmentInfo.end, segmentInfo.dir);
          arrowB.userData.uuid = uuid;
          obj.add(arrowB);
        }
      }
    }

    return obj;
  };

  // ============================================================
  // 3DSS: aux
  // ============================================================

  const createAux = (auxNode) => {
    const uuid = auxNode?.meta?.uuid ?? auxNode?.uuid ?? null;

    // とりあえず汎用的な小さな Box として可視化
    // （将来的に appearance.module / type に応じて切り替え可）
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const color = getColor(auxNode, "#888888");
    const opacity = getOpacity(auxNode, 0.6);

    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
    });

    const obj = new THREE.Mesh(geometry, material);

    const pos = getPointPosition(auxNode); // aux も appearance.position 想定
    obj.position.fromArray(pos);

    obj.userData.uuid = uuid;

    baseStyle.set(uuid, {
      color: material.color ? material.color.clone() : color.clone(),
      opacity: material.opacity,
    });

    return obj;
  };

  // ============================================================
  // 公開 API 群
  // ============================================================

  function recomputeSceneRadius() {
    const box = new THREE.Box3();
    let hasAny = false;

    // points / aux の位置から AABB 作る（lines は point から出てる前提）
    pointObjects.forEach((obj) => {
      box.expandByPoint(obj.position);
      hasAny = true;
    });
    auxObjects.forEach((obj) => {
      box.expandByPoint(obj.position);
      hasAny = true;
    });

    if (!hasAny) {
      sceneRadius = 1;
      sceneCenter.set(0, 0, 0);
    } else {
      box.getCenter(sceneCenter);

      const size = new THREE.Vector3();
      box.getSize(size);
      // 一番長い辺の半分を「シーン半径」とみなす
      const maxEdge = Math.max(size.x, size.y, size.z);
      sceneRadius = maxEdge > 0 ? maxEdge * 0.5 : 1;
    }

    // worldAxes レイヤに sceneRadius を通知
    if (worldAxes && typeof worldAxes.updateMetrics === "function") {
      worldAxes.updateMetrics({ radius: sceneRadius });
    }
  }

  return {
    /**
     * 3DSS document を three.js Scene に同期
     * @param {object} doc 3DSS document
     * @param {Map} indices structIndex（uuid→kind）の予定だが、ここでは必須ではない
     */
    syncDocument: (doc, indices) => {
      clearMaps();

      // structIndex が渡されていれば保持し、points の座標キャッシュもそこから初期化
      currentIndices =
        indices && indices.pointPosition instanceof Map ? indices : null;

      // lineProfile を覚えておく（なければ null）
      lineProfileByUuid =
        currentIndices && currentIndices.lineProfile instanceof Map
          ? currentIndices.lineProfile
          : null;

      pointPositionByUuid =
        currentIndices && currentIndices.pointPosition instanceof Map
          ? new Map(currentIndices.pointPosition)
          : new Map();

      // 半径は structIndex では持っていないので毎回作り直す
      pointRadiusByUuid = new Map();

      // points
      if (Array.isArray(doc?.points)) {
        for (const p of doc.points) {
          const obj = createPoint(p);
          const uuid = getUuid(p);
          if (obj && uuid) {
            pointObjects.set(uuid, obj);
            scene.add(obj);
          }
        }
      }

      // lines
      if (Array.isArray(doc?.lines)) {
        for (const l of doc.lines) {
          const uuid = getUuid(l);
          const profile =
            lineProfileByUuid && uuid ? lineProfileByUuid.get(uuid) : null;

          const obj = createLine(l, profile);
          if (obj && uuid) {
            lineObjects.set(uuid, obj);
            scene.add(obj);
          }
        }
      }

      // aux
      if (Array.isArray(doc?.aux)) {
        for (const a of doc.aux) {
          const obj = createAux(a);
          const uuid = getUuid(a);
          if (obj && uuid) {
            auxObjects.set(uuid, obj);
            scene.add(obj);
          }
        }
      }

      // シーン全体のスケールを更新
      recomputeSceneRadius();

      // points からラベル index を構築し、Sprite 群を再構成
      const labelIndex = buildPointLabelIndex(doc);
      labelRuntime.setPointLabelIndex(labelIndex);
      labelRuntime.rebuild(pointPositionByUuid, pointObjects);

      debugRenderer(
        "[renderer] syncDocument: added",
        pointObjects.size,
        "points,",
        lineObjects.size,
        "lines,",
        auxObjects.size,
        "aux, labels",
        labelRuntime.labelSprites.size
      );
    },

    /**
     * フレーム／フィルタ結果を反映
     *
     * visibleSet は 2 方式どちらも許容：
     *   - 旧: Set<uuid>
     *   - 新: { points:Set<uuid>, lines:Set<uuid>, aux:Set<uuid> }
     */
    applyFrame: (visibleSet) => {
      const isSet = visibleSet instanceof Set;

      const getSetForKind = (kind) => {
        if (!visibleSet) return null;
        if (isSet) return visibleSet; // 旧仕様: 全レイヤ共通 Set
        const set = visibleSet?.[kind];
        return set instanceof Set ? set : null;
      };

      const updateVisibility = (map, kind) => {
        // visibleSet 未指定 → 全部表示（従来互換）
        if (!visibleSet) {
          map.forEach((obj) => {
            obj.visible = true;
          });
          return;
        }

        const set = getSetForKind(kind);

        // visibleSet はあるが、この kind 用 Set が無い
        // → そのレイヤは「全部非表示」に倒す（filter-* OFF 相当）
        if (!set) {
          map.forEach((obj) => {
            obj.visible = false;
          });
          return;
        }

        map.forEach((obj, uuid) => {
          obj.visible = set.has(uuid);
        });
      };

      // kind 別に可視状態を反映
      updateVisibility(pointObjects, "points");
      updateVisibility(lineObjects, "lines");
      updateVisibility(auxObjects, "aux");

      // ラベルは points と同じ可視性に合わせる
      if (!visibleSet) {
        labelSprites.forEach((sprite) => {
          sprite.visible = true;
        });
      } else {
        const pointSet = getSetForKind("points");
        if (!pointSet) {
          labelSprites.forEach((sprite) => {
            sprite.visible = false;
          });
        } else {
          labelSprites.forEach((sprite, uuid) => {
            sprite.visible = pointSet.has(uuid);
          });
        }
      }
    },

    /**
     * cameraState: { theta, phi, distance, target:{x,y,z}, fov }
     * 3DSS には入っていない viewer 側の状態
     */
    updateCamera: (cameraState) => {
      const { theta, phi, distance, target, fov } = cameraState;

      debugRenderer("[renderer] updateCamera in", {
        theta,
        phi,
        distance,
        target,
        fov,
      });

      // Y-up → Z-up への入れ替え
      const x = target.x + distance * Math.sin(phi) * Math.cos(theta);
      const z = target.z + distance * Math.cos(phi); // ← ここが「高さ」
      const y = target.y + distance * Math.sin(phi) * Math.sin(theta);

      camera.position.set(x, y, z);
      camera.up.set(0, 0, 1); // ← up ベクトルも Z+ に

      camera.lookAt(new THREE.Vector3(target.x, target.y, target.z));

      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      const aspect = canvas.clientWidth / canvas.clientHeight;
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      }

      debugRenderer("[renderer] updateCamera out", {
        pos: camera.position.toArray(),
        up: camera.up.toArray(),
      });
    },

    /**
     * microState に応じて focus / connection / bounds などをハイライト
     *
     * microState: {
     *   focusUuid: string,
     *   kind: "points" | "lines" | "aux",
     *   focusPosition: [number, number, number],
     *   relatedUuids: string[],
     *   localBounds: {
     *     center: [number, number, number],
     *     size:   [number, number, number],
     *   } | null,
     * }
     *
     * microState + cameraState を microFX に渡す
     */
    applyMicroFX: (microState, cameraState, visibleSet) => {
      // まずラベル側のマイクロ演出
      labelRuntime.applyMicroFX(microState);

      applyMicroFXImpl(
        scene,
        microState,
        cameraState,
        {
          points: pointObjects,
          lines: lineObjects,
          aux: auxObjects,
          baseStyle,
          camera,
          // （必要なら microFX 側でも参照できるように渡しておく）
          labels: labelRuntime.labelSprites,
        },
        visibleSet
      );
    },

    // ----------------------------------------------------------
    // selection ハイライト（macro 専用）: 状態だけ保持
    // ----------------------------------------------------------

    clearAllHighlights: () => {
      lineEffects.clearAllHighlights();
    },

    setHighlight: ({ uuid, level = 1 } = {}) => {
      lineEffects.setHighlight({ uuid, level });
    },

    // 互換用 – 旧 selectionState: { uuid } を level=1 で扱う
    applySelection: (selectionState) => {
      lineEffects.applySelection(selectionState);
    },

    /**
     * NDC 座標（-1〜+1）から Raycast して uuid を返す
     */
    pickObjectAt: (ndcX, ndcY) => {
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

      raycaster.params.Line = raycaster.params.Line || {};
      raycaster.params.Line.threshold = 0.15;

      const intersects = raycaster.intersectObjects(scene.children, true);
      const hit = intersects.find(
        (i) => i.object && i.object.userData && i.object.userData.uuid
      );
      if (!hit) return null;
      return {
        uuid: hit.object.userData.uuid,
        distance: hit.distance,
        point: hit.point.clone(),
      };
    },

    render: () => {
      debugRenderer("[renderer] render", {
        children: scene.children.length,
        camPos: camera.position.toArray(),
      });

      // flow / pulse / glow エフェクト更新
      lineEffects.updateLineEffects();

      renderer.render(scene, camera);
    },

    // カメラ初期化や UI 用に、シーンの中心と半径を渡す
    getSceneMetrics: () => ({
      radius: sceneRadius,
      center: sceneCenter.clone(),
    }),

    // ワールド軸の表示制御（worldAxes レイヤへの薄いラッパ）
    setWorldAxesVisible: (flag) => {
      if (worldAxes && typeof worldAxes.setVisible === "function") {
        worldAxes.setVisible(flag);
      }
    },

    toggleWorldAxes: () => {
      if (worldAxes && typeof worldAxes.toggle === "function") {
        worldAxes.toggle();
      }
    },
  };
}
