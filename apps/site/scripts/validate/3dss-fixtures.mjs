// scripts/validate-3dss-fixtures.mjs
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Draft 2020-12 対応 Ajv
import Ajv2020 from "ajv/dist/2020.js";
// format 検証が要るなら（今は必須ちゃう）
// import addFormats from "ajv-formats";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteRoot = path.resolve(__dirname, "..", "..");

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}
function hasFlag(flag) {
  return process.argv.includes(flag);
}

function findExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function walkFindFile(startDir, filenameSet, opts = {}) {
  const {
    maxDepth = 10,
    ignoreDirs = new Set(["node_modules", ".git", "dist", "build", ".astro", ".cache"]),
  } = opts;
  if (!fs.existsSync(startDir)) return null;

  /** @type {{dir:string, depth:number}[]} */
  const stack = [{ dir: startDir, depth: 0 }];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    const { dir, depth } = cur;
    if (depth > maxDepth) continue;
    let ents;
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (ignoreDirs.has(e.name)) continue;
        stack.push({ dir: p, depth: depth + 1 });
      } else if (e.isFile()) {
        if (filenameSet.has(e.name)) return p;
      }
    }
  }
  return null;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (e.isFile() && (p.endsWith(".3dss.json") || p.endsWith(".json"))) out.push(p);
  }
  return out;
}

function isExpectedInvalid(filepath) {
  const base = path.basename(filepath).toLowerCase();
  if (base.startsWith("invalid_")) return true;
  // backward-compat (old prefix)
  if (base.startsWith("/regression_invalid_")) return true;
  // 予備：invalid/ 配下に置いた場合
  const parts = filepath.split(path.sep).map((s) => s.toLowerCase());
  if (parts.includes("invalid")) return true;
  return false;
}

function collectUuids(doc) {
  const set = new Set();
  for (const arrName of ["points", "lines", "aux"]) {
    const arr = Array.isArray(doc?.[arrName]) ? doc[arrName] : [];
    for (const item of arr) {
      const u = item?.meta?.uuid;
      if (typeof u === "string" && u) set.add(u);
    }
  }
  return set;
}

function checkEndpointRefs(doc) {
  const uuids = collectUuids(doc);
  const errs = [];

  const lines = Array.isArray(doc?.lines) ? doc.lines : [];
  for (const ln of lines) {
    const lnUuid = ln?.meta?.uuid || "(no-uuid)";
    const a = ln?.appearance?.end_a;
    const b = ln?.appearance?.end_b;
    for (const [which, ep] of [["end_a", a], ["end_b", b]]) {
      const ref = ep?.ref;
      if (typeof ref === "string") {
        if (!uuids.has(ref)) {
          errs.push({
            kind: "line.endpoint.ref_missing",
            line: lnUuid,
            endpoint: which,
            ref
          });
        }
      }
    }
  }
  return errs;
}

function existsDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

const defaultFixturesDirCandidates = [
  path.resolve(siteRoot, "public/3dss/fixtures/regression"),
  path.resolve(siteRoot, "public/3dss/fixtures"), // fallback
];
const defaultFixturesDir =
  defaultFixturesDirCandidates.find((d) => existsDir(d)) ?? defaultFixturesDirCandidates[0];

const fixturesDir = argValue("--dir", defaultFixturesDir);
const wantRefCheck = hasFlag("--ref");

const explicitSchema = argValue("--schema", null);
let schemaPath =
  explicitSchema ||
  findExisting([
    path.resolve(siteRoot, "public/schemas/3DSS.schema.json"),
    path.resolve(siteRoot, "public/schemas/3DSS.schema.json"),
    path.resolve(siteRoot, "public/schemas/3dss.schema.json"),
    path.resolve(siteRoot, "schemas/3DSS.schema.json"),
    path.resolve(siteRoot, "schemas/3dss.schema.json"),
    path.resolve(siteRoot, "public/3dsl/schemas/3DSS.schema.json"),
    path.resolve(siteRoot, "public/3dsl/schemas/3dss.schema.json"),
    path.resolve(siteRoot, "public/viewer/schemas/3DSS.schema.json"),
    path.resolve(siteRoot, "public/viewer/schemas/3dss.schema.json"),
  ]);

if (!schemaPath) {
  // 最後の手段：プロジェクト内を探索（3DSS.schema.json / 3dss.schema.json）
  const targets = new Set(["3DSS.schema.json", "3dss.schema.json"]);
  schemaPath =
    walkFindFile(path.resolve(siteRoot, "public"), targets) ||
    walkFindFile(path.resolve(siteRoot, "schemas"), targets) ||
    walkFindFile(siteRoot, targets);
}




if (!schemaPath) {
  console.error("[fixtures:validate] ERROR: schema not found.");
  console.error("  - pass: node scripts/validate-3dss-fixtures.mjs --ref --schema <path>");
  console.error("  - or ensure 3DSS.schema.json exists somewhere under ./public or ./schemas");
  process.exit(1);
}

if (!fs.existsSync(fixturesDir)) {
  console.error(`[fixtures:validate] ERROR: fixtures dir not found: ${fixturesDir}`);
  process.exit(1);
}

console.log(`[fixtures:validate] schema = ${path.relative(siteRoot, schemaPath)}`);

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  allowUnionTypes: true
});
// format 検証もやるなら
// addFormats(ajv);

// uri / uri-reference / uuid など
addFormats(ajv);
ajv.addFormat("uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  console.error("[fixtures:validate] ERROR: failed to compile schema (Ajv).");
  console.error(`  schema = ${schemaPath}`);
  console.error(`  err = ${String(e?.message || e)}`);
  process.exit(1);
}

const files = walkFiles(fixturesDir).sort();
if (files.length === 0) {
  console.error(`[fixtures:validate] ERROR: no fixtures found in ${fixturesDir}`);
  process.exit(1);
}

let okValid = 0;
let okInvalid = 0;
let ngCount = 0;

for (const fp of files) {
  const raw = fs.readFileSync(fp, "utf-8");
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    console.error(`[fixtures:validate] NG JSON parse: ${fp}`);
    console.error(String(e));
    ngCount++;
    continue;
  }

  const schemaOk = validate(doc);
  const refErrs = wantRefCheck ? checkEndpointRefs(doc) : [];
  const hasErrors = !schemaOk || refErrs.length > 0;

  const expectInvalid = isExpectedInvalid(fp);
  const rel = path.relative(siteRoot, fp);

  if (!expectInvalid) {
    if (!hasErrors) {
      console.log(`[fixtures:validate] OK  ${rel}`);
      okValid++;
    } else {
      console.log(`[fixtures:validate] NG  ${rel}`);
      if (!schemaOk) {
        for (const err of validate.errors || []) {
          console.log(`  - schema: ${err.instancePath || "(root)"} ${err.message}`);
        }
      }
      for (const r of refErrs) {
        console.log(`  - ref: ${r.kind} line=${r.line} ${r.endpoint}.ref=${r.ref}`);
      }
      ngCount++;
    }
  } else {
    // invalid は「落ちたらOK」
    if (hasErrors) {
      console.log(`[fixtures:validate] OK(invalid)  ${rel}`);
      okInvalid++;
    } else {
      console.log(`[fixtures:validate] NG(unexpected valid)  ${rel}`);
      ngCount++;
    }
  }
}

console.log(`[fixtures:validate] summary valid_ok=${okValid} invalid_ok=${okInvalid} ng=${ngCount}`);
process.exit(ngCount === 0 ? 0 : 1);
