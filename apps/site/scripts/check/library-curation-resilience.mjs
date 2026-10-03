#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIBRARY_INDEX_CODE,
  filterRelease1Items,
  parseLibraryIndexRaw,
} from "../../src/lib/libraryIndexContract.js";

assert.equal(parseLibraryIndexRaw(null).code, LIBRARY_INDEX_CODE.MISSING);
assert.equal(parseLibraryIndexRaw("").code, LIBRARY_INDEX_CODE.MISSING);
assert.equal(parseLibraryIndexRaw("{").code, LIBRARY_INDEX_CODE.INVALID_JSON);
assert.equal(parseLibraryIndexRaw("{}").code, LIBRARY_INDEX_CODE.INVALID_SHAPE);

const fixture = parseLibraryIndexRaw(JSON.stringify({
  version: 6,
  items: [
    { id: "a", hidden: false, release1: { included: true } },
    { id: "b", hidden: true, release1: { included: true } },
    { id: "c", hidden: true, release1: { included: false } },
  ],
}));
assert.equal(fixture.ok, true);
assert.deepEqual(filterRelease1Items(fixture.items).map((x) => x.id), ["a"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "../../public/_data/library/library_index.json");
if (!fs.existsSync(indexPath)) {
  throw new Error(`generated library index missing: ${indexPath}; run sync:3dss-content first`);
}

const actual = parseLibraryIndexRaw(fs.readFileSync(indexPath, "utf8"));
assert.equal(actual.ok, true, `generated index invalid: ${actual.code}`);
assert.ok(Number(actual.index?.version) >= 6, "library index version must be >= 6");

for (const item of actual.items) {
  assert.equal(
    typeof item?.release1?.included,
    "boolean",
    `published index item must declare release1.included: ${item?.id ?? "?"}`
  );
  if (item.release1.included === false) {
    assert.equal(item.hidden, true, `Release 1 excluded item must be hidden: ${item.id}`);
  }
}

const release = filterRelease1Items(actual.items);
assert.ok(release.length > 0, "Release 1 curated set must not be empty");
assert.ok(release.some((x) => x.recommended === true), "Release 1 needs a recommended entry");

console.log(
  `library curation/resilience contract: PASS (published=${actual.items.length}, release1=${release.length})`
);
