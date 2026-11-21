import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from '../../vendor/three/build/three.module.js';
import { GLTFExporter } from '../../vendor/three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';

const content = new URL('../', import.meta.url);
const catalog = new URL('parts/outline/v1/parts-index.json', content);
const index = JSON.parse(await readFile(catalog, 'utf8'));
const rotation = [0, Math.PI / 2, 0];
const sourceScale = 1 / 13; // +Y fingertip in the source is 104 units from the pivot.

// GLTFExporter uses FileReader for its final binary buffers.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend();
    });
  }
};

// Sample the original polyline vertices exactly, including the straight segments.
class OutlinePath extends THREE.Curve {
  constructor(points) {
    super();
    this.points = points;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const position = t * (this.points.length - 1);
    const segment = Math.min(Math.floor(position), this.points.length - 2);
    return target.copy(this.points[segment]).lerp(this.points[segment + 1], position - segment);
  }

  getPointAt(t, target) {
    return this.getPoint(t, target);
  }

  getTangentAt(t, target) {
    return this.getTangent(t, target);
  }
}

const catalogEntries = [];
for (const [hand, label] of [['right', '右手'], ['left', '左手']]) {
  const source = `library/26012301/assets/${hand}hand_model.glb`;
  const bytes = await readFile(new URL(source, content));
  const { scene: original } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
  const paths = [];
  original.updateMatrixWorld(true);
  original.traverse(object => {
    if (!object.isLine) return;
    const positions = object.geometry.getAttribute('position');
    const points = Array.from({ length: positions.count }, (_, i) => {
      const { x, y, z } = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      // The original GLBs are Z-up. Use the same Y-up convention as the catalog.
      return new THREE.Vector3(x, z, -y).multiplyScalar(sourceScale);
    });
    const color = object.material.color;
    const neutral = color.r === color.g && color.g === color.b;
    paths.push({ points, color: neutral ? new THREE.Color('#8995a6') : color });
  });
  assert.equal(paths.length, 19, source);

  // Widths are diameters at catalog size 8; the source centerlines never move.
  const variants = [
    ['thick-outline', 0.16],
    ['thick-outline-d024', 0.24],
    ['thick-outline-d032', 0.32],
  ];
  for (const [variant, diameter] of variants) {
    const strokeGroups = new Map();
    for (const { points, color } of paths) {
      const key = color.getHex();
      if (!strokeGroups.has(key)) strokeGroups.set(key, { color, shapes: [], endpoints: new Set() });
      const { shapes, endpoints } = strokeGroups.get(key);
      const radius = diameter / 2;
      shapes.push(new THREE.TubeGeometry(new OutlinePath(points), points.length - 1, radius, 8));
      for (const point of [points[0], points.at(-1)]) {
        const endpoint = point.toArray().map(value => Math.round(value * 1e5)).join(',');
        if (endpoints.has(endpoint)) continue;
        endpoints.add(endpoint);
        shapes.push(new THREE.SphereGeometry(radius, 8, 6).translate(point.x, point.y, point.z));
      }
    }

    const scene = new THREE.Scene();
    for (const { color, shapes } of strokeGroups.values()) {
      scene.add(new THREE.Mesh(mergeGeometries(shapes), new THREE.MeshBasicMaterial({ color })));
    }

    const id = `hand_${hand}_three-axis_${variant}_u8_v1`;
    const filename = `${id}.glb`;
    for (const mesh of scene.children) {
      mesh.geometry.deleteAttribute('normal');
      mesh.geometry.deleteAttribute('uv');
    }
    const glb = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true }));
    await writeFile(new URL(filename, catalog), glb);
    const bounds = new THREE.Box3();
    const zUp = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    for (const mesh of scene.children) {
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(zUp));
      }
    }
    const coordinates = vector => vector.toArray().map(value => Number(value.toFixed(6)));
    catalogEntries.push({
      id,
      label_ja: `${label}：三軸・太線（線径 ${diameter}）`,
      filename,
      reference_size: 8,
      actual_bounds_3dsl: { min: coordinates(bounds.min), max: coordinates(bounds.max) },
      stroke_diameter: diameter,
      pivot_3dsl: [0, 0, 0],
      up_3dsl: [0, 0, 1],
      front_3dsl: [0, 1, 0],
      billboard: false,
      gltf_rotation_yaw_pitch_roll_radians: rotation,
      source,
      source_scale: sourceScale,
      sha256: createHash('sha256').update(glb).digest('hex'),
    });
  }
}

const generatedIds = new Set(catalogEntries.map(part => part.id));
index.parts = [...index.parts.filter(part => !generatedIds.has(part.id)), ...catalogEntries];
await writeFile(catalog, JSON.stringify(index, null, 2) + '\n');
