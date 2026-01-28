#!/usr/bin/env node
// packages/3dss-content/scripts/new-library-item.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const LIBRARY_DIR = path.join(ROOT, "library");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayPrefixYYMMDD() {
  const d = new Date();
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yy}${mm}${dd}`;
}

function getFlagValue(args, name) {
  const key = `--${name}`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === key) return args[i + 1] ?? null;
    if (a.startsWith(`${key}=`)) return a.slice(key.length + 1) || null;
  }
  return null;
}

function pickNextId(prefix) {
  const dirs = fs
    .readdirSync(LIBRARY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);

  const re = new RegExp(`^${prefix}([0-9a-z]{2})$`);
  let max = 0; // next starts from 01 (0 -> 1)
  for (const name of dirs) {
    const m = name.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 36);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  if (next > 36 * 36 - 1) {
    throw new Error(`too many items for prefix ${prefix} (00-zz exhausted)`);
  }
  return `${prefix}${String(next.toString(36)).padStart(2, "0")}`;
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`missing library dir: ${LIBRARY_DIR}`);
  }

  const args = process.argv.slice(2);

  // help must be first: never create files on --help
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  node packages/3dss-content/scripts/new-library-item.mjs [id] [title]
  node packages/3dss-content/scripts/new-library-item.mjs --id=YYMMDDxx --title="..."

Options:
  --id       Create specific ID (YYMMDDxx)
  --title    Title for document_meta
  -h, --help Show help (no files created)

Notes:
  - Creates draft item (published:false)
  - document_meta.schema_uri is v1.1.4 and sets created_at/revised_at
`);
    return;
  }

  const idFromFlag = getFlagValue(args, "id");
  const titleFromFlag = getFlagValue(args, "title");

  // positional: [id] [title]
  const givenId = idFromFlag ?? (args[0] && !args[0].startsWith("--") ? args[0] : null);
  const rawTitle = titleFromFlag ?? (args[1] && !args[1].startsWith("--") ? args[1] : null);

  const rawId = givenId ? String(givenId).trim() : null;
  const id = String(rawId ?? pickNextId(todayPrefixYYMMDD())).toLowerCase();

  if (rawId && rawId !== id) {
    console.warn(`[warn] normalized id to lowercase: ${rawId} -> ${id}`);
  }
  if (!/^\d{6}[0-9a-z]{2}$/.test(id)) {
    throw new Error(`invalid id: ${id} (expected YYMMDDxx, e.g. 26010501 or 2601050a)`);
  }

  const finalTitle =
    rawTitle && String(rawTitle).trim() ? String(rawTitle).trim() : id;

  const dir = path.join(LIBRARY_DIR, id);
  if (fs.existsSync(dir)) {
    throw new Error(`already exists: ${dir}`);
  }
  fs.mkdirSync(dir, { recursive: true });

  const now = new Date().toISOString();

  // _meta.json (library meta): draft by default, no created_at/updated_at
  const meta = {
    summary: "",
    description: "",
    tags: [],
    entry_points: [],
    pairs: [],
    rights: null,
    related: [],
    published: false,
    // when published becomes true, published_at/republished_at must be set by tooling
    seo: {
      title: "",
      description: "",
      og_image: "",
    },
    recommended: false,
    hidden: false,
  };
  writeJson(path.join(dir, "_meta.json"), meta);

  // model.3dss.json (document): v1.1.4 schema + created/revised
  const model = {
    document_meta: {
      title: finalTitle,
      summary: "",
      uuid: crypto.randomUUID(),
      schema_uri: "https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4",
      author: process.env.USERNAME || process.env.USER || "unknown",
      version: "1.0.0",
      created_at: now,
      revised_at: now,
    },
    points: [],
    lines: [],
    aux: [],
  };
  writeJson(path.join(dir, "model.3dss.json"), model);

  console.log(`[ok] created ${id}`);
  console.log(` - ${path.relative(process.cwd(), dir)}`);
}

main();
