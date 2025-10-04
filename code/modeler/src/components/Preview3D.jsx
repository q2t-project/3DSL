import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function createNodeMesh(node) {
  const color = new THREE.Color(node.color ?? '#808080');
  const size = node.size ?? 1;
  let geometry;
  switch (node.shape) {
    case 'cube':
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size, 16);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size * 0.5, size, 16);
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(size, size);
      break;
    case 'sphere':
    default:
      geometry = new THREE.SphereGeometry(size * 0.5, 24, 16);
      break;
  }
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(node.position ?? [0, 0, 0]);
  mesh.userData = { type: 'nodes', id: node.id };
  return mesh;
}

function createEdgeObject(edge, nodeLookup) {
  const source = nodeLookup.get(edge.source);
  const target = nodeLookup.get(edge.target);
  if (!source || !target) return null;
  const start = new THREE.Vector3().fromArray(source.position ?? [0, 0, 0]);
  const end = new THREE.Vector3().fromArray(target.position ?? [0, 0, 0]);
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const color = edge.color ?? edge.style?.color ?? '#000000';
  const dashed = edge.style?.dash && edge.style.dash !== 'solid';
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 1, gapSize: 0.5 })
    : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  if (dashed) {
    line.computeLineDistances();
  }
  line.userData = { type: 'edges', source: edge.source, target: edge.target };

  const group = new THREE.Group();
  group.add(line);
  if (edge.directed === 'true' || edge.directed === 'both') {
    const arrow = createArrow(end.clone().sub(start).normalize(), end, color);
    if (arrow) group.add(arrow);
  }
  if (edge.directed === 'both') {
    const arrowBack = createArrow(start.clone().sub(end).normalize(), start, color);
    if (arrowBack) group.add(arrowBack);
  }
  return group;
}

function createArrow(direction, position, color) {
  const coneGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
  const material = new THREE.MeshStandardMaterial({ color });
  const cone = new THREE.Mesh(coneGeometry, material);
  const axis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.clone().normalize());
  cone.quaternion.copy(quaternion);
  cone.position.copy(position);
  return cone;
}

function createLabelSprite(label, fallback = {}) {
  const text = label?.text ?? fallback.text ?? '';
  if (!text) return null;

  const fontSize = label?.fontSize ?? fallback.fontSize ?? 16;
  if (!fontSize || fontSize < 6) return null;

  const color = label?.color ?? fallback.color ?? '#ffffff';
  const background = label?.background ?? fallback.background ?? 'rgba(0,0,0,0.4)';
  const padding = Math.max(4, Math.floor(fontSize * 0.25));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${fontSize}px 'Segoe UI', sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize + padding * 2);

  canvas.width = width;
  canvas.height = height;

  ctx.font = font;
  if (background && background !== 'none') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, padding, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scaleFactor = 0.01;
  sprite.scale.set(width * scaleFactor, height * scaleFactor, 1);
  sprite.center.set(0.5, 0.5);
  return sprite;
}

function createAuxObject(aux) {
  switch (aux.type) {
    case 'axis':
      return new THREE.AxesHelper(aux.axis?.length ?? 5);
    case 'grid': {
      const size = aux.grid?.size ?? 10;
      const divisions = aux.grid?.divisions ?? 10;
      return new THREE.GridHelper(size, divisions, '#444444', '#222222');
    }
    case 'arc': {
      const group = new THREE.Group();
      const radius = aux.arc?.radius ?? 5;
      const startAngle = (aux.arc?.angleStart ?? 0) * (Math.PI / 180);
      const endAngle = (aux.arc?.angleEnd ?? 90) * (Math.PI / 180);
      const segments = 32;
      const points = [];
      for (let i = 0; i <= segments; i += 1) {
        const t = startAngle + ((endAngle - startAngle) * i) / segments;
        points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: aux.arc?.color ?? '#ffffff' }));
      group.add(line);
      return group;
    }
    case 'hud': {
      const sprite = createLabelSprite(aux.hud?.label, {
        text: aux.hud?.content ?? 'HUD',
        fontSize: aux.hud?.size,
        color: aux.hud?.color,
        background: aux.hud?.background
      });
      if (!sprite) return null;
      sprite.position.fromArray(aux.hud?.position ?? [0, 2, 0]);
      return sprite;
    }
    default:
      return null;
  }
}

