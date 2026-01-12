import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");


const ROOT = siteRoot;
const TARGET = path.join(ROOT, "public", "viewer");
const UI_DIR = path.join(TARGET, "ui");

const exts = new Set([".js", ".mjs", ".cjs", ".ts"]);

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFiles(p));
    else if (ent.isFile() && exts.has(path.extname(p))) out.push(p);
  }
  return out;
}

function toLineCol(text, idx) {
  const head = text.slice(0, idx);
  const lines = head.split("\n");
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

// 代入/更新（=, +=, ++, -- など）
// 代入/更新演算子（'==' '===' '=>' は除外する）
const OP = String.raw`(\+\+|--|[+\-*/%]?=)(?!=|>)`;

// single-writer 対象
const RE_ISPLAY_WRITE = new RegExp(
  String.raw`\b(?:core\s*\.\s*)?uiState\s*\.\s*runtime\s*\.\s*isFramePlaying\s*${OP}`,
  "g"
);

function isFalsePositiveEqOrArrow(text, matchStart, op) {
  // opが '=' で、直後が '=' または '>' なら '==' '===' '=>' なので除外
  if (op !== "=") return false;
  const opStart = matchStart + (text.slice(matchStart, matchStart + 200).indexOf(op));
  const next = text[opStart + 1] || "";
  return next === "=" || next === ">";
}

const RE_CURFRAME_WRITE = new RegExp(
  String.raw`\b(?:core\s*\.\s*)?uiState\s*\.\s*frame\s*\.\s*current\s*${OP}`,
  "g"
);

// UI層：core.uiState / hub.core.uiState のプロパティ直書き禁止
const RE_CORE_UISTATE_PROP_WRITE = new RegExp(
  String.raw`\b(?:hub\s*\.\s*core\s*\.\s*|core\s*\.\s*)uiState\b(?:\s*(?:\.\s*[\w$]+|\[\s*['"][^'"]+['"]\s*\]))+\s*${OP}`,
  "g"
);
// UI層：uiState（alias）経由のプロパティ直書き禁止
const RE_UISTATE_PROP_WRITE = new RegExp(
  String.raw`\buiState\b(?:\s*(?:\.\s*[\w$]+|\[\s*['"][^'"]+['"]\s*\]))+\s*${OP}`,
  "g"
);

// allowlist（必要なら増やす）
const ALLOW_WRITER = [
  /[\/\\]public[\/\\]viewer[\/\\]runtime[\/\\]core[\/\\]frameController\.(js|mjs|ts)$/i,
  // 初期化が別ファイルにあるならここに追加
  // /[\/\\]public[\/\\]viewer[\/\\]runtime[\/\\]core[\/\\]createUiState\.(js|mjs|ts)$/i,
];

function isAllowedWriter(file) {
  return ALLOW_WRITER.some((re) => re.test(file));
}

const errors = [];

function scan(file) {
  const text = fs.readFileSync(file, "utf8");

  // UI層は uiState に書いたら即アウト
  if (file.startsWith(UI_DIR)) {
    for (const m of text.matchAll(RE_CORE_UISTATE_PROP_WRITE)) {
      const idx = m.index ?? 0;
      const { line, col } = toLineCol(text, idx);
      errors.push({
        rule: "NO_UISTATE_WRITE_IN_UI_LAYER",
        file, line, col,
        snippet: text.slice(idx, idx + 140).split("\n")[0],
      });
    }
    for (const m of text.matchAll(RE_UISTATE_PROP_WRITE)) {
      const idx = m.index ?? 0;
      const { line, col } = toLineCol(text, idx);
      errors.push({
        rule: "NO_UISTATE_WRITE_IN_UI_LAYER",
        file, line, col,
        snippet: text.slice(idx, idx + 140).split("\n")[0],
      });
    }
  }

  // isFramePlaying / frame.current は single-writer（frameController以外はアウト）
  if (!isAllowedWriter(file)) {
    for (const m of text.matchAll(RE_ISPLAY_WRITE)) {
      const idx = m.index ?? 0;
      const op = m[1];
      if (isFalsePositiveEqOrArrow(text, idx, op)) continue;
      const { line, col } = toLineCol(text, idx);
      errors.push({
        rule: "SINGLE_WRITER:isFramePlaying",
        file,
        line,
        col,
        snippet: text.slice(idx, idx + 140).split("\n")[0],
      });
    }
    for (const m of text.matchAll(RE_CURFRAME_WRITE)) {
      const idx = m.index ?? 0;
      const op = m[1];
      if (isFalsePositiveEqOrArrow(text, idx, op)) continue;
      const { line, col } = toLineCol(text, idx);
      errors.push({
        rule: "SINGLE_WRITER:frame.current",
        file,
        line,
        col,
        snippet: text.slice(idx, idx + 140).split("\n")[0],
      });
    }
  }
}

for (const f of listFiles(TARGET)) scan(f);

if (errors.length) {
  console.error("\n[single-writer] violations:\n");
  for (const e of errors) {
    console.error(`- ${e.rule}: ${e.file}:${e.line}:${e.col}\n    ${e.snippet}`);
  }
  console.error(`\n[single-writer] FAIL (${errors.length})\n`);
  process.exit(1);
}

console.log("[single-writer] OK");
