import assert from "node:assert/strict";
import { summarizeImportExtras, buildImportLossMessage } from "../../ui/controllers/importLossContract.js";

const none = summarizeImportExtras(null);
assert.equal(none.hasLoss, false);
assert.equal(buildImportLossMessage(null, "save"), null);

const extras = {
  kind: "import_extras/v1",
  removedCount: 2,
  removed: [
    { path: "/future_field", value: 1 },
    { path: "/points/0/future_marker", value: { x: 1 } },
  ],
  truncated: false,
};
const s = summarizeImportExtras(extras);
assert.equal(s.hasLoss, true);
assert.equal(s.count, 2);
assert.deepEqual(s.paths, ["/future_field", "/points/0/future_marker"]);

const msg = buildImportLossMessage(extras, "export");
assert.match(msg, /strict 3DSS only/i);
assert.match(msg, /2 unsupported imported field/i);
assert.match(msg, /not persisted/i);
assert.match(msg, /does not mean.*preserved losslessly/i);
assert.match(msg, /Continue with this lossy output/i);

const truncated = buildImportLossMessage({
  removedCount: 501,
  removed: [{ path: "/a", value: 1 }],
  truncated: true,
}, "save");
assert.match(truncated, /501 unsupported imported field/i);
assert.match(truncated, /truncated/i);

console.log("import-loss-contract smoke: PASS");
