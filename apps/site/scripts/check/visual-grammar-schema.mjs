// HG-V1 candidate contract checks. Does not switch any shipped validator/schema.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { checkLegendReferences } from '../../../../packages/schemas/candidates/v2.0.0/legendReferences.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const candidateRoot = path.join(repo, 'packages/schemas/candidates/v2.0.0');
const readJson = async file => JSON.parse(await fs.readFile(path.join(repo, file), 'utf8'));
const schema = await readJson('packages/schemas/candidates/v2.0.0/3DSS.schema.json');
const oldSchema = await readJson('packages/schemas/release/v1.1.4/3DSS.schema.json');
const previousReleaseSchema = await readJson('packages/schemas/release/v1.1.3/3DSS.schema.json');
const currentSchema = await readJson('packages/schemas/3DSS.schema.json');
const compile = value => new Ajv2020({ allErrors: true, strict: false, coerceTypes: false, useDefaults: false, removeAdditional: false }).compile(value);
const validateSchema = compile(schema);
const validateOld = compile(oldSchema);
const validatePreviousRelease = compile(previousReleaseSchema);
const validateCurrent = compile(currentSchema);
const clone = value => structuredClone(value);
let assertions = 0;
const ok = (condition, message) => { assertions++; assert(condition, message); };
const eq = (actual, expected, message) => { assertions++; assert.deepEqual(actual, expected, message); };
const fixture = async name => JSON.parse(await fs.readFile(path.join(candidateRoot, 'fixtures', name), 'utf8'));
const candidateValid = document => validateSchema(document) && checkLegendReferences(document).length === 0;
const candidateErrors = document => {
  const jsonOk = validateSchema(document);
  return [...(jsonOk ? [] : validateSchema.errors), ...checkLegendReferences(document)];
};
const base = await fixture('valid_styles_and_membership.3dss.json');
ok(candidateValid(base), `valid candidate: ${JSON.stringify(candidateErrors(base))}`);
ok(schema.$id.includes('/candidates/'), 'candidate cannot masquerade as a release');
eq(currentSchema, oldSchema, 'public latest still equals its frozen v1.1.4 release');
const frozenBase = JSON.stringify(base);
ok(candidateValid(base), 'candidate validates without a normalization pass');
eq(JSON.stringify(base), frozenBase, 'validation does not insert defaults, coerce, delete, or alter appearance');
eq(JSON.parse(JSON.stringify(base)), base, 'new fields survive plain JSON serialization; not a Modeler round-trip claim');
ok(!validateOld(base), 'old schema explicitly rejects the new contract');

const paths = [
  ['point', document => document.points[0].appearance.marker.text, 'size', '/points/0/appearance/marker/text/size'],
  ['caption', document => document.lines[0].appearance.caption_text, 'font_size', '/lines/0/appearance/caption_text/font_size'],
  ['math', document => document.aux[0].appearance.module.extension.latex, 'font_size', '/aux/0/appearance/module/extension/latex/font_size'],
];
// Independent boundary examples cover tiny existing labels, ordinary scopes,
// and extremes; expected numbers are not copied from schema.enum.
for (const [name, getText, key, pointer] of paths) {
  for (const value of [0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256]) {
    const document = clone(base); getText(document)[key] = value;
    ok(candidateValid(document), `${name} accepts scope ${value}`);
  }
  for (const value of [0, -1, 0.0625, 0.3, 3, 6, 10, 13, 257, 512, '8', null]) {
    const document = clone(base); getText(document)[key] = value;
    ok(!validateSchema(document), `${name} rejects ${JSON.stringify(value)}`);
    ok(validateSchema.errors.some(error => error.instancePath === pointer), `${name} error points to ${pointer}`);
  }
  const absent = clone(base); delete getText(absent)[key];
  ok(candidateValid(absent), `${name} permits omitted size with documented default`);
  ok(!(key in getText(absent)), `${name} validation keeps omission, not a hidden migration`);
}
const omitted = clone(base);
for (const [_, getText] of paths.slice(0, 2)) {
  for (const key of ['font', 'font_weight', 'color', 'writing_mode']) delete getText(omitted)[key];
}
ok(candidateValid(omitted), 'optional new text properties preserve a minimal authoring path');
const oldMeaningSize = clone(base);
oldMeaningSize.points[0].appearance.marker.radius = 3.5;
oldMeaningSize.points[0].appearance.marker.common.scale = [1.3, 0.8, 1.7];
ok(candidateValid(oldMeaningSize), 'text scope constraint does not silently constrain geometry or parent scale');

