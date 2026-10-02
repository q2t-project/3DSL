#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReaderBundleV1 } from "./lib/reader-guide-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const FIX_GUIDE = path.join(ROOT, "fixtures/reader-guide-v1");
const FIX_BUNDLE = path.join(ROOT, "fixtures/reader-bundle-v1");

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const model = read(path.join(FIX_BUNDLE, "model.3dss.json"));

const cases = [
  {
    name: "valid-minimal",
    guide: path.join(FIX_GUIDE, "valid-minimal.json"),
    ok: true,
    contains: null,
  },
  {
    name: "stale-uuid",
    guide: path.join(FIX_BUNDLE, "invalid-stale-uuid-guide.json"),
    ok: false,
    contains: "stale/unknown model UUID",
  },
  {
    name: "kind-mismatch",
    guide: path.join(FIX_BUNDLE, "invalid-kind-guide.json"),
    ok: false,
    contains: "kind mismatch",
  },
  {
    name: "frame-range",
    guide: path.join(FIX_BUNDLE, "invalid-frame-guide.json"),
    ok: false,
    contains: "outside model frame range",
  },
  {
    name: "route-contract",
    guide: path.join(FIX_GUIDE, "invalid-route-order.json"),
    ok: false,
    contains: "order_note",
  },
];

let failures = 0;
for (const tc of cases) {
  const result = validateReaderBundleV1(read(tc.guide), model);
  const joined = result.errors.join("\n");
  const correct =
    result.ok === tc.ok &&
    (!tc.contains || joined.includes(tc.contains));
  if (!correct) {
    failures += 1;
    console.error(`[FAIL] ${tc.name}: expected ok=${tc.ok} contains=${tc.contains ?? "-"}`);
    console.error(joined || "(no errors)");
  } else {
    console.log(`[PASS] ${tc.name}`);
  }
}

// RBL-104 build-output check: a real Library item with guide.json must produce
// guide_url metadata and a generated guide artifact in the content dist.
const indexPath = path.join(ROOT, "dist/library/library_index.json");
if (!fs.existsSync(indexPath)) {
  failures += 1;
  console.error("[FAIL] generated library index missing; run build-3dss-content-dist first");
} else {
  const index = read(indexPath);
  const item = (Array.isArray(index?.items) ? index.items : []).find((x) => x?.id === "26010501");
  const expectedUrl = "/_data/library/26010501/guide.json";
  const generatedGuide = path.join(ROOT, "dist/library/26010501/guide.json");

  if (!item) {
    failures += 1;
    console.error("[FAIL] generated index missing item 26010501");
  } else if (item.guide_url !== expectedUrl) {
    failures += 1;
    console.error(`[FAIL] guide_url mismatch: expected=${expectedUrl} actual=${item.guide_url}`);
  } else {
    console.log(`[PASS] generated guide_url: ${item.guide_url}`);
  }

  if (!fs.existsSync(generatedGuide)) {
    failures += 1;
    console.error(`[FAIL] generated guide missing: ${generatedGuide}`);
  } else {
    const generated = read(generatedGuide);
    const result = validateReaderBundleV1(generated, read(path.join(ROOT, "library/26010501/model.3dss.json")));
    if (!result.ok) {
      failures += 1;
      console.error("[FAIL] generated guide does not cross-validate against source model");
      for (const e of result.errors) console.error(`  - ${e}`);
    } else {
      console.log("[PASS] generated guide artifact cross-validates");
    }
  }
}

if (failures) process.exit(1);
console.log("Reader Bundle v1 checks: PASS");