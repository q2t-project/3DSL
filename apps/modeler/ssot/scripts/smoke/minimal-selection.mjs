// apps/modeler/ssot/scripts/smoke/minimal-selection.mjs
//
// Minimal smoke verification for M2 A2.
// Verifies the core "Selection / Focus Contract" entrypoints (QuickCheck / Pick / Outliner)
// without a browser.
//
// Run:
//   node apps/modeler/ssot/scripts/smoke/minimal-selection.mjs
//
// Contract doc:
//   packages/docs/docs/modeler/selection-contract.md

import { createUiSelectionController } from "../../ui/controllers/uiSelectionController.js";

function assert(cond, msg) {
  if (!cond) {
    const e = new Error(msg || "assertion failed");
    e.name = "SmokeAssertionError";
    throw e;
  }
}

function makeDoc() {
  return {
    document_meta: { document_uuid: "doc-1" },
    points: [
      { meta: { uuid: "p-0" }, appearance: { position: [0, 0, 0] } },
      { meta: { uuid: "p-1" }, appearance: { position: [1, 0, 0] } },
    ],
    lines: [
      { meta: { uuid: "l-0" }, endpoints: { end_a: "p-0", end_b: "p-1" } },
    ],
    aux: [
      { meta: { uuid: "a-0" } },
    ],
  };
}

function run() {
  const doc = makeDoc();

  /** @type {string[]} */
  const selections = [];
  /** @type {any[]} */
  const focuses = [];
  /** @type {string[]} */
  const guardReasons = [];

  const core = {
    getDocument: () => doc,
    getSelection: () => selections.slice(),
    setSelection: (uuids) => {
      selections.length = 0;
      for (const u of (uuids || [])) selections.push(String(u));
    },
    focusByIssue: (issueLike) => {
      focuses.push(issueLike);
    },
  };

  const selectionController = createUiSelectionController({
    core,
    // For smoke, record calls; can be configured to deny.
    ensureEditsAppliedOrConfirm: (args) => {
      guardReasons.push(String(args?.reason || ""));
      return true;
    },
    // Not needed in this minimal test.
    getOutlinerRowOrder: () => ["p-0", "p-1", "l-0", "a-0"],
    setHud: () => {},
  });

  // Case 1: QuickCheck-like issue with path only (points/1/..)
  selectionController.selectIssue?.({
    uuid: null,
    kind: "unknown",
    path: "/points/1/appearance/marker/primitive",
  });

  assert(selections.length === 1, "selection not set");
  assert(selections[0] === "p-1", `expected p-1, got ${selections[0]}`);
  assert(focuses.length === 1, "focus not called");
  assert(String(focuses[0]?.uuid) === "p-1", "focus uuid mismatch");

  // Case 2: issue with uuid but no kind/path
  selectionController.selectIssue?.({ uuid: "l-0" });
  assert(selections.length === 1 && selections[0] === "l-0", "selection for l-0 not set");
  assert(focuses.length === 2, "focus not called for l-0");

  // Case 3: aux via path
  selectionController.selectIssue?.({ uuid: null, path: "/aux/0" });
  assert(selections[0] === "a-0", "aux path resolution failed");

  // Case 4: Preview pick (single)
  selectionController.selectFromPick?.({ uuid: "p-0", kind: "point" }, {});
  assert(selections.length === 1 && selections[0] === "p-0", "pick did not set selection");
  assert(focuses.length >= 4 && String(focuses.at(-1)?.uuid) === "p-0", "pick did not focus");

  // Case 5: Preview pick (ctrl toggle)
  selectionController.selectFromPick?.({ uuid: "p-1", kind: "point" }, { ctrlKey: true });
  assert(selections.includes("p-0") && selections.includes("p-1"), "pick ctrl toggle add failed");
  selectionController.selectFromPick?.({ uuid: "p-0", kind: "point" }, { metaKey: true });
  assert(!selections.includes("p-0") && selections.includes("p-1"), "pick meta toggle remove failed");

  // Case 6: Outliner shift range (anchor)
  // First click sets anchor to p-0.
  selectionController.selectFromOutliner?.({ uuid: "p-0", kind: "point" }, {});
  // Shift click to l-0 selects [p-0,p-1,l-0] by outliner order.
  selectionController.selectFromOutliner?.({ uuid: "l-0", kind: "line" }, { shiftKey: true });
  assert(
    selections.join(",") === "p-0,p-1,l-0",
    `outliner shift range mismatch: ${selections.join(",")}`
  );

  // Case 7: Guard denies selection change
  const denySel = createUiSelectionController({
    core,
    ensureEditsAppliedOrConfirm: (args) => {
      guardReasons.push(`deny:${String(args?.reason || "")}`);
      return false;
    },
    getOutlinerRowOrder: () => ["p-0", "p-1", "l-0", "a-0"],
    setHud: () => {},
  });
  const before = selections.slice();
  denySel.selectFromPick?.({ uuid: "a-0", kind: "aux" }, {});
  assert(selections.join(",") === before.join(","), "guard deny should keep selection");

  // Basic sanity: guard was called.
  assert(guardReasons.length > 0, "guard not called");

  console.log("SMOKE OK");
}

try {
  run();
} catch (e) {
  console.error("[SMOKE FAIL]", e && e.stack ? e.stack : e);
  process.exitCode = 1;
}
