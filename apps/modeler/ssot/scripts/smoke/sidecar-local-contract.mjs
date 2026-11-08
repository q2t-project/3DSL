import assert from "node:assert/strict";
import { sidecarStorageKey, serializeLocalSidecar, parseLocalSidecar } from "../../ui/sidecarLocalContract.js";
import { createCoreControllers } from "../../runtime/core/coreControllers.js";

assert.equal(sidecarStorageKey("abc-123"), "modeler.sidecar.abc-123");
assert.equal(sidecarStorageKey(""), null);
assert.equal(sidecarStorageKey(null), null);

const payload = {
  v: 1,
  locks: ["p1"],
  visibility: { hidden: ["p2"], solo: null },
  outliner: { groups: [], itemToGroup: {}, collapsed: [] },
  uiState: { frameIndex: 3, activeTab: "points" },
};
const serialized = serializeLocalSidecar(payload);
assert.equal(typeof serialized, "string");
assert.deepEqual(parseLocalSidecar(serialized), payload);

const emitter = { emit() {}, on() { return () => {}; } };
const core = createCoreControllers(emitter);
const doc = {
  document_meta: {
    document_uuid: "00000000-0000-4000-8000-000000000001",
    document_title: "sidecar-smoke",
    created_at: "2026-10-02T00:00:00Z",
    revised_at: "2026-10-02T00:00:00Z",
    schema_uri: "https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4",
    author: "smoke",
    version: "1.1.4",
  },
  points: [],
  lines: [],
  aux: [],
};
core.document.set(doc, { intent: "open", source: "memory", label: "sidecar-smoke" });
const before = JSON.stringify(core.document.get());

core.lock.set(["p1"]);
core.visibility.setState({ hidden: ["p2"], solo: null });
core.uiState.set({ frameIndex: 7, activeTab: "lines" });
const sidecar = core.uiSidecar.get();

assert.equal(sidecar.v, 1);
assert.deepEqual(sidecar.locks, ["p1"]);
assert.deepEqual(sidecar.visibility.hidden, ["p2"]);
assert.equal(sidecar.uiState.frameIndex, 7);
assert.equal(JSON.stringify(core.document.get()), before);

core.uiSidecar.apply({
  v: 1,
  locks: [],
  visibility: { hidden: [], solo: null },
  outliner: { groups: [], itemToGroup: {}, collapsed: [] },
  uiState: { frameIndex: 2, activeTab: "points" },
});
assert.equal(core.uiState.get().frameIndex, 2);
assert.equal(JSON.stringify(core.document.get()), before);

console.log("sidecar-local-contract smoke: PASS");
