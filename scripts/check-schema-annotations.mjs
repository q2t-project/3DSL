// scripts/check-schema-annotations.mjs
import fs from "node:fs";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/check-schema-annotations.mjs <schema.json>");
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

const raw = JSON.parse(fs.readFileSync(target, "utf8"));

const hits = [];
function walk(v, path = "$") {
  if (Array.isArray(v)) {
    v.forEach((x, i) => walk(x, `${path}[${i}]`));
    return;
  }
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v)) {
      if (FORBIDDEN_KEYS.has(k)) hits.push(`${path}.${k}`);
      walk(val, `${path}.${k}`);
    }
  }
}
walk(raw);

if (hits.length) {
  console.error(`[schema] forbidden annotation keys found in ${target}`);
  for (const h of hits.slice(0, 50)) console.error(" -", h);
  if (hits.length > 50) console.error(` - ...and ${hits.length - 50} more`);
  process.exit(1);
}
console.log("ok", target);
