// migrate-library-model-display-meta.mjs
//
// 目的:
// - library の表示メタ SSOT を _meta.json 側へ寄せる。
// - 旧 library モデル (model.3dss.json) 内の document_meta に入っている
//   表示用メタ (document_title/document_summary/tags) を「実質無効化」する。
//
// NOTE:
// - v1.1.4 schema では document_title/document_summary/tags が required なので削除せず、
//   代わりに空値へ寄せる ("" / [])。
// - library 以外の 3DSS ファイルは対象外。

import fs from "node:fs/promises";
import path from "node:path";

// When run from packages/3dss-content/scripts, repo root is ../../..
const repoRoot = path.resolve(process.cwd(), "../../..");
const libraryDir = path.join(repoRoot, "packages", "3dss-content", "library");

function isDirentDir(d) {
  return d && typeof d.isDirectory === "function" && d.isDirectory();
}

function shouldTouchFile(absPath) {
  // safety: only ".../packages/3dss-content/library/<id>/model.3dss.json"
  const norm = absPath.replaceAll("\\", "/");
  // IDs are typically YYMMDDxx (8 chars). "xx" may include a-z (e.g. 2601080a).
  return /\/packages\/3dss-content\/library\/[0-9]{6}[0-9a-z]{2}\/model\.3dss\.json$/.test(
    norm,
  );
}

function normalizeDisplayMeta(docMeta) {
  // Keep required fields but neutralize display-oriented ones.
  // - localized_string allows string; empty string is valid.
  docMeta.document_title = "";
  docMeta.document_summary = "";
  docMeta.tags = [];
  return docMeta;
}

async function main() {
  const dirents = await fs.readdir(libraryDir, { withFileTypes: true });
  const itemDirs = dirents.filter(isDirentDir).map((d) => d.name);

  const touched = [];
  const skipped = [];
  const errors = [];

  for (const id of itemDirs) {
    const modelPath = path.join(libraryDir, id, "model.3dss.json");

    try {
      if (!shouldTouchFile(modelPath)) {
        skipped.push({ id, reason: "path_guard" });
        continue;
      }

      const raw = await fs.readFile(modelPath, "utf8");
      const json = JSON.parse(raw);
      const docMeta = json?.document_meta;

      if (!docMeta || typeof docMeta !== "object") {
        skipped.push({ id, reason: "missing_document_meta" });
        continue;
      }

      const before = {
        title: docMeta.document_title,
        summary: docMeta.document_summary,
        tags: docMeta.tags,
      };

      normalizeDisplayMeta(docMeta);

      const after = {
        title: docMeta.document_title,
        summary: docMeta.document_summary,
        tags: docMeta.tags,
      };

      const changed =
        JSON.stringify(before) !== JSON.stringify(after);

      if (!changed) {
        skipped.push({ id, reason: "already_neutral" });
        continue;
      }

      // Pretty-print stable JSON.
      await fs.writeFile(modelPath, JSON.stringify(json, null, 2) + "\n", "utf8");
      touched.push({ id, modelPath });
    } catch (e) {
      errors.push({ id, error: String(e?.message ?? e) });
    }
  }

  const report = {
    libraryDir,
    touched: touched.length,
    skipped: skipped.length,
    errors: errors.length,
    touchedItems: touched,
    skippedItems: skipped,
    errorItems: errors,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));

  if (errors.length) process.exitCode = 1;
}

await main();
