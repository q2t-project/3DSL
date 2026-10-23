import assert from "node:assert/strict";

function uuidOf(node) {
  return node?.meta?.uuid || node?.uuid || null;
}

function framesAllows(frames, frameIndex) {
  if (frames == null) return true;
  if (typeof frames === "number" && Number.isFinite(frames)) return Math.trunc(frames) === Math.trunc(frameIndex);
  if (typeof frames === "string" && frames.trim() && Number.isFinite(Number(frames))) return Math.trunc(Number(frames)) === Math.trunc(frameIndex);
  if (Array.isArray(frames)) {
    const fi = Math.trunc(frameIndex);
    return frames.some((v) => Number.isFinite(Number(v)) && Math.trunc(Number(v)) === fi);
  }
  return true;
}

// UUID is an implementation/document lookup key.
const a = { meta: { uuid: "11111111-1111-4111-8111-111111111111" } };
const b = { meta: { uuid: "22222222-2222-4222-8222-222222222222" } };
assert.notEqual(uuidOf(a), uuidOf(b));
// No assertion here equates UUID inequality with target-world inequality:
// target-world identity is intentionally outside this helper/test contract.

// Frames are presentation/runtime visibility selectors.
assert.equal(framesAllows(null, 99), true);
assert.equal(framesAllows(3, 3), true);
assert.equal(framesAllows(3, 4), false);
assert.equal(framesAllows([1, 3, 5], 3), true);
assert.equal(framesAllows([1, 3, 5], 4), false);
assert.equal(framesAllows("7", 7), true);
// No timestamp/state-transition semantics are inferred from these checks.

console.log("semantic-guards smoke: PASS");