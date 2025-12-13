// scripts/validate-3dss-samples.mjs
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = process.cwd();

// schema パスは package.json の validate と同じ解釈に揃える
const SCHEMA_PATH = path.join(ROOT, "..", "schemas", "3DSS.schema.json");

// samples root（今の tree 構成に合わせる）
const VALID_DIR = path.join(ROOT, "public", "3dss", "canonical", "valid");
const INVALID_DIR = path.join(ROOT, "public", "3dss", "canonical", "invalid");

function walkJsonFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJsonFiles(p, out);
    else if (e.isFile() && e.name.endsWith(".3dss.json")) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

function loadJson(filePath) {
  const s = fs.readFileSync(filePath, "utf8");
  return JSON.parse(s);
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = loadJson(SCHEMA_PATH);

  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (e) {
    console.error("[samples] schema compile failed:", e);
    process.exit(1);
  }

  const validFiles = walkJsonFiles(VALID_DIR);
  const invalidFiles = walkJsonFiles(INVALID_DIR);
  validFiles.sort();
  invalidFiles.sort();

  console.log(`[samples] schema: ${SCHEMA_PATH}`);
  console.log(`[samples] valid dir: ${VALID_DIR} (${validFiles.length} files)`);
  console.log(`[samples] invalid dir: ${INVALID_DIR} (${invalidFiles.length} files)`);

  if (validFiles.length === 0 && invalidFiles.length === 0) {
    console.error("[samples] No sample files found.");
    process.exit(1);
  }

  const errors = [];

  // valid は全部通す
  for (const f of validFiles) {
    let data;
    try {
      data = loadJson(f);
    } catch (e) {
      errors.push(`VALID JSON PARSE FAIL: ${rel(f)} -> ${e.message}`);
      continue;
    }
    const ok = validate(data);
    if (!ok) {
      errors.push(`VALID BUT INVALID: ${rel(f)} -> ${ajv.errorsText(validate.errors, { separator: " | " })}`);
    }
  }

  // invalid は「JSONとして読めて」「schema は落ちる」を要求
  for (const f of invalidFiles) {
    let data;
    try {
      data = loadJson(f);
    } catch (e) {
      errors.push(`INVALID JSON PARSE FAIL (should be parseable): ${rel(f)} -> ${e.message}`);
      continue;
    }
    const ok = validate(data);
    if (ok) {
      errors.push(`INVALID BUT VALID: ${rel(f)} (unexpectedly passed schema)`);
    }
  }

  if (errors.length) {
    console.error("Sample validation FAILED:");
    for (const m of errors) console.error("- " + m);
    process.exit(1);
  }

  console.log("Sample validation OK (valid pass, invalid fail; all parseable).");
}

main();
