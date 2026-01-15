// apps/site/scripts/validate/3dss-canonical.mjs
//
// Validate canonical suite under:
//   public/3dss/canonical/valid/*.3dss.json  -> must be VALID
//   public/3dss/canonical/invalid/*.3dss.json -> must be INVALID (parse OK)
//
// Uses: scripts/validate/3dss.mjs (AJV runner)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/site/
const SITE_ROOT = path.resolve(__dirname, "..", "..");

const SCHEMA = path.join(SITE_ROOT, "public", "3dss", "release", "3DSS.schema.json");
const CANON_DIR = path.join(SITE_ROOT, "public", "3dss", "canonical");
const VALID_DIR = path.join(CANON_DIR, "valid");
const INVALID_DIR = path.join(CANON_DIR, "invalid");

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => n.endsWith(".3dss.json"))
    .map((n) => path.join(dir, n))
    .sort();
}

function runValidate(filePath) {
  // Call existing AJV validator:
  // node scripts/validate/3dss.mjs <json> <schema>
  const runner = path.join(SITE_ROOT, "scripts", "validate", "3dss.mjs");
  const r = spawnSync(process.execPath, [runner, filePath, SCHEMA], {
    encoding: "utf8",
    stdio: "pipe",
  });
  return {
    code: r.status ?? 1,
    out: (r.stdout || "") + (r.stderr || ""),
  };
}

function main() {
  if (!fs.existsSync(SCHEMA)) {
    throw new Error(`[canonical] schema not found: ${SCHEMA} (did you run sync:all?)`);
  }

  const valids = listJson(VALID_DIR);
  const invalids = listJson(INVALID_DIR);

  if (valids.length === 0) {
    console.warn(`[canonical] WARN no files found: ${path.relative(SITE_ROOT, VALID_DIR)}`);
  }
  if (invalids.length === 0) {
    console.warn(`[canonical] WARN no files found: ${path.relative(SITE_ROOT, INVALID_DIR)}`);
  }

  let ok = 0;
  let ng = 0;

  // valid must pass
  for (const f of valids) {
    const r = runValidate(f);
    if (r.code === 0) {
      ok++;
    } else {
      ng++;
      console.error(`[canonical][NG] expected VALID but got INVALID: ${path.relative(SITE_ROOT, f)}`);
      if (r.out.trim()) console.error(r.out.trim());
    }
  }

  // invalid must fail (parse OK is handled by the validator itself; JSON parse errors should still fail)
  for (const f of invalids) {
    const r = runValidate(f);
    if (r.code !== 0) {
      ok++;
    } else {
      ng++;
      console.error(`[canonical][NG] expected INVALID but got VALID: ${path.relative(SITE_ROOT, f)}`);
    }
  }

  const summary = `[canonical] checked valid=${valids.length}, invalid=${invalids.length} -> ok=${ok}, ng=${ng}`;
  if (ng > 0) {
    console.error(`[canonical] FAIL ${summary}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[canonical] OK ${summary}`);
}

main();
