import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/site/scripts -> repo root
const repoRoot = path.resolve(__dirname, "../../..");

// SSOT はここに固定（候補探索は混線の元なのでやめる）
const src = path.join(repoRoot, "apps/viewer/ssot");
try {
  await access(src);
} catch {
  throw new Error(`[sync] viewer SSOT not found: ${path.relative(repoRoot, src)}`);
}

const dst = path.join(repoRoot, "apps/site/public/viewer");

// public/viewer に “持ち込まない” ディレクトリ
// - assets は public/assets（sync-assets）で配信する
// - vendor は public/vendor（sync-vendor）で配信する
// さらに node_modules/dist/.astro などのノイズも除外
const EXCLUDE_TOP = new Set([
  "assets",
  "vendor",
  "node_modules",
  "dist",
  ".astro",
]);

const shouldCopy = (from) => {
  const rel = path.relative(src, from).replaceAll("\\", "/");
  if (!rel || rel === ".") return true;
  const top = rel.split("/")[0];
  if (EXCLUDE_TOP.has(top)) return false;
  return true;
};

await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });

await cp(src, dst, {
  recursive: true,
  filter: (from) => shouldCopy(from),
});

// Keep viewer-generated artifacts in sync in the generated output.
// In particular, /viewer/_generated/PORTS.md must match /viewer/manifest.yaml.
try {
  const genPorts = path.join(dst, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit" });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
