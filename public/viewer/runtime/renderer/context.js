// viewer/runtime/renderer/context.js
import * as THREE from "../../../vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl } from "./microFX/index.js";
import { labelConfig } from "./labels/labelConfig.js";
import { buildPointLabelIndex } from "../core/labelModel.js";
import { createWorldAxesLayer } from "./worldAxes.js"; 

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_RENDERER = false; // 開発中だけ true にする
function debugRenderer(...args) {
  if (!DEBUG_RENDERER) return;
  console.log(...args);
}

// 3DSS / プロト両対応のユーティリティ
// （createPoint / createLine / createAux / getPointPosition から参照）
function getUuid(node) {
  if (!node) return null;
  return node?.meta?.uuid ?? node?.uuid ?? null;
}

// 3DSS / プロト両対応のユーティリティ
// structIndex があれば indices.pointPosition を優先して座標を返す
function getPointPosition(node, indices) {
  const uuid = getUuid(node);

  // 1) structIndex 優先（正規化済みの座標）
  if (
    uuid &&
    indices &&
    indices.pointPosition instanceof Map &&
    indices.pointPosition.has(uuid)
  ) {
    return indices.pointPosition.get(uuid);
  }

  // 2) 3DSS 正式: appearance.position: [x,y,z]
  if (
    Array.isArray(node?.appearance?.position) &&
    node.appearance.position.length === 3
  ) {
    return node.appearance.position;
  }

  // 3) プロト互換: position: [x,y,z]
  if (Array.isArray(node?.position) && node.position.length === 3) {
    return node.position;
  }

  return [0, 0, 0];
}

function getColor(node, fallback = "#ffffff") {
  const c =
    node?.appearance?.color ??
    node?.color ??
    fallback;
  return new THREE.Color(c);
}

