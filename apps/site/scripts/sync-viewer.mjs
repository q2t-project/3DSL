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

const publicDir = path.join(siteRoot, "public");
const PUBLIC_VIEWER = path.join(publicDir, "viewer");

// SSOT candidates (first match wins)
const candidates = [
  path.join(repoRoot, "apps/viewer/ssot"),
  path.join(repoRoot, "apps/viewer/public"),
  path.join(repoRoot, "apps/viewer/viewer"), // legacy (before rename)
];

// Optional: allow users to skip syncing explicitly
if (process.env.SYNC_VIEWER_SKIP === "1") {
  console.log("[sync] viewer: SKIP (SYNC_VIEWER_SKIP=1)");
  process.exit(0);
}

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

// Always mirror SSOT -> public/viewer
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });

// Marker to make intent explicit
try {
  await fs.promises.writeFile(path.join(dst, ".OWNED_BY_SSOT"), "", "utf8");
} catch {}

// /viewer/_generated/PORTS.md を manifest.yaml と一致させる
try {
  const genPorts = path.join(dst, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit" });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
