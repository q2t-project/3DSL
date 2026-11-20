import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv from '../../../reconstruction/ssot/vendor/ajv/dist/ajv.js';
import { validateSceneReferences } from '../../../reconstruction/ssot/shared/sceneReferences.js';
import { surfacePoint, surfaceHatchSegments } from '../../../reconstruction/ssot/shared/renderConventions.js';
import { createEmptyContractWork, inspectContractWork, operateContractWork } from '../../../reconstruction/ssot/modeler_app/runtime/contractWork.js';
import { createWorkPackage, serializeWorkPackage } from '../../../reconstruction/ssot/modeler_app/runtime/workPackage.js';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');
const example = name => read(`../../../../packages/3dss-content/canonical/${name}.3dss.json`).then(JSON.parse);
const schemaText = await read('../../../reconstruction/ssot/schemas/3DSS.schema.json');
const schema = JSON.parse(schemaText);
const originalFetch = globalThis.fetch;
globalThis.Ajv = Ajv;
globalThis.fetch = async () => new Response(schemaText);

try {
  const { createCoreControllers } = await import('../../../reconstruction/ssot/modeler_app/runtime/core/coreControllers.js');
  const viewer = await import('../../../reconstruction/ssot/viewer/runtime/core/validator.js');
  viewer.init(schema);
  const modeler = createCoreControllers({ emit() {} });
  const scene = await example('valid/sample06_surface_quantity');
  scene.document_meta.version = '0.45.0';
  const original = structuredClone(scene);
  assert.deepEqual(validateSceneReferences(scene), []);
  assert(viewer.validate3DSS(scene), JSON.stringify(viewer.getErrors()));
  const { strictDoc, extras } = await modeler.import.normalize(scene);
  assert.equal(extras, null);
  assert(modeler.validator.validate(strictDoc), JSON.stringify(modeler.validator.getErrors()));
  modeler.document.set(strictDoc, { intent: 'open' });
  const roundTrip = JSON.parse(JSON.stringify(modeler.document.get()));
  for (const key of ['surfaces', 'coordinate_contexts', 'comparisons', 'quantities', 'visual_legend']) {
    assert.deepEqual(roundTrip[key], original[key], `${key} was altered during import/save`);
  }
  assert.deepEqual(scene, original);

  const plane = { plane: 'xz', position: [8, 4, 2], size: [6, 10], pattern: 'hatch' };
  assert.deepEqual(surfacePoint(plane, [0, 1]), [5, 4, 7]);
  assert.deepEqual(surfacePoint(plane, [1, 0]), [11, 4, -3]);
  assert.equal(surfacePoint(plane, [1.01, 0]), null);
  const hatches = surfaceHatchSegments(plane).flat();
  assert.ok(hatches.length > 0 && hatches.every(([x, y, z]) => x >= 5 && x <= 11 && y === 4 && z >= -3 && z <= 7));

  const previous = roundTrip.surfaces[0];
  const work = createEmptyContractWork();
  work.scene = roundTrip;
  work.baselineScene = structuredClone(roundTrip);
  const saved = operateContractWork(work, {
    type: 'surface-appearance', surface: previous.meta.uuid, position: [1, 2, 3], size: [6, 8], plane: 'yz',
  });
  assert.deepEqual(inspectContractWork(saved, previous.meta.uuid).surface.appearance, {
    ...previous.appearance, position: [1, 2, 3], size: [6, 8], plane: 'yz',
  });
  assert.deepEqual(saved.baselineScene, roundTrip);
  assert.deepEqual(saved.scene.lines, roundTrip.lines);
  assert.deepEqual(saved.scene.quantities, roundTrip.quantities);
  assert.deepEqual(serializeWorkPackage(createWorkPackage({ scene: roundTrip }), saved.scene).scene, saved.scene);

  for (const [key, value] of [['version', '0.invalid'], ['schema_uri', `${schema.$id}#v2.0.1`]]) {
    const invalid = structuredClone(scene);
    invalid.document_meta[key] = value;
    assert.equal(viewer.validate3DSS(invalid), false, key);
    assert.equal(modeler.validator.validate(invalid), false, key);
  }
  const invalidRef = await example('invalid/sample06_surface_ref_points_to_point');
  assert.equal(modeler.validator.validate(invalidRef), false);
  assert(modeler.validator.getErrors().some(error => error.keyword === 'unresolved_ref' && error.instancePath.endsWith('/surface_ref')));
  console.log('[scene-reference-contract] PASS: schema URI, independent document version, Modeler round trips and typed references');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.Ajv;
}
