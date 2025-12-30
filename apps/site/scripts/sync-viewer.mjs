import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access, writeFile } from "node:fs/promises";
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

// public/viewer に "持ち込まない" ディレクトリ
// - vendor は public/vendor（sync-vendor）で配信する
// - node_modules/dist/.astro などのノイズも除外
const EXCLUDE_TOP = new Set([
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

await writeFile(
  path.join(dst, "__GENERATED_DO_NOT_EDIT__.txt"),
  "This directory is generated. Edit SSOT at apps/viewer/ssot and run npm run sync:all.\n",
  "utf8",
);

// Keep viewer-generated artifacts in sync in the generated output.
// In particular, /viewer/_generated/PORTS.md must match /viewer/manifest.yaml.
try {
  const genPorts = path.join(dst, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit" });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
