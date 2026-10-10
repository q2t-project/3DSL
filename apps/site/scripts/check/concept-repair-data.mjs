import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../../../packages/schemas/3DSS.schema.json' with { type: 'json' };
import { cases, current, evidence, rootUuid, reviewPath, isReviewPreview } from '../../../../packages/3dss-content/review/concept-repair/cases.mjs';

export { cases, current, evidence, rootUuid, reviewPath, isReviewPreview };

assert.equal(createHash('sha256').update(readFileSync(new URL('../../../../packages/3dss-content/library/26010501/model.3dss.json', import.meta.url))).digest('hex'), evidence.baseline_sha256, 'baseline must remain the reviewed source');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const expectedBrokenLines = [
  '7a928352-e1fd-4162-8de4-bc068971996e',
  'bdf41859-f40f-44d2-a1ba-24f9b3463b3d',
  '59985c63-3d79-49a6-96cb-af09a3ee31c9',
];
assert.equal(current.points.length, 38);
assert.equal(current.lines.length, 41);
assert(!current.points.some((point) => point.meta.uuid === rootUuid));

// Imported by sync:concept-repair: invalid candidates fail before a site
// manifest, comparison page or downloadable JSON can be supplied.
export const checks = cases.map(({ id, model }) => {
  assert(validate(model), `${id}: schema ${ajv.errorsText(validate.errors)}`);
  const nodes = [...model.points, ...model.lines, ...(model.aux ?? [])];
  const uuids = nodes.map((node) => node.meta.uuid);
  assert.equal(new Set(uuids).size, uuids.length, `${id}: duplicate UUID`);
  const pointIds = new Set(model.points.map((point) => point.meta.uuid));
  const missing = model.lines.flatMap((line) => ['end_a', 'end_b'].flatMap((end) => {
    const ref = line.appearance[end]?.ref;
    return ref && !pointIds.has(ref) ? [{ line: line.meta.uuid, end, ref }] : [];
  }));
  if (id === 'current') {
    assert.deepEqual(missing, expectedBrokenLines.map((line) => ({ line, end: 'end_a', ref: rootUuid })));
  } else {
    assert.equal(model.points.length, 39, `${id}: exactly one restored point`);
    assert.deepEqual(missing, [], `${id}: missing endpoint`);
    assert.deepEqual(model.points.filter((point) => point.meta.uuid !== rootUuid), current.points, `${id}: existing points unchanged`);
    const { points: _points, ...rest } = model;
    const { points: _currentPoints, ...currentRest } = current;
    assert.deepEqual(rest, currentRest, `${id}: lines, aux and document metadata unchanged`);
    const point = model.points.find((entry) => entry.meta.uuid === rootUuid);
    assert.deepEqual(point.appearance.position, [0, 0, 0]);
    assert.equal(point.signification.name, 'Concept');
    assert.deepEqual(point.meta, evidence.concept_point.meta);
    const expected = structuredClone(id === 'concept' ? evidence.concept_point : evidence.before_deletion_point);
    if (id === 'concept') {
      delete expected.appearance.marker.text.plane;
      expected.appearance.marker.text.pose = { front: [0, 1, 0], up: [0, 0, 1] };
    }
    assert.deepEqual(point, expected, `${id}: recorded historical point / pose conversion only`);
  }
  return { id, points: model.points.length, lines: model.lines.length, missing: missing.length, duplicates: 0, schema: true };
});

export const connections = current.lines.filter((line) => expectedBrokenLines.includes(line.meta.uuid)).map((line) => ({
  line,
  target: current.points.find((point) => point.meta.uuid === line.appearance.end_b.ref),
}));
export const originPoints = current.points.filter((point) => point.appearance.position.every((value) => value === 0));