function getOpacity(node, fallback = 1.0) {
  const o =
    node?.appearance?.opacity ??
    node?.opacity;
  return typeof o === "number" ? o : fallback;
}

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

  const pointObjects = new Map(); // uuid -> THREE.Mesh（point）
  const lineObjects  = new Map(); // uuid -> THREE.Line / LineSegments
  const auxObjects   = new Map(); // uuid -> THREE.Object3D
  const baseStyle    = new Map(); // uuid -> { color: THREE.Color, opacity: number }
  let   pointLabelIndex = new Map(); // uuid -> { text, size, font, align, plane }
  const labelSprites    = new Map(); // uuid -> THREE.Sprite

  // シーンメトリクス（この viewer インスタンス内で共有）
  // シーンメトリクス（この viewer インスタンス内で共有）
  let sceneRadius = 1;
  const sceneCenter = new THREE.Vector3(0, 0, 0);


  const lookupByUuid = (uuid) =>
    pointObjects.get(uuid) || lineObjects.get(uuid) || auxObjects.get(uuid);

  const raycaster = new THREE.Raycaster();

  // この renderer インスタンスに紐づく structIndex（あれば）
  let currentIndices = null;

  // 3DSS points の位置キャッシュ（line の end_a/end_b 参照用）
  //   - position: [x,y,z]
  //   - radius:   SphereGeometry の半径（代表半径）
  let pointPositionByUuid = new Map();
  let pointRadiusByUuid   = new Map();

  const clearMaps = () => {
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
    pointRadiusByUuid   = new Map();
    currentIndices = null;

    // ラベル Sprite も掃除
    for (const sprite of labelSprites.values()) {
      scene.remove(sprite);
    }
    labelSprites.clear();
    pointLabelIndex = new Map();
  };

  // ------------------------------------------------------------
  // ラベル描画: CanvasTexture + Sprite / Plane
  // （実際のスカラー値は labelConfig に退避）
  // ------------------------------------------------------------

  function createLabelSprite(label, basePosition) {
    if (!label || !label.text) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 「論理フォントサイズ」（world 上の高さに対応）
    // 3DSS 上では unitless な「論理ラベルサイズ」
    const logicalSize =
      typeof label.size === "number" ? label.size : labelConfig.baseLabelSize;

    // 実際にラスタライズするフォント px は supersample 倍
    // Canvas2D に描くときだけ px に落とし込む

    const fontPx = Math.max(
      labelConfig.raster.minFontPx,
      Math.min(
        logicalSize * labelConfig.raster.supersamplePx,
        labelConfig.raster.maxFontPx
      )
    );

    const basePadding = labelConfig.raster.padding ?? 0;
    const outlinePadding =
      (labelConfig.outline && labelConfig.outline.extraPaddingPx) || 0;
    const padding = basePadding + outlinePadding;

    const fontFamily = labelConfig.raster.fontFamily;
    ctx.font = `${fontPx}px ${fontFamily}`;

    const metrics    = ctx.measureText(label.text);
    const textWidth  = metrics.width;
    const textHeight = fontPx;

    canvas.width  = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(textHeight + padding * 2);

    // サイズ変更後に state がリセットされるので再設定
    ctx.font = `${fontPx}px ${fontFamily}`;
    ctx.textBaseline = "top";

    // 背景
    if (labelConfig.background.enabled) {
      ctx.fillStyle = labelConfig.background.fillStyle;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // 背景プレートを使わない場合は一旦クリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // アウトライン（縁取り）
    if (labelConfig.outline && labelConfig.outline.enabled) {
      ctx.lineWidth = labelConfig.outline.widthPx ?? 4;
      ctx.strokeStyle =
        labelConfig.outline.color || "rgba(0, 0, 0, 0.95)";
      ctx.lineJoin = labelConfig.outline.lineJoin || "round";

      // 先に縁取りを描く
      ctx.strokeText(label.text, padding, padding);
    }

    // 本体の文字
    ctx.fillStyle = labelConfig.text.fillStyle;
    ctx.fillText(label.text, padding, padding);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // ★ world 上の高さは「unitless な論理サイズ」から計算する
    const worldScale = logicalSize / labelConfig.baseLabelSize;
    const worldHeight = labelConfig.world.baseHeight * worldScale;
    const aspect = canvas.width / canvas.height;

// plane モードを解釈
//  - "billboard" / "screen" → 画面向き（メタ用途）
//  - それ以外（未指定含む） → world 平面（xy / yz / zx）
//    未知値は zx にフォールバック
const rawPlane = label.plane;
let plane;

// 互換のため "screen" は "billboard" の別名扱い
if (rawPlane === "screen" || rawPlane === "billboard") {
  plane = "billboard";
} else if (rawPlane === "xy" || rawPlane === "yz" || rawPlane === "zx") {
  plane = rawPlane;
} else {
  // 未指定 or 想定外 → 静的存在として zx に貼る
  plane = "zx";
}

let obj;

if (plane === "billboard") {
  // 画面向き（ビルボード）
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  obj = new THREE.Sprite(material);
  obj.scale.set(worldHeight * aspect, worldHeight, 1);
} else {
  // ワールド平面貼り付け
  const geom = new THREE.PlaneGeometry(
    worldHeight * aspect,
    worldHeight
  );
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  obj = new THREE.Mesh(geom, material);

  switch (plane) {
    case "xy": // Z+ を向く
      obj.rotation.set(0, 0, 0);
      break;
    case "yz": // X+ を向く
      obj.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      break;
    case "zx": // Y+ を向く（静的な存在のデフォ）
      obj.rotation.set(-Math.PI / 2, 0, Math.PI);
      break;
    default:
      // ここには来ない想定やけど、保険で zx
      obj.rotation.set(-Math.PI / 2, 0, Math.PI);
      break;
  }
}


    const pos = Array.isArray(basePosition) ? basePosition : [0, 0, 0];
    obj.position.set(
      pos[0],
      pos[1] + worldHeight * (labelConfig.world.offsetYFactor ?? 0),
      pos[2]
    );

    // pickObjectAt からは無視
    obj.userData.label = label;

    // ラベルの「論理サイズ」とテクスチャ解像度を記録しておく
    obj.userData.logicalSize = logicalSize;
    obj.userData.texHeightPx = canvas.height;

    // microFX 用ベース値
    obj.userData.baseScale = obj.scale.clone();
    const mat = obj.material;
    obj.userData.baseOpacity =
      mat && typeof mat.opacity === "number" ? mat.opacity : 1.0;

    return obj;
  }

  function rebuildLabelSprites() {
    // 既存ラベルを一旦掃除
    for (const sprite of labelSprites.values()) {
      scene.remove(sprite);
    }
    labelSprites.clear();

    if (!pointLabelIndex || pointLabelIndex.size === 0) return;

    for (const [uuid, label] of pointLabelIndex.entries()) {
      const basePos =
        pointPositionByUuid.get(uuid) ||
        pointObjects.get(uuid)?.position?.toArray() ||
        [0, 0, 0];

      const sprite = createLabelSprite(label, basePos);
      if (!sprite) continue;

      labelSprites.set(uuid, sprite);
      scene.add(sprite);
    }
  }

  // ------------------------------------------------------------
  // microState とラベルの連携（「何親等」ごとに徐々に暗くする）
  // ------------------------------------------------------------
  function applyLabelMicroFX(microState) {
    if (!labelSprites || labelSprites.size === 0) return;

    // microState 無し → スケール／濃さだけベース状態に戻す
    // visible は frame 側に任せて触らない
    if (!microState) {
      labelSprites.forEach((obj) => {
        const baseScale =
          obj.userData.baseScale instanceof THREE.Vector3
            ? obj.userData.baseScale
            : obj.scale;
        const baseOpacity =
          typeof obj.userData.baseOpacity === "number"
            ? obj.userData.baseOpacity
            : obj.material && typeof obj.material.opacity === "number"
            ? obj.material.opacity
            : 1.0;

        obj.scale.copy(baseScale);
        if (obj.material && typeof baseOpacity === "number") {
          obj.material.opacity = baseOpacity;
        }
      });
      return;
    }

    const { focusUuid, degreeByUuid, relatedUuids } = microState;

    // degree 情報が無い場合は、従来どおり「focus+related 強調」にフォールバック
    const hasDegree =
      degreeByUuid && typeof degreeByUuid === "object";

    // 親等ごとの減衰テーブル（必要ならあとでチューニング）
    // idx = degree（0〜）
    const DEGREE_ALPHA = [1.0, 0.7, 0.4, 0.15]; // 3親等以降は 0.15 で頭打ち
    const DEGREE_SCALE = [1.2, 1.0, 0.95, 0.9]; // 0 親等だけ少し大きく

    labelSprites.forEach((obj, uuid) => {
      const baseScale =
        obj.userData.baseScale instanceof THREE.Vector3
          ? obj.userData.baseScale
          : obj.scale;
      const baseOpacity =
        typeof obj.userData.baseOpacity === "number"
          ? obj.userData.baseOpacity
          : obj.material && typeof obj.material.opacity === "number"
          ? obj.material.opacity
          : 1.0;

      // frame 側の可視状態を尊重
      const frameVisible = obj.visible;

      let degree = Infinity;

      if (hasDegree && uuid in degreeByUuid) {
        degree = degreeByUuid[uuid];
      } else if (!hasDegree) {
        // フォールバック: focus / related / その他 で３段階に割り振る
        if (focusUuid && uuid === focusUuid) {
          degree = 0;
        } else if (
          Array.isArray(relatedUuids) &&
          relatedUuids.includes(uuid)
        ) {
          degree = 1;
        } else {
          degree = 3;
        }
      }

      const clampedDegree =
        Number.isFinite(degree)
          ? Math.max(0, Math.min(degree, DEGREE_ALPHA.length - 1))
          : DEGREE_ALPHA.length - 1;

      const alphaFactor = DEGREE_ALPHA[clampedDegree];
      const scaleFactor = DEGREE_SCALE[clampedDegree];

      // 「何親等まで見せるか」ポリシー（例: 3 親等まで）
      const MAX_VISIBLE_DEGREE = 3;
      const visibleByDegree =
        Number.isFinite(degree) ? degree <= MAX_VISIBLE_DEGREE : false;

      obj.visible = frameVisible && visibleByDegree;

      // 完全に隠すものはここで終わり
      if (!obj.visible) {
        obj.scale.copy(baseScale);
        if (obj.material) obj.material.opacity = baseOpacity;
        return;
      }

      // スケールと透明度を degree に応じて変える
      obj.scale.set(
        baseScale.x * scaleFactor,
        baseScale.y * scaleFactor,
        baseScale.z
      );

      if (obj.material) {
        obj.material.opacity = baseOpacity * alphaFactor;
      }
    });
  }

  // ---------- 3DSS: points ----------
  // 3DSS v1.0.2: appearance.marker.primitive 別にジオメトリと「代表半径」を決める
  const createPoint = (pointNode) => {
    const uuid = getUuid(pointNode);
    if (!uuid) return null;

    // 位置（structIndex 優先）
    const posArr = getPointPosition(pointNode, currentIndices);
    const pos = Array.isArray(posArr) && posArr.length === 3 ? posArr : [0, 0, 0];

    const marker = pointNode?.appearance?.marker || {};
    const common = marker.common || {};

    // 共通スタイル
    const color =
      common.color
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
        // three.js の ConeGeometry はデフォルトで [-h/2, +h/2] に分布して原点中心
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

  // ------------------------------------------------------------
  // line 端点の補正と arrow 用ヘルパ
  //   - resolveLineEndpoint:
  //       end.{ref|coord} から「端点座標＋代表半径」を取得
  //   - computeTrimmedSegment:
  //       2 つの端点と半径から「marker の表面で止まる線分」を計算
  //   - arrow:
  //       base を marker 表面に置き、外向きにだけ伸びる
  // ------------------------------------------------------------

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
      const p = pointPositionByUuid.get(refUuid);
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

  function createArrowMesh(arrowCfg, color, segmentLength) {
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
        const fallbackLen = Math.max(0.03, Math.min(segmentLength * 0.2, 0.5));
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

    const material = new THREE.MeshBasicMaterial({
      color: color.clone ? color.clone() : new THREE.Color(color),
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 5;
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

  // ---------- 3DSS: lines ----------
  const createLine = (lineNode) => {
    const uuid = getUuid(lineNode);

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

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    });

    const obj = new THREE.Line(geometry, material);
    obj.userData.uuid = uuid;

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

    // arrow: base が marker 表面に乗るように配置
    if (segmentInfo && segmentInfo.length > 0) {
      const arrowCfg = lineNode?.appearance?.arrow;
      const placement = resolveArrowPlacement(lineNode, arrowCfg);

      if (arrowCfg && placement !== "none") {
        const arrowA =
          placement === "end_a" || placement === "both"
            ? createArrowMesh(arrowCfg, color, segmentInfo.length)
            : null;
        const arrowB =
          placement === "end_b" || placement === "both"
            ? createArrowMesh(arrowCfg, color, segmentInfo.length)
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

  // ---------- 3DSS: aux ----------
  const createAux = (auxNode) => {
    const uuid =
      auxNode?.meta?.uuid ??
      auxNode?.uuid ??
      null;

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
      color: color.clone(),
      opacity: material.opacity,
    });

    return obj;
  };

  // ------------------------------------------------------------
  // selection ハイライト用ヘルパ
  //  - restoreBaseStyle(): baseStyle から全オブジェクトを元の色・opacity に戻す
  //  - highlightUuid(uuid, level): 対象 1 要素だけを少しだけ持ち上げる
  // ------------------------------------------------------------
  function restoreBaseStyle() {
    baseStyle.forEach((style, uuid) => {
      const obj = lookupByUuid(uuid);
      if (!obj) return;

      const mat = obj.material;
      if (!mat) return;

      // color
      if (style.color && mat.color) {
        mat.color.copy(style.color);
      }

      // opacity
      if (typeof style.opacity === "number") {
        mat.opacity = style.opacity;
        if ("transparent" in mat) {
          mat.transparent = mat.opacity < 1.0;
        }
      }

      mat.needsUpdate = true;
    });
  }

  function highlightUuid(uuid, level = 1) {
    if (!uuid) return;

    const obj = lookupByUuid(uuid);
    const base = baseStyle.get(uuid);
    if (!obj || !obj.material || !base) return;

    const mat = obj.material;
    const baseOpacity =
      typeof base.opacity === "number" ? base.opacity : mat.opacity;

    // level に応じた持ち上げ量（あんまり派手にしない）
    const opacityBoost = level === 2 ? 0.35 : 0.2;
    mat.opacity = Math.min(1.0, baseOpacity + opacityBoost);
    if ("transparent" in mat) {
      mat.transparent = mat.opacity < 1.0;
    }

    if (base.color && mat.color) {
      // 明度だけちょっと上げる
      const hsl = { h: 0, s: 0, l: 0 };
      base.color.getHSL(hsl);
      const lightBoost = level === 2 ? 0.25 : 0.18;
      hsl.l = Math.min(1.0, hsl.l + lightBoost);

      const tmp = base.color.clone();
      tmp.setHSL(hsl.h, hsl.s, hsl.l);
      mat.color.copy(tmp);
    }

    mat.needsUpdate = true;
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
          const obj = createLine(l);
          const uuid = getUuid(l);
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
      pointLabelIndex = buildPointLabelIndex(doc);
      rebuildLabelSprites();

      debugRenderer(
        "[renderer] syncDocument: added",
        pointObjects.size, "points,",
        lineObjects.size, "lines,",
        auxObjects.size, "aux, labels",
        pointLabelIndex.size
      );
    },

    /**
     * visibleSet: Set<uuid> を受け取り、各オブジェクトの visible を更新
     */
    applyFrame: (visibleSet) => {
      const updateVisibility = (map) => {
        map.forEach((obj, uuid) => {
          if (!visibleSet) {
            obj.visible = true;
          } else {
            obj.visible = visibleSet.has(uuid);
          }
        });
      };
      updateVisibility(pointObjects);
      updateVisibility(lineObjects);
      updateVisibility(auxObjects);
      // ラベルも対象 point と同じ visibility に合わせる
      if (visibleSet) {
        labelSprites.forEach((sprite, uuid) => {
          sprite.visible = visibleSet.has(uuid);
        });
      } else {
        labelSprites.forEach((sprite) => {
          sprite.visible = true;
        });
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
  const z = target.z + distance * Math.cos(phi);              // ← ここが「高さ」
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
     *
     * microState + cameraState を microFX に渡す
     */
    applyMicroFX: (microState, cameraState, visibleSet) => {
      // まずラベル側のマイクロ演出
      applyLabelMicroFX(microState);
      applyMicroFXImpl(
        scene,
        microState,
        cameraState,
        {
          points: pointObjects,
          lines:  lineObjects,
          aux:    auxObjects,
          baseStyle,
         camera,
          // （必要なら microFX 側でも参照できるように渡しておく）
          labels: labelSprites,
        },
        visibleSet
      );
    },
    
    /**
     * selection ハイライト（macro 専用想定）のための API 群
     *
     * - clearAllHighlights():
     *     baseStyle に全オブジェクトを戻す。
     * - setHighlight({ uuid, level }):
     *     いったん clear した上で、その uuid だけ少しだけ強調。
     *
     * これらは「モードを知らない」素の描画 API。
     * macro / micro の切り替えは selectionController / modeController から制御する。
     */
    clearAllHighlights: () => {
      restoreBaseStyle();
    },

    setHighlight: ({ uuid, level = 1 } = {}) => {
      restoreBaseStyle();
      if (uuid) {
        highlightUuid(uuid, level);
      }
    },

    /**
     * 互換用の簡易 API。
     *
     * 互換用 – 新ルートは selectionController + setHighlight/clearAllHighlights
    */
    applySelection: (selectionState) => {
      if (!selectionState || !selectionState.uuid) {
        restoreBaseStyle();
        return;
      }
      restoreBaseStyle();
      highlightUuid(selectionState.uuid, 1);
    },




    /**
     * NDC 座標（-1〜+1）から Raycast して uuid を返す
     */
    pickObjectAt: (ndcX, ndcY) => {
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

      raycaster.params.Line = raycaster.params.Line || {};
      raycaster.params.Line.threshold = 0.15;  // ← これ重要

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
      renderer.render(scene, camera);
    },

    // ★ カメラ初期化や UI 用に、シーンの中心と半径を渡す
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

    // ★ worldAxes レイヤに sceneRadius を通知
    if (worldAxes && typeof worldAxes.updateMetrics === "function") {
      worldAxes.updateMetrics({ radius: sceneRadius });
    }
  }
}
