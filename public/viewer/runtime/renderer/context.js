// viewer/runtime/renderer/context.js
import * as THREE from "../../../vendor/three/build/three.module.js";
import { applyMicroFX } from "./microFX/index.js";

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_RENDERER = true; // 本番で静かにしたければ false
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

  const pointObjects = new Map(); // uuid -> THREE.Points
  const lineObjects  = new Map(); // uuid -> THREE.Line / LineSegments
  const auxObjects   = new Map(); // uuid -> THREE.Object3D
  const baseStyle    = new Map(); // uuid -> { color: THREE.Color, opacity: number }

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
  };

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
      debugRenderer(
        "[renderer] syncDocument: added",
        pointObjects.size, "points,",
        lineObjects.size, "lines,",
        auxObjects.size, "aux"
      );
    },

    /**
     * visibleSet: Set<uuid> を受け取り、各オブジェクトの visible を更新
     */
    applyFrame: (visibleSet) => {
      const updateVisibility = (map) => {
        map.forEach((obj, uuid) => {
          obj.visible = visibleSet ? visibleSet.has(uuid) : true;
        });
      };
      updateVisibility(pointObjects);
      updateVisibility(lineObjects);
      updateVisibility(auxObjects);
    },

    /**
     * cameraState: { theta, phi, distance, target:{x,y,z}, fov }
     * 3DSS には入っていない viewer 側の状態
     */
    updateCamera: (cameraState) => {
      const { theta, phi, distance, target, fov } = cameraState;

      const x = target.x + distance * Math.sin(phi) * Math.cos(theta);
      const y = target.y + distance * Math.cos(phi);
      const z = target.z + distance * Math.sin(phi) * Math.sin(theta);

      camera.position.set(x, y, z);
      camera.up.set(0, 1, 0);
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
      applyMicroFX(scene, microState, cameraState, {
        points: pointObjects,
        lines:  lineObjects,
        aux:    auxObjects,
        baseStyle,
        camera,
      });
    },

    /**
     * selectionState: {kind, uuid}
     * 選択要素に軽いハイライトを別途上乗せしてもよい
     */
    applySelection: (selectionState) => {
      if (!selectionState || !selectionState.uuid) return;
      const uuid = selectionState.uuid;
      const obj =
        pointObjects.get(uuid) ||
        lineObjects.get(uuid) ||
        auxObjects.get(uuid);

      if (obj && obj.material && "opacity" in obj.material) {
        obj.material.opacity = Math.min(
          1,
          (obj.material.opacity ?? 1) + 0.2
        );
      }
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
      renderer.render(scene, camera);
    },
  };
}