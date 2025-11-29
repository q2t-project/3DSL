// viewer/runtime/renderer/context.js
import * as THREE from "../../../vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl } from "./microFX/index.js";
import { buildPointLabelIndex } from "../core/labelModel.js";

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_RENDERER = false; // 開発中だけ true にする
function debugRenderer(...args) {
  if (!DEBUG_RENDERER) return;
  console.log(...args);
}

// 3DSS / プロト両対応のユーティリティ
function getUuid(node) {
  return node?.meta?.uuid ?? node?.uuid ?? null;
}

function getPointPosition(node) {
  // 3DSS 正式: appearance.position: [x,y,z]
  if (Array.isArray(node?.appearance?.position) && node.appearance.position.length === 3) {
    return node.appearance.position;
  }
  // プロト互換: position: [x,y,z]
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

function getPointSize(node, fallback = 0.06) {
  const s =
    node?.appearance?.size ??
    node?.size;
  return typeof s === "number" ? s : fallback;
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

  const pointObjects = new Map(); // uuid -> THREE.Mesh（point）
  const lineObjects  = new Map(); // uuid -> THREE.Line / LineSegments
  const auxObjects   = new Map(); // uuid -> THREE.Object3D
  const baseStyle    = new Map(); // uuid -> { color: THREE.Color, opacity: number }
  let   pointLabelIndex = new Map(); // uuid -> { text, size, font, align, plane }
  const labelSprites    = new Map(); // uuid -> THREE.Sprite

  // シーンメトリクス（この viewer インスタンス内で共有）
  let sceneRadius = 1;
  const sceneCenter = new THREE.Vector3(0, 0, 0);
  const lookupByUuid = (uuid) =>
    pointObjects.get(uuid) || lineObjects.get(uuid) || auxObjects.get(uuid);

  const raycaster = new THREE.Raycaster();

  // 3DSS points の位置キャッシュ（line の end_a/end_b 参照用）
  let pointPositionByUuid = new Map();

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

    // ラベル Sprite も掃除
    for (const sprite of labelSprites.values()) {
      scene.remove(sprite);
    }
    labelSprites.clear();
    pointLabelIndex = new Map();
  };

  // ------------------------------------------------------------
  // ラベル描画: CanvasTexture + Sprite / Plane
  // ------------------------------------------------------------

  // unitless な「論理ラベルサイズ」基準値
  // 3DSS の label.size=8 を「標準サイズ=1.0」とみなす
  const LABEL_BASE_LABEL_SIZE   = 8;

  // Canvas2D にラスタライズするときの実ピクセル数の制約
  const LABEL_MIN_FONT_PX       = 0.125; // 画面上のフォント px 下限
  const LABEL_MAX_FONT_PX       = 256;   // 画面上のフォント px 上限

  // 「1 論理サイズあたり何 px で描くか」という supersample 係数
  const LABEL_SUPERSAMPLE_PX    = 3;
  
  const LABEL_BASE_WORLD_HEIGHT = 0.25; // 8px のときのワールド高さ
  const LABEL_OFFSET_Y_FACTOR   = 0.0;  // その高さに対するオフセット

  function createLabelSprite(label, basePosition) {
    if (!label || !label.text) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 「論理フォントサイズ」（world 上の高さに対応）
    // 3DSS 上では unitless な「論理ラベルサイズ」
    const logicalSize =
      typeof label.size === "number" ? label.size : LABEL_BASE_LABEL_SIZE;

    // 実際にラスタライズするフォント px は supersample 倍
    // Canvas2D に描くときだけ px に落とし込む
    const fontPx = Math.max(
      LABEL_MIN_FONT_PX,
      Math.min(logicalSize * LABEL_SUPERSAMPLE_PX, LABEL_MAX_FONT_PX)
    );
    const padding = 4;

    const fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.font = `${fontPx}px ${fontFamily}`;

    const metrics    = ctx.measureText(label.text);
    const textWidth  = metrics.width;
    const textHeight = fontPx;

    canvas.width  = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(textHeight + padding * 2);

    // サイズ変更後に state がリセットされるので再設定
    ctx.font = `${fontPx}px ${fontFamily}`;
    ctx.textBaseline = "top";

    // 背景（半透明の黒）
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 文字色（とりあえず白固定）
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label.text, padding, padding);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // ★ world 上の高さは「unitless な論理サイズ」から計算する
    const worldScale = logicalSize / LABEL_BASE_LABEL_SIZE;
    const worldHeight = LABEL_BASE_WORLD_HEIGHT * worldScale;
    const aspect = canvas.width / canvas.height;

    // plane モードを解釈
    const plane = label.plane || "screen"; // "screen" | "xy" | "yz" | "xz" など

    let obj;

    if (plane === "screen" || plane === "billboard") {
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

      // 面の向き
      switch (plane) {
        case "xy": // Z+ を向く
          obj.rotation.set(0, 0, 0);
          break;
        case "yz": // X+ を向く
          obj.rotation.set(Math.PI / 2, Math.PI / 2, 0);
          break;
        case "zx": // Y+ を向く
          obj.rotation.set(-Math.PI / 2, 0, Math.PI);
          break;
        default:
          // 想定外はとりあえず画面向きに近い向き
          obj.rotation.set(0, 0, 0);
          break;
      }
    }

    const pos = Array.isArray(basePosition) ? basePosition : [0, 0, 0];
    obj.position.set(
      pos[0],
      pos[1] + worldHeight * LABEL_OFFSET_Y_FACTOR,
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
  const createPoint = (pointNode) => {
    const uuid = getUuid(pointNode);
    if (!uuid) return null;

    const pos = getPointPosition(pointNode);
    const size = getPointSize(pointNode, 0.06);
    const geometry = new THREE.SphereGeometry(size, 16, 16);

    const color = getColor(pointNode, "#ffffff");
    const opacity = getOpacity(pointNode, 1.0);

    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
    });

    const obj = new THREE.Mesh(geometry, material);
    obj.position.fromArray(pos);
    obj.userData.uuid = uuid;

    baseStyle.set(uuid, {
      color: color.clone(),
      opacity: material.opacity,
    });

    // line 用に position をキャッシュ
    pointPositionByUuid.set(uuid, pos);

    return obj;
  };

  // ---------- 3DSS: lines ----------
  const createLine = (lineNode) => {
    const uuid = getUuid(lineNode);
    if (!uuid) return null;

    let positions = null;

    // 3DSS 正式: appearance.end_a.ref / end_b.ref → points の座標を参照
    const refA = lineNode?.appearance?.end_a?.ref;
    const refB = lineNode?.appearance?.end_b?.ref;

    if (typeof refA === "string" && typeof refB === "string") {
      const posA = pointPositionByUuid.get(refA);
      const posB = pointPositionByUuid.get(refB);
      if (posA && posB) {
        positions = [...posA, ...posB];
      }
    }

    // プロト互換: vertices: [[x,y,z],[x,y,z],...]
    if (!positions && Array.isArray(lineNode?.vertices)) {
      const flat = [];
      for (const v of lineNode.vertices) {
        if (Array.isArray(v) && v.length === 3) {
          flat.push(v[0], v[1], v[2]);
        }
      }
      if (flat.length >= 6) {
        positions = flat;
      }
    }

    // データが足りなければ描かない
    if (!positions) return null;

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

    return obj;
  };

  // ---------- 3DSS: aux ----------
  const createAux = (auxNode) => {
    const uuid = getUuid(auxNode);
    if (!uuid) return null;

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

  return {
    /**
     * 3DSS document を three.js Scene に同期
     * @param {object} doc 3DSS document
     * @param {Map} indices structIndex（uuid→kind）の予定だが、ここでは必須ではない
     */
    syncDocument: (doc, indices) => {
      clearMaps();

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
    applyMicroFX: (microState, cameraState) => {
      // まずラベル側のマイクロ演出
      applyLabelMicroFX(microState);

      applyMicroFXImpl(scene, microState, cameraState, {
        points: pointObjects,
        lines:  lineObjects,
        aux:    auxObjects,
        baseStyle,
        camera,
        // （必要なら microFX 側でも参照できるように渡しておく）
        labels: labelSprites,
      });
    },
    
    /**
     * selectionState: {kind?, uuid} | null
     *
     * - まず全オブジェクトの color/opacity を baseStyle にリセット
     * - 選択中オブジェクトだけ opacity を少しだけ持ち上げる
     *
     * mode（macro/meso/micro）には依存せず、常に
     * 「選択されているものがほんの少し目立つ」ようにしておく。
     */
    applySelection: (selectionState) => {
      // 1) 全オブジェクトを baseStyle に戻す
      baseStyle.forEach((style, uuid) => {
        const obj = lookupByUuid(uuid);
        if (!obj || !obj.material || !("opacity" in obj.material)) return;

        // opacity
        if (typeof style.opacity === "number") {
          obj.material.opacity = style.opacity;
        }

        // color
        if (style.color && obj.material.color) {
          obj.material.color.copy(style.color);
        }
      });

      // selection が無ければここで終わり
      if (!selectionState || !selectionState.uuid) return;

      const selUuid = selectionState.uuid;
      const obj = lookupByUuid(selUuid);
      const base = baseStyle.get(selUuid);

      if (!obj || !obj.material || !base) return;

      // 選択中だけ少しだけ持ち上げる
      const baseOpacity =
        typeof base.opacity === "number" ? base.opacity : obj.material.opacity;

      obj.material.opacity = Math.min(1, baseOpacity + 0.2);
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
      return;
    }

    box.getCenter(sceneCenter);

    const size = new THREE.Vector3();
    box.getSize(size);
    // 一番長い辺の半分を「シーン半径」とみなす
    const maxEdge = Math.max(size.x, size.y, size.z);
    sceneRadius = maxEdge > 0 ? maxEdge * 0.5 : 1;
  }
}

