// packages/3dss-content/scripts/migrate-v1.1.4.mjs
// Migration helper for v1.1.4 planning:
// - 3dss.json: document_meta.updated_at -> revised_at, add created_at, delete updated_at
// - library _meta.json: updated_at -> republished_at (published only), add published_at (published only), delete updated_at
// - library _docs/_meta.json.template: same key changes (keep published false, drop updated_at placeholder)
//
// NOTE: This script intentionally ignores generated mirrors (apps/site/public, docs_integrated, dist, etc).
// Run from repo root: `node packages/3dss-content/scripts/migrate-v1.1.4.mjs [--apply]`
// Default is dry-run (no writes).

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");

function isObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

async function readJson(filePath) {
  const s = await fs.readFile(filePath, "utf8");
  return { obj: JSON.parse(s), raw: s };
}

function stableStringify(obj) {
  // Keep it simple: 2-space JSON, newline at EOF
  return JSON.stringify(obj, null, 2) + "\n";
}

async function writeJson(filePath, obj) {
  await fs.writeFile(filePath, stableStringify(obj), "utf8");
}

async function walk(dir, out = []) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip obvious generated/irrelevant dirs within 3dss-content
      if (
        e.name === "dist" ||
        e.name === "_generated" ||
        e.name === "_legacy" ||
        e.name === "node_modules"
      ) {
        continue;
      }
      await walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function migrate3dssDocumentMeta(filePath, obj) {
  // Targets *.3dss.json files in scenes/canonical/library/**/model.3dss.json and some script examples
  if (!isObject(obj)) return { changed: false, notes: ["not an object"] };

  const dm =
    obj.document_meta ??
    obj.meta?.document_meta ?? // just in case old nesting exists
    null;

  if (!isObject(dm)) return { changed: false, notes: ["no document_meta object"] };

  const notes = [];
  let changed = false;

  // updated_at -> revised_at
  if (typeof dm.updated_at === "string" && dm.updated_at.trim()) {
    if (typeof dm.revised_at !== "string" || !dm.revised_at.trim()) {
      dm.revised_at = dm.updated_at;
      notes.push("set revised_at from updated_at");
      changed = true;
    } else if (dm.revised_at !== dm.updated_at) {
      // keep existing revised_at; just note mismatch
      notes.push("kept existing revised_at (differs from updated_at)");
    }
    delete dm.updated_at;
    notes.push("deleted updated_at");
    changed = true;
  }

  // Ensure created_at exists
  if (typeof dm.created_at !== "string" || !dm.created_at.trim()) {
    if (typeof dm.revised_at === "string" && dm.revised_at.trim()) {
      dm.created_at = dm.revised_at;
      notes.push("set created_at = revised_at (fallback)");
      changed = true;
    }
  }

  // Ensure revised_at exists (fallback to created_at)
  if (typeof dm.revised_at !== "string" || !dm.revised_at.trim()) {
    if (typeof dm.created_at === "string" && dm.created_at.trim()) {
      dm.revised_at = dm.created_at;
      notes.push("set revised_at = created_at (fallback)");
      changed = true;
    }
  }

  // Re-attach if we pulled from odd nesting
  if (obj.document_meta !== dm) {
    obj.document_meta = dm;
    notes.push("normalized document_meta at root");
    changed = true;
  }

  return { changed, notes };
}

function migrateLibraryMeta(filePath, obj) {
  // Targets packages/3dss-content/library/*/_meta.json (excluding _docs)
  if (!isObject(obj)) return { changed: false, notes: ["not an object"] };

  const notes = [];
  let changed = false;

  const published = obj.published === true;
  const hasUpdatedAt = typeof obj.updated_at === "string" && obj.updated_at.trim();

  if (hasUpdatedAt) {
    if (published) {
      // published_at: initial publish date (we cannot recover historical first publish; use updated_at as best-effort seed)
      if (typeof obj.published_at !== "string" || !obj.published_at.trim()) {
        obj.published_at = obj.updated_at;
        notes.push("set published_at from updated_at (seed)");
        changed = true;
      }
      // republished_at: update date (seed from updated_at)
      if (typeof obj.republished_at !== "string" || !obj.republished_at.trim()) {
        obj.republished_at = obj.updated_at;
        notes.push("set republished_at from updated_at (seed)");
        changed = true;
      }
    } else {
      notes.push("unpublished: drop updated_at without creating publish dates");
    }

    delete obj.updated_at;
    notes.push("deleted updated_at");
    changed = true;
  }

  // Enforce key name without hyphen
  if (Object.prototype.hasOwnProperty.call(obj, "re-published_at")) {
    if (typeof obj.republished_at !== "string" || !obj.republished_at.trim()) {
      obj.republished_at = obj["re-published_at"];
      notes.push("moved re-published_at -> republished_at");
      changed = true;
    }
    delete obj["re-published_at"];
    notes.push("deleted re-published_at");
    changed = true;
  }

  return { changed, notes };
}

function migrateMetaTemplate(filePath, obj) {
  // Targets library/_docs/_meta.json.template
  if (!isObject(obj)) return { changed: false, notes: ["not an object"] };
  const notes = [];
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(obj, "updated_at")) {
    delete obj.updated_at;
    notes.push("template: deleted updated_at placeholder");
    changed = true;
  }

  // Keep published default false; do not add published_at/republished_at placeholders (avoid future confusion)
  return { changed, notes };
}

function isUnder(p, rel) {
  const abs = path.resolve(p);
  const base = path.resolve(ROOT, rel);
  return abs.startsWith(base + path.sep) || abs === base;
}

async function main() {
  const base = path.join(ROOT, "packages", "3dss-content");
  const files = await walk(base);

  const targets = files.filter((p) => p.endsWith(".json"));

  const plan = [];

  for (const filePath of targets) {
    const rel = path.relative(ROOT, filePath).replaceAll("\\", "/");

    // Skip generated mirror under site/public if present inside packages (shouldn't, but safe)
    if (rel.includes("/public/") || rel.includes("/docs_integrated/")) continue;

    // Decide handler
    const isLibraryMeta =
      rel.startsWith("packages/3dss-content/library/") &&
      rel.endsWith("/_meta.json") &&
      !rel.includes("/_docs/");

    const isMetaTemplate =
      rel === "packages/3dss-content/library/_docs/_meta.json.template";

    const is3dssJson =
      rel.endsWith(".3dss.json") &&
      (rel.startsWith("packages/3dss-content/scenes/") ||
        rel.startsWith("packages/3dss-content/canonical/") ||
        rel.startsWith("packages/3dss-content/library/") ||
        rel.startsWith("packages/3dss-content/scripts/"));

    if (!isLibraryMeta && !isMetaTemplate && !is3dssJson) continue;

    const { obj, raw } = await readJson(filePath);

    let result = { changed: false, notes: [] };

    if (isLibraryMeta) result = migrateLibraryMeta(filePath, obj);
    else if (isMetaTemplate) result = migrateMetaTemplate(filePath, obj);
    else if (is3dssJson) result = migrate3dssDocumentMeta(filePath, obj);

    if (result.changed) {
      const next = stableStringify(obj);
      plan.push({ filePath, rel, notes: result.notes, beforeBytes: raw.length, afterBytes: next.length, next });
      if (APPLY) {
        await writeJson(filePath, obj);
      }
    }
  }

  // Report
  console.log(`migrate-v1.1.4: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`changed files: ${plan.length}`);
  for (const item of plan) {
    console.log(`- ${item.rel}`);
    for (const n of item.notes) console.log(`    * ${n}`);
  }

  if (!APPLY) {
    console.log("\nTip: re-run with --apply to write changes.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
