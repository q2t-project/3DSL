import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/site/scripts -> apps/site
const siteRoot = path.resolve(__dirname, "..");
// apps/site -> repo root
const repoRoot = path.resolve(siteRoot, "..", "..");

// public-owned viewer path
const publicDir = path.join(siteRoot, "public");
const PUBLIC_VIEWER = path.join(publicDir, "viewer");

// ownership markers（両対応）
const marker = path.join(PUBLIC_VIEWER, ".public-owned");
const ownedMarkerFile = path.join(PUBLIC_VIEWER, ".OWNED_BY_PUBLIC");

const force = process.env.SYNC_VIEWER_FORCE === "1";

// publicが所有してる限り、通常 sync:viewer は絶対に触らない
if (!force && (fs.existsSync(marker) || fs.existsSync(ownedMarkerFile))) {
  console.log(
    `[sync] viewer: SKIP (public owns /viewer) marker=${fs.existsSync(marker)} owned=${fs.existsSync(ownedMarkerFile)}`
  );
  process.exit(0);
}

const candidates = [
  path.join(repoRoot, "apps/viewer/ssot"),
  path.join(repoRoot, "apps/viewer/public"),
  path.join(repoRoot, "apps/viewer/viewer"), // legacy (before rename)
];

let src = null;
for (const p of candidates) {
  try {
    await access(p);
    src = p;
    break;
  } catch {
    // try next
  }
}

if (!src) {
  throw new Error(
    `[sync] viewer SSOT not found. tried: ${candidates.map((p) => path.relative(repoRoot, p)).join(", ")}`
  );
}

const dst = PUBLIC_VIEWER;

// force時だけ上書き（rm→cp）
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });

// public-owned を復元（rmで消えるから）
try {
  await fs.promises.writeFile(marker, "", "utf8");
} catch {}
try {
  await fs.promises.writeFile(ownedMarkerFile, "", "utf8");
} catch {}

// /viewer/_generated/PORTS.md を manifest.yaml と一致させる
try {
  const genPorts = path.join(dst, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit" });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
