#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateReaderBundleV1, validateReaderGuideV1 } from "./lib/reader-guide-v1.mjs";

const P = "11111111-1111-4111-8111-111111111111";
const L = "22222222-2222-4222-8222-222222222222";

const model = {
  document_meta: { document_uuid: "33333333-3333-4333-8333-333333333333" },
  points: [{ meta: { uuid: P }, appearance: { frames: [0, 2] } }],
  lines: [{ meta: { uuid: L }, appearance: { frames: 2 } }],
  aux: [],
};

const guide = {
  version: "1.0",
  orientation: {
    summary: "Whole/local reading guide.",
    placement: { meaning: "Positions are model-specific." },
    axes: [
      { axis: "x", label: "X", meaning: "Example axis meaning." },
    ],
    frames: {
      meaning: "Presentation/runtime applicability.",
      target_time_mapping: { mapped: false },
    },
    scope: "Start with whole, then focus.",
    viewpoint: "Reader-oriented.",
    cautions: ["Axis labels are not universal 3DSL axes."],
  },
  routes: [{
    id: "overview",
    title: "Overview",
    order_semantics: "presentation",
    steps: [
      { id: "whole", title: "Whole", target: { kind: "whole" }, mode: "macro", frame: 0 },
      {
        id: "focus",
        title: "Focus",
        target: { kind: "element", uuid: P, element_kind: "points" },
        mode: "micro",
        frame: 2,
        scope: { include_uuids: [P, L], highlight_uuids: [P] },
      },
    ],
  }],
};

assert.equal(validateReaderGuideV1(guide).ok, true);
assert.equal(validateReaderBundleV1(guide, model).ok, true);

const stale = structuredClone(guide);
stale.routes[0].steps[1].target.uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let r = validateReaderBundleV1(stale, model);
assert.equal(r.ok, false);
assert.match(r.errors.join("\n"), /stale\/unknown model UUID/);

const wrongKind = structuredClone(guide);
wrongKind.routes[0].steps[1].target.element_kind = "lines";
r = validateReaderBundleV1(wrongKind, model);
assert.equal(r.ok, false);
assert.match(r.errors.join("\n"), /kind mismatch/);

const badFrame = structuredClone(guide);
badFrame.routes[0].steps[1].frame = 3;
r = validateReaderBundleV1(badFrame, model);
assert.equal(r.ok, false);
assert.match(r.errors.join("\n"), /outside model frame range/);

const universalized = structuredClone(guide);
universalized.version = "2.0";
assert.equal(validateReaderGuideV1(universalized).ok, false);

console.log("reader-guide-v1 selftest: PASS");
