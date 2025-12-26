// SSOT check: host/ 以下の viewer 公開資産参照が /viewer/ 配下に統一されていること。
// - Host（Astro 等）に同期されるテンプレートを SSOT として viewer 側に置く。
// - ここでの "資産" は href/src/url() で参照される静的ファイルを指す。

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, ".."); // viewer/

const hostDir = path.join(repoRoot, "host");
const targetExts = new Set([".astro", ".html", ".css"]);

// viewer を /viewer/ 配下に閉じるのが基本。
// 例外: 3DSS 置き場（サイト全体共有）など、運用上ここに置く方が自然なもの。
const ALLOWED_PREFIXES = [
  "/viewer/",
  "/3dss/",
  "http://",
  "https://",
  "data:",
  "mailto:",
  "#",
];

function isAllowed(ref) {
  if (typeof ref !== "string") return true;
  const s = ref.trim();
  if (!s) return true;
  return ALLOWED_PREFIXES.some((p) => s.startsWith(p));
}

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkFiles(p);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (targetExts.has(ext)) yield p;
    }
  }
}

function collectRefs(text) {
  const refs = [];

  // src/href="..." 形式（query/hash 付きでも値全体を拾う）
  const attrRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
  for (let m; (m = attrRe.exec(text)); ) {
    refs.push({ kind: "attr", value: m[1] });
  }

  // CSS url(...)
  const urlRe = /url\(\s*(?:["']?)([^"')\s]+)(?:["']?)\s*\)/g;
  for (let m; (m = urlRe.exec(text)); ) {
    refs.push({ kind: "url", value: m[1] });
  }

  return refs;
}

function isProbablyAssetPath(ref) {
  // 文字列中に拡張子があるものだけを資産として扱う（誤検知を減らす）。
  // ex) "/viewer/" のような末尾スラッシュはここでは除外しない（許可判定で通す）。
  const s = (ref ?? "").trim();
  if (!s) return false;
  if (s.endsWith("/")) return true;
  return /\.[a-zA-Z0-9]{1,6}(?:[?#].*)?$/.test(s);
}

function normalizeRef(ref) {
  // query/hash は許可判定のため残す（prefix 判定なので問題なし）
  return (ref ?? "").trim();
}

function checkFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const refs = collectRefs(text);
  const violations = [];

  for (const r of refs) {
    const v = normalizeRef(r.value);
    if (!isProbablyAssetPath(v)) continue;
    if (isAllowed(v)) continue;
    // ルール: /viewer/ に閉じる。相対参照や /assets/ は禁止。
    violations.push({ filePath, value: v, kind: r.kind });
  }
  return violations;
}

function main() {
  const all = [];
  for (const filePath of walkFiles(hostDir)) {
    all.push(...checkFile(filePath));
  }

  if (all.length === 0) {
    console.log("[host-asset-paths] OK");
    return;
  }

  console.error("[host-asset-paths] violations:");
  for (const v of all) {
    const rel = path.relative(repoRoot, v.filePath).replace(/\\/g, "/");
    console.error(`- ${rel}: ${v.value}`);
  }
  process.exitCode = 1;
}

main();
