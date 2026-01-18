import fs from "node:fs";
import path from "node:path";

// Check for top-level route namespace collisions between Astro pages and public assets.
//
// Astro pages:
//   - src/pages/<name>/...      => /<name>/...
//   - src/pages/<name>.astro    => /<name>
// public assets:
//   - public/<name>/...         => /<name>/...
//
// If both exist, one side can shadow the other depending on hosting/routing.
// This has already caused environment-specific mismatches (dev vs Cloudflare preview).

const REPO_ROOT = path.resolve(process.cwd(), "../.."); // apps/site -> repo root
const PAGES_DIR = path.join(process.cwd(), "src/pages");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * @param {string} dir
 */
function listTopLevelRouteNamesFromPages(dir) {
  /** @type {Set<string>} */
  const names = new Set();
  if (!fs.existsSync(dir)) return names;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name.startsWith("_")) continue;
    if (name === "index.astro") continue;
    if (name === "404.astro") continue;

    if (ent.isDirectory()) {
      names.add(name);
      continue;
    }

    // files: viewer.astro -> "viewer"
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    if (!base) continue;

    // Only treat known page-like extensions as routes.
    // (Astro: .astro, plus any MDX/MD pages if introduced)
    if ([".astro", ".md", ".mdx"].includes(ext)) {
      names.add(base);
    }
  }
  return names;
}

/**
 * @param {string} dir
 */
function listTopLevelNamesFromPublic(dir) {
  /** @type {Set<string>} */
  const names = new Set();
  if (!fs.existsSync(dir)) return names;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name.startsWith(".")) continue;
    // ignore common root files that don't create a /<name>/ namespace
    if (
      [
        "favicon.ico",
        "robots.txt",
        "sitemap.xml",
        "_headers",
        "_redirects",
        "__deploy_probe.txt",
      ].includes(name)
    ) {
      continue;
    }

    if (ent.isDirectory()) {
      names.add(name);
    } else {
      // e.g. /public/viewer.js => would occupy /viewer.js, not /viewer.
      // We only care about top-level namespace collisions (/foo/*), so ignore files.
    }
  }
  return names;
}

function main() {
  const pages = listTopLevelRouteNamesFromPages(PAGES_DIR);
  const pub = listTopLevelNamesFromPublic(PUBLIC_DIR);

  const collisions = [...pages].filter((n) => pub.has(n)).sort();
  if (collisions.length === 0) {
    console.log(`[check:route-collisions] OK (no collisions) repo=${REPO_ROOT}`);
    return;
  }

  console.error(`[check:route-collisions] VIOLATION: top-level name collision between src/pages and public.`);
  console.error(`- collisions: ${collisions.join(", ")}`);
  console.error(`- pages dir: ${PAGES_DIR}`);
  console.error(`- public dir: ${PUBLIC_DIR}`);
  console.error(`\nFix: rename or remove one side. Prefer:`);
  console.error(`- Keep canonical viewer route under src/pages/app/viewer...`);
  console.error(`- Avoid /public/<same> when /src/pages/<same> exists.`);
  process.exit(1);
}

main();
