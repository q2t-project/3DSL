// apps/site/scripts/check/product-foundation.mjs
// STEP 11 Foundation slice guard:
// Product Definition v1 must be repository-canonical and the public reader entry
// must use /app/viewer (while /viewer/* remains the runtime/bundle base).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");

function read(rel) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function requireText(rel, pattern, label) {
  const text = read(rel);
  if (!pattern.test(text)) {
    throw new Error(`${label}: contract text not found in ${rel}`);
  }
  return text;
}

const productFiles = [
  "product-definition.md",
  "target-users.md",
  "user-flow.md",
  "information-architecture.md",
  "library-strategy.md",
  "monetization.md",
  "product-principles.md",
];

for (const name of productFiles) {
  requireText(
    `packages/docs/product/${name}`,
    /APPROVED \/ PRODUCT_DEFINITION_V1/,
    "Product Definition v1 status"
  );
}

requireText(
  "packages/docs/product/product-definition.md",
  /whole-preserving spatial knowledge exploration system/i,
  "Product core"
);
requireText(
  "packages/docs/product/product-definition.md",
  /全体を保ったまま局所へ入り、局所から全体へ戻れる知識空間/,
  "Product short form"
);
requireText(
  "packages/docs/product/target-users.md",
  /Primary role: Reader \/ Explorer/,
  "Reader-first role"
);

const homeTop = requireText(
  "apps/site/src/content/pages/top.md",
  /全体.*局所|局所.*全体/s,
  "Home whole/local meaning"
);
if (/言葉より強力な/.test(homeTop)) {
  throw new Error("Home must not claim categorical superiority over language");
}

const home = read("apps/site/src/pages/index.astro");
if (!/href=["']\/app\/viewer/.test(home)) {
  throw new Error("Home must link to canonical public Viewer entry /app/viewer");
}
if (/href=["']\/viewer(?:["'/?#])/.test(home)) {
  throw new Error("Home contains stale product link to /viewer; use /app/viewer");
}

const concept = requireText(
  "apps/site/src/content/pages/concept.md",
  /3D は条件付きの表現手段/,
  "Conditional 3D policy"
);
if (!/Viewer：\/app\/viewer/.test(concept)) {
  throw new Error("Concept must point readers to /app/viewer");
}
if (/Viewer：\/viewer(?:\s|$)/m.test(concept)) {
  throw new Error("Concept contains stale public Viewer route /viewer");
}

const agents = read("AGENTS.md");
if (!/Viewer public entry is `\/app\/viewer`/.test(agents)) {
  throw new Error("AGENTS must identify /app/viewer as the public Viewer entry");
}

console.log("product-foundation check: PASS");