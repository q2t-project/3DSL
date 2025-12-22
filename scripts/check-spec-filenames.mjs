// scripts/check-spec-filenames.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

// 期待する新名
const REQUIRED = [
  "public/viewer/spec/runtime_spec.viewer.yaml",
  "public/modeler/spec/runtime_spec.modeler.yaml",
];

// 禁止する旧名（public配下に紛れたら即FAIL）
const FORBIDDEN_BASENAME = "runtime_spec.yaml";

// zip等は無視（中身は見ない）
const SKIP_EXTS = new Set([".zip"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".cache", "tmp"]);

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

async function exists(p) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walk(path.join(dir, e.name))));
      continue;
    }
    if (!e.isFile()) continue;

    const full = path.join(dir, e.name);
    const ext = path.extname(e.name).toLowerCase();
    if (SKIP_EXTS.has(ext)) continue;

    out.push(full);
  }
  return out;
}

async function main() {
  const missing = [];
  for (const p of REQUIRED) {
    const abs = path.join(ROOT, p);
    if (!(await exists(abs))) missing.push(p);
  }

  const publicDir = path.join(ROOT, "public");
  const files = await walk(publicDir);

  const forbidden = files.filter((f) => path.basename(f) === FORBIDDEN_BASENAME);

  if (missing.length === 0 && forbidden.length === 0) {
    console.log("[check:spec-filenames] OK");
    process.exit(0);
  }

  console.error("[check:spec-filenames] FAIL");

  if (missing.length) {
    console.error("  Missing required spec files:");
    for (const p of missing) console.error(`    - ${p}`);
  }

  if (forbidden.length) {
    console.error(`  Found forbidden legacy filename: ${FORBIDDEN_BASENAME}`);
    for (const f of forbidden) console.error(`    - ${rel(f)}`);
    console.error("  Please rename to the new scheme and update references.");
  }

  process.exit(1);
}

main().catch((e) => {
  console.error("[check:spec-filenames] ERROR", e);
  process.exit(2);
});
