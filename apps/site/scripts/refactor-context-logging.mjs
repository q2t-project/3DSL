import fs from "node:fs";
import path from "node:path";

const TARGET = path.resolve("public/viewer/runtime/renderer/context.js");

function countMatches(s, re) {
  const m = s.match(re);
  return m ? m.length : 0;
}

let src = fs.readFileSync(TARGET, "utf8");

// 1) warnRenderer を注入（無ければ）
if (!/function\s+warnRenderer\s*\(/.test(src)) {
  const reDebugFn =
    /function\s+debugRenderer\s*\([^)]*\)\s*\{\s*\n[\s\S]*?\n\}\s*\n/;

  const m = src.match(reDebugFn);
  if (!m) {
    console.error("[refactor] debugRenderer function not found. abort.");
    process.exit(1);
  }

  const debugBlock = m[0];

  // A案: warn も DEBUG_RENDERER で黙らせる
  const warnBlock =
`\nfunction warnRenderer(...args) {
  if (!DEBUG_RENDERER) return;
  console.warn(...args);
}\n`;

  src = src.replace(reDebugFn, debugBlock + warnBlock);
}

// 2) console.log/warn のうち "[renderer]" 始まりだけ置換
const beforeLog = countMatches(src, /console\.log\(\s*([`'"])\[renderer\]/g);
const beforeWarn = countMatches(src, /console\.warn\(\s*([`'"])\[renderer\]/g);

src = src.replace(/console\.log\(\s*([`'"])\[renderer\]/g, "debugRenderer($1[renderer]");
src = src.replace(/console\.warn\(\s*([`'"])\[renderer\]/g, "warnRenderer($1[renderer]");

const afterLog = countMatches(src, /console\.log\(\s*([`'"])\[renderer\]/g);
const afterWarn = countMatches(src, /console\.warn\(\s*([`'"])\[renderer\]/g);

fs.writeFileSync(TARGET, src, "utf8");

console.log("[refactor] done:", {
  replaced: { consoleLogRenderer: beforeLog, consoleWarnRenderer: beforeWarn },
  remaining: { consoleLogRenderer: afterLog, consoleWarnRenderer: afterWarn },
});