for (const [name, getText] of paths.slice(0, 2)) {
  for (const [key, value] of [
    ['writing_mode', 'sideways-rl'], ['writing_mode', 1], ['font_weight', 500],
    ['font_weight', '700'], ['font', { family: 'serif' }], ['font', ''],
    ['color', 'red'], ['color', '#ff000080'], ['unknown_typography', true],
  ]) {
    const document = clone(base); getText(document)[key] = value;
    ok(!validateSchema(document), `${name} rejects unsupported ${key}`);
  }
  for (const [key, value] of [['writing_mode', 'vertical-rl'], ['font_weight', 700], ['font', 'noto_serif_jp_regular'], ['color', '#abc']]) {
    const document = clone(base); getText(document)[key] = value;
    ok(candidateValid(document), `${name} preserves valid ${key}`);
    eq(getText(document)[key], value, `${name} retains authored ${key}`);
  }
}
for (const name of [
  'invalid_size13.3dss.json', 'invalid_caption6.3dss.json', 'invalid_math10.3dss.json',
  'invalid_legend_reference.3dss.json', 'invalid_duplicate_legend_id.3dss.json',
  'invalid_legend_target.3dss.json', 'invalid_writing_mode.3dss.json',
]) ok(!candidateValid(await fixture(name)), `${name} fails the correct contract layer`);
for (const [name, mutate] of [
  ['duplicate member reference', document => document.points[0].meta.legend_refs.push('rice')],
  ['missing legend table', document => { delete document.visual_legend; }],
  ['blank legend label', document => { document.visual_legend[0].label = { ja: ' ' }; }],
  ['wrong document major', document => { document.document_meta.version = '1.1.4'; }],
  ['wrong schema URI', document => { document.document_meta.schema_uri = oldSchema.$id + '#v1.1.4'; }],
]) {
  const document = clone(base); mutate(document);
  ok(!candidateValid(document), name);
}
const noLegend = clone(base); delete noLegend.visual_legend;
for (const element of [...noLegend.points, ...noLegend.lines]) delete element.meta.legend_refs;
ok(candidateValid(noLegend), 'legend is optional when no references are declared');
const noCascade = clone(base); noCascade.visual_legend[2].sample.color = '#f0f';
const originalLineColor = noCascade.lines[0].appearance.color;
ok(candidateValid(noCascade), 'legend specimen is not an imposed style rule');
eq(noCascade.lines[0].appearance.color, originalLineColor, 'multiple declarations never recolor an element during validation');

// Preserve old allowed sizes and omissions using their own frozen validator.
const legacy = await fixture('legacy_permitted_sizes.3dss.json');
const legacyBefore = JSON.stringify(legacy);
ok(validateOld(legacy), `old non-power sizes remain legal: ${JSON.stringify(validateOld.errors)}`);
ok(validateCurrent(legacy), 'public current schema still accepts the legacy fixture');
eq(JSON.stringify(legacy), legacyBefore, 'legacy 13 / 6 / 10 are not rounded');
const previousReleaseDocument = clone(legacy);
previousReleaseDocument.document_meta.schema_uri = previousReleaseSchema.$id + '#v1.1.3';
previousReleaseDocument.document_meta.version = '1.1.3';
// v1.1.3 did not yet accept document-level created/revised timestamps.
delete previousReleaseDocument.document_meta.created_at;
delete previousReleaseDocument.document_meta.revised_at;
ok(validatePreviousRelease(previousReleaseDocument), `v1.1.3 remains independently usable: ${JSON.stringify(validatePreviousRelease.errors)}`);
ok(!validateSchema(previousReleaseDocument), 'candidate does not pretend to be the old-format reader');
const uriOnly = clone(legacy);
uriOnly.document_meta.schema_uri = schema.$id + '#v2.0.0'; uriOnly.document_meta.version = '2.0.0';
ok(!validateSchema(uriOnly), 'changing only a version declaration is not a migration');
const legacyMathOmitted = clone(legacy); delete legacyMathOmitted.aux[0].appearance.module.extension.latex.font_size;
ok(validateOld(legacyMathOmitted), 'old omitted math size remains valid and untouched');

// Exercise the actual unchanged legacy Modeler validator, including reference
// checks that pure JSON Schema cannot perform. No production module is edited.
const { default: createBundledAjv } = await import('../../../reconstruction/ssot/vendor/ajv/dist/ajv.js');
const reconstructionSchema = await readJson('apps/reconstruction/ssot/schemas/3DSS.schema.json');
const previousAjv = globalThis.Ajv, previousFetch = globalThis.fetch;
let legacyValid = 0, legacyInvalid = 0;
try {
  globalThis.Ajv = createBundledAjv;
  globalThis.fetch = async url => {
    assert.equal(String(url), '/schemas/3DSS.schema.json');
    return { ok: true, status: 200, json: async () => clone(reconstructionSchema) };
  };
  const { createCoreControllers } = await import('../../../reconstruction/ssot/modeler_app/runtime/core/coreControllers.js');
  const validator = createCoreControllers({ emit() {} }).validator;
  await validator.ensureInitialized();
  ok(validator.isReady(), 'shipped legacy validator initializes');
  ok(validator.validate(clone(legacy)), 'shipped legacy validator accepts preserved 13 / 6 / 10');
  for (const [relative, classification] of [
    ['packages/3dss-content/canonical/valid', 'valid'],
    ['packages/3dss-content/canonical/invalid', 'invalid'],
    ['packages/3dss-content/fixtures/regression', 'filename'],
  ]) {
    for (const filename of (await fs.readdir(path.join(repo, relative))).filter(name => name.endsWith('.3dss.json')).sort()) {
      const document = await readJson(`${relative}/${filename}`);
      const expected = classification === 'filename' ? filename.startsWith('valid_') : classification === 'valid';
      const before = JSON.stringify(document);
      eq(validator.validate(document), expected, `legacy baseline ${relative}/${filename}`);
      eq(JSON.stringify(document), before, `legacy validation nonmutation ${filename}`);
      if (expected) legacyValid++; else legacyInvalid++;
    }
  }
} finally {
  if (previousAjv === undefined) delete globalThis.Ajv; else globalThis.Ajv = previousAjv;
  globalThis.fetch = previousFetch;
}

const optionalModel = process.argv[2];
if (optionalModel) {
  const document = JSON.parse(await fs.readFile(path.resolve(optionalModel), 'utf8'));
  ok(candidateValid(document), `requested model: ${JSON.stringify(candidateErrors(document))}`);
}
console.log(`[check:visual-grammar-schema] PASS ${assertions} checks; legacy valid=${legacyValid}, invalid=${legacyInvalid}; candidate only, no runtime switch or Modeler persistence claim.`);
