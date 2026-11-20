import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const vendor = path.join(root, 'packages/vendor/three');
const threeURL = pathToFileURL(path.join(vendor, 'build/three.module.js')).href;
const loaderURL = pathToFileURL(path.join(vendor, 'examples/jsm/loaders/GLTFLoader.js')).href;
const THREE = await import(threeURL);
globalThis.ProgressEvent ||= class { constructor(type, options) { Object.assign(this, { type }, options); } };

for (const rel of ['apps/modeler/ssot', 'apps/reconstruction/ssot/modeler_app']) {
  const source = await fs.readFile(path.join(root, rel, 'runtime/renderer/gltfMarkers.js'), 'utf8');
  const nodeSource = source.replace("from 'three'", `from '${threeURL}'`)
    .replace("'three/addons/loaders/GLTFLoader.js'", `'${loaderURL}'`);
  const { createGltfMarkers } = await import('data:text/javascript;base64,' + Buffer.from(nodeSource).toString('base64'));
  let complete, invalidations = 0, failures = 0, disposed = 0;
  const rootObject = new THREE.Group();
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), new THREE.MeshBasicMaterial());
  scene.add(mesh);
  mesh.geometry.addEventListener('dispose', () => disposed++);
  const manager = createGltfMarkers({ invalidate: () => invalidations++, onError: () => failures++,
    load: () => new Promise(resolve => { complete = resolve; }) });
  const task = manager.attach(rootObject, { url: 'data:test', scale: [2, 2, 2], rotation: [0, Math.PI / 2, 0], offset: [1, 2, 3] }, 'point-one');
  complete(scene); await task;
  assert.equal(mesh.userData.uuid, 'point-one');
  assert.equal(mesh.userData.kind, 'point');
  assert.deepEqual(scene.scale.toArray(), [2, 2, 2]);
  assert.deepEqual(scene.position.toArray(), [1, 2, 3]);
  assert.equal(scene.rotation.x, Math.PI / 2);
  assert.equal(scene.rotation.y, 0);
  rootObject.position.set(10, 20, 30); rootObject.updateMatrixWorld(true);
  assert.deepEqual(scene.getWorldPosition(new THREE.Vector3()).toArray(), [11, 22, 33]);
  assert.equal(invalidations, 1);
  manager.reset(); assert.equal(rootObject.children.length, 0); assert.equal(disposed, 1);
  const staleScene = new THREE.Group();
  const staleMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  staleScene.add(staleMesh); staleMesh.geometry.addEventListener('dispose', () => disposed++);
  const stale = manager.attach(rootObject, { url: 'data:old' }, 'old-point');
  manager.reset(); complete(staleScene); await stale;
  assert.equal(rootObject.children.length, 0); assert.equal(disposed, 2);
  const broken = createGltfMarkers({ load: () => Promise.reject(new Error('bad GLB')), onError: () => failures++ });
  await broken.attach(rootObject, { url: 'bad.glb' }, 'bad');
  assert.equal(rootObject.children.length, 0); assert.equal(failures, 1);
  const malformed = createGltfMarkers({ load: () => ({}), onError: () => failures++ });
  await malformed.attach(rootObject, { url: 'empty.glb' }, 'empty'); assert.equal(failures, 2);
  broken.dispose(); malformed.dispose(); manager.dispose();
  const assetRoot = path.join(root, 'packages/3dss-content/parts/outline/v1');
  const index = JSON.parse(await fs.readFile(path.join(assetRoot, 'parts-index.json'), 'utf8'));
  for (const part of index.parts) {
    const bytes = await fs.readFile(path.join(assetRoot, part.filename));
    const live = createGltfMarkers({ onError: (_uuid, error) => { throw error; } });
    rootObject.position.set(0, 0, 0);
    await live.attach(rootObject, { url: 'data:model/gltf-binary;base64,' + bytes.toString('base64'), rotation: [0, Math.PI / 2, 0] }, 'real-glb');
    let meshCount = 0;
    rootObject.traverse(object => { if (object.isMesh) { meshCount++; assert.equal(object.userData.uuid, 'real-glb'); } });
    assert.ok(meshCount > 0, 'real GLTFLoader must load ' + part.filename);
    const bounds = new THREE.Box3().setFromObject(rootObject);
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(Math.abs(bounds.min.toArray()[axis] - part.actual_bounds_3dsl.min[axis]) < 1e-4);
      assert.ok(Math.abs(bounds.max.toArray()[axis] - part.actual_bounds_3dsl.max[axis]) < 1e-4);
    }
    live.dispose(); assert.equal(rootObject.children.length, 0);
  }
  console.log(`[gltf-markers] PASS ${rel}: transform, UUID picking, movement, stale load, disposal and errors`);
}

// Exercise the actual import/normalization and serialization boundaries too.
globalThis.Ajv = (await import(pathToFileURL(path.join(root, 'apps/reconstruction/ssot/vendor/ajv/dist/ajv.js')).href)).default;
const originalFetch = globalThis.fetch;
const schemaText = await fs.readFile(path.join(root, 'packages/schemas/3DSS.schema.json'), 'utf8');
const schema = JSON.parse(schemaText);
globalThis.fetch = async () => new Response(schemaText, { headers: { 'Content-Type': 'application/json' } });
try {
  const assetRoot = path.join(root, 'packages/3dss-content/parts/outline/v1');
  const index = JSON.parse(await fs.readFile(path.join(assetRoot, 'parts-index.json'), 'utf8'));
  const entry = index.parts[0];
  const bytes = await fs.readFile(path.join(assetRoot, entry.filename));
  const sample = { document_meta: {
    document_title: 'GLB import roundtrip', document_uuid: randomUUID(), version: '1.0.0',
    created_at: '2026-11-17T00:00:00Z', revised_at: '2026-11-17T00:00:00Z',
    schema_uri: schema.$defs.validator.schema_uri.const, author: '3DSL', coordinate_system: 'Z+up/freeXY',
  }, points: [{ meta: { uuid: randomUUID() }, appearance: { position: [4, 8, 16], marker: {
    primitive: 'none', gltf: { url: 'data:model/gltf-binary;base64,' + bytes.toString('base64'),
      rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], offset: [0, 0, 0] },
  } } }], lines: [], aux: [] };
  for (const rel of ['apps/modeler/ssot', 'apps/reconstruction/ssot/modeler_app']) {
    const { createCoreControllers } = await import(pathToFileURL(path.join(root, rel, 'runtime/core/coreControllers.js')).href);
    const core = createCoreControllers({ emit() {} });
    const { strictDoc, extras } = await core.import.normalize(sample);
    assert.equal(extras, null);
    core.document.set(strictDoc);
    const serialized = JSON.parse(JSON.stringify(core.document.get()));
    assert.deepEqual(serialized.points[0].appearance.marker.gltf, sample.points[0].appearance.marker.gltf);
    assert.equal(serialized.points[0].meta.uuid, sample.points[0].meta.uuid);
    assert.ok(core.validator.validate(serialized), JSON.stringify(core.validator.getErrors()));
    console.log(`[gltf-markers] PASS ${rel}: import -> core -> JSON retains GLB data, pose, scale and UUID`);
  }
} finally { globalThis.fetch = originalFetch; delete globalThis.Ajv; }
