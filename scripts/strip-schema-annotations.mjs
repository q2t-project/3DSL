// scripts/strip-schema-annotations.mjs
import fs from "node:fs";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/strip-schema-annotations.mjs <schema.json>");
  process.exit(2);
}

const FORBIDDEN_KEYS = new Set([
  "description",
  "title",
  "examples",
  "$comment",
  "deprecated",
  "readOnly",
  "writeOnly",
]);

function strip(v) {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      out[k] = strip(val);
    }
    return out;
  }
  return v;
}

const raw = JSON.parse(fs.readFileSync(target, "utf8"));
const cleaned = strip(raw);
fs.writeFileSync(target, JSON.stringify(cleaned, null, 2) + "\n", "utf8");
console.log("stripped", target);