function Preview3D({ data, selection, onSelect, onSceneReady }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const groupsRef = useRef({});
  const loaderRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor('#000000');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(8, 8, 8);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#111122', 1.2);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const groups = {
      nodes: new THREE.Group(),
      edges: new THREE.Group(),
      texts: new THREE.Group(),
      gltf: new THREE.Group(),
      aux: new THREE.Group()
    };
    Object.values(groups).forEach((group) => scene.add(group));

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    groupsRef.current = groups;
    loaderRef.current = new GLTFLoader();
    onSceneReady?.({ scene, renderer, camera });

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    let frameId;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(
        [groups.nodes, groups.edges, groups.texts, groups.gltf, groups.aux],
        true
      );
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const userData = hit.userData;
        if (userData?.type && userData?.index != null) {
          onSelect?.(userData.type, userData.index);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointerdown', handleClick);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      onSceneReady?.(null);
    };
  }, [onSelect, onSceneReady]);

  useEffect(() => {
    const groups = groupsRef.current;
    const scene = sceneRef.current;
    if (!groups || !scene || !data) return;

    Object.values(groups).forEach((group) => {
      while (group.children.length) {
        const child = group.children.pop();
        group.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.map) mat.map.dispose?.();
              mat.dispose?.();
            });
          } else if (child.material.dispose) {
            if (child.material.map) child.material.map.dispose?.();
            child.material.dispose();
          }
        }
      }
    });

    const nodeLookup = new Map();
    data.nodes?.forEach((node, index) => {
      const mesh = createNodeMesh(node);
      mesh.userData = { type: 'nodes', index };
      groups.nodes.add(mesh);
      nodeLookup.set(node.id, node);
    });

    data.edges?.forEach((edge, index) => {
      const edgeObject = createEdgeObject(edge, nodeLookup);
      if (!edgeObject) return;
      edgeObject.userData = { type: 'edges', index };
      edgeObject.traverse((child) => {
        child.userData = { ...(child.userData ?? {}), type: 'edges', index };
      });
      groups.edges.add(edgeObject);
    });

    data.texts?.forEach((text, index) => {
      const sprite = createLabelSprite(text.label, {
        text: text.content ?? 'Text',
        fontSize: text.size,
        color: text.color,
        background: text.background
      });
      if (!sprite) return;
      sprite.position.fromArray(text.position ?? [0, 0, 0]);
      sprite.userData = { type: 'texts', index };
      sprite.traverse?.((child) => {
        child.userData = { ...(child.userData ?? {}), type: 'texts', index };
      });
      groups.texts.add(sprite);
    });

    const loader = loaderRef.current;
    const gltfGroup = groups.gltf;
    const promises = (data.gltf ?? []).map((entry, index) => {
      if (!entry.src) return Promise.resolve(null);
      return new Promise((resolve) => {
        loader.load(
          entry.src,
          (gltf) => {
            const model = gltf.scene || gltf.scenes[0];
            model.traverse((child) => {
              child.userData = { type: 'gltf', index };
            });
            model.position.fromArray(entry.position ?? [0, 0, 0]);
            model.rotation.setFromVector3(new THREE.Vector3().fromArray(entry.rotation ?? [0, 0, 0]));
            model.scale.fromArray(entry.scale ?? [1, 1, 1]);
            gltfGroup.add(model);
            resolve(model);
          },
          undefined,
          () => resolve(null)
        );
      });
    });

    Promise.all(promises).then(() => {
      updateSelectionHighlight(groups, selection);
    });

    data.aux?.forEach((aux, index) => {
      const object = createAuxObject(aux);
      if (!object) return;
      object.visible = aux.visible !== false;
      object.userData = { type: 'aux', index };
      groups.aux.add(object);
      object.traverse?.((child) => {
        child.userData = { ...(child.userData ?? {}), type: 'aux', index };
      });
    });

    scene.background = new THREE.Color(data.background ?? '#000000');
    updateSelectionHighlight(groups, selection);
  }, [data, selection]);

  useEffect(() => {
    const groups = groupsRef.current;
    if (!groups) return;
    updateSelectionHighlight(groups, selection);
  }, [selection]);

  const handleFit = () => {
    const groups = groupsRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!groups || !camera || !controls) return;
    const box = new THREE.Box3();
    Object.values(groups).forEach((group) => {
      if (group.children.length) {
        box.expandByObject(group);
      }
    });
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const maxSize = Math.max(size.x, size.y, size.z);
      const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));
      const direction = controls.target.clone().sub(camera.position).normalize();
      camera.position.copy(center.clone().add(direction.multiplyScalar(-distance)));
      controls.target.copy(center);
      controls.update();
    }
  };

  const handleReset = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(8, 8, 8);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-3 top-3 z-10 flex gap-2 text-xs">
        <button
          onClick={handleFit}
          className="rounded bg-gray-800/80 px-3 py-1 text-white hover:bg-gray-700"
        >
          Fit
        </button>
        <button
          onClick={handleReset}
          className="rounded bg-gray-800/80 px-3 py-1 text-white hover:bg-gray-700"
        >
          Reset
        </button>
      </div>
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}

function updateSelectionHighlight(groups, selection) {
  const selectionMap = new Map();
  Object.entries(selection ?? {}).forEach(([type, indexes]) => {
    selectionMap.set(type, new Set(indexes ?? []));
  });
  Object.entries(groups ?? {}).forEach(([type, group]) => {
    group.traverse((child) => {
      if (!child.userData || child.isGroup) return;
      const highlight = selectionMap.get(type)?.has(child.userData.index);
      if (child.material && child.material.emissive) {
        child.material.emissive.set(highlight ? '#33ff99' : '#000000');
      }
      if (child.material && child.material.color && child.material.emissive === undefined) {
        const base = child.material.userData?.baseColor ?? child.material.color.clone();
        if (!child.material.userData?.baseColor) {
          child.material.userData = { ...(child.material.userData ?? {}), baseColor: base.clone() };
        }
        child.material.color.copy(highlight ? base.clone().multiplyScalar(1.4) : base);
      }
    });
  });
}

export default Preview3D;