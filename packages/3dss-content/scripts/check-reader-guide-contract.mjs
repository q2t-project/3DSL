#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReaderGuideV1 } from "./lib/reader-guide-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(HERE, "../fixtures/reader-guide-v1");

const cases = [
  ["valid-minimal.json", true],
  ["invalid-route-order.json", false],
  ["invalid-micro-whole.json", false],
  ["invalid-frame-without-interpretation.json", false],
  ["invalid-axis-meaning.json", false],
];

let failures = 0;
for (const [name, expected] of cases) {
  const file = path.join(FIX, name);
  const guide = JSON.parse(fs.readFileSync(file, "utf8"));
  const result = validateReaderGuideV1(guide);
  if (result.ok !== expected) {
    failures += 1;
    console.error(`[FAIL] ${name}: expected ok=${expected}; got ok=${result.ok}`);
    for (const e of result.errors) console.error(`  - ${e}`);
  } else {
    console.log(`[PASS] ${name}: ok=${result.ok}`);
  }
}

if (failures) process.exit(1);
console.log("Reader Guide v1 contract fixtures: PASS");
