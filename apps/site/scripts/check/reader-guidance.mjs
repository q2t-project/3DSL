// STEP 11 explanation-route / reader-orientation regression guard.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../../..");

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function json(rel) {
  return JSON.parse(read(rel));
}

function requireText(rel, re, label) {
  const text = read(rel);
  if (!re.test(text)) throw new Error(`${label}: contract not found in ${rel}`);
  return text;
}

const metaRel = "packages/3dss-content/library/26010501/_meta.json";
const modelRel = "packages/3dss-content/library/26010501/model.3dss.json";
const meta = json(metaRel);
const model = json(modelRel);

const routes = Array.isArray(meta.entry_points) ? meta.entry_points : [];
const route = routes.find((x) => x && x.id === "first-read");
if (!route) throw new Error("26010501 must provide entry_points[first-read]");
if (!Array.isArray(route.steps) || route.steps.length < 3) {
  throw new Error("first-read route must have an ordered multi-step path");
}
if (route.steps[0]?.action !== "overview" || route.steps.at(-1)?.action !== "overview") {
  throw new Error("first-read route must start and end at overview");
}

const uuidKinds = new Map();
for (const [key, kind] of [["points", "points"], ["lines", "lines"], ["aux", "aux"]]) {
  for (const item of Array.isArray(model[key]) ? model[key] : []) {
    const uuid = typeof item?.meta?.uuid === "string" ? item.meta.uuid : "";
    if (uuid) uuidKinds.set(uuid, kind);
  }
}
for (const step of route.steps) {
  if (step?.action !== "focus") continue;
  if (!uuidKinds.has(step.uuid)) throw new Error(`route target missing in model: ${step.uuid}`);
  if (step.kind && uuidKinds.get(step.uuid) !== step.kind) {
    throw new Error(`route target kind mismatch: ${step.uuid}`);
  }
}

requireText(
  "packages/docs/docs/library/meta-fields.md",
  /explanation route != model content/,
  "route/model boundary"
);
requireText(
  "packages/3dss-content/scripts/build-3dss-content-dist.mjs",
  /return `\/app\/viewer\?\$\{q\.toString\(\)\}`/,
  "canonical generated Viewer URL"
);
const buildText = read("packages/3dss-content/scripts/build-3dss-content-dist.mjs");
if (!/version:\s*5,/.test(buildText)) {
  throw new Error("Library index contract must be version 5 for route-object entry_points");
}
if (/return `\/viewer\/index\.html\?model=/.test(buildText)) {
  throw new Error("generated Library viewer_url must not expose /viewer/index.html as product entry");
}

requireText(
  "apps/site/src/lib/libraryIndex.ts",
  /LibraryExplanationRoute/,
  "Library explanation route type"
);
requireText(
  "apps/site/src/pages/library/[slug].astro",
  /data-role="library-explanation-routes"/,
  "Library explanation route UI"
);
requireText(
  "apps/site/src/pages/library/[slug].astro",
  /guide:\s*guideUrl[\s\S]*route:\s*routeId/,
  "Library -> Viewer guide handoff"
);

const appViewer = requireText(
  "apps/site/src/pages/app/viewer.astro",
  /id="app-viewer-orientation"/,
  "reader orientation UI"
);
for (const token of [
  '3dsl.viewer.reader.focus',
  '3dsl.viewer.reader.overview',
  '3dsl.viewer.reader.requestState',
  '3dsl.viewer.reader.state',
]) {
  if (!appViewer.includes(token)) throw new Error(`outer Viewer missing reader bridge token: ${token}`);
}
if (!/inner\.delete\("guide"\)/.test(appViewer) || !/inner\.delete\("route"\)/.test(appViewer)) {
  throw new Error("guide/route must remain product-host params and must not leak into inner runtime query");
}
if (!/_data\/library\//.test(appViewer) || !/_meta\.json/.test(appViewer)) {
  throw new Error("guide URL must be restricted to Library metadata");
}
if (!/guideId\s*!==\s*modelId/.test(appViewer)) {
  throw new Error("guide must be bound to the same Library item as the loaded model");
}
if (!/routeId\s*&&\s*!picked/.test(appViewer)) {
  throw new Error("an explicit unknown route id must fail instead of falling back silently");
}
if (!/safeGuidePath\(sp\.get\('guide'\)\s*\|\|\s*'',\s*model\)/.test(appViewer)) {
  throw new Error("shared Viewer URLs must preserve guides only when guide/model pairing is valid");
}

const viewerHost = requireText(
  "apps/viewer/ssot/viewerHost.js",
  /const reader = Object\.freeze/,
  "inner Viewer reader facade"
);
if (!/createHubFacade/.test(viewerHost)) {
  throw new Error("reader facade must use hubFacade boundary");
}

const hubFacade = read("apps/viewer/ssot/ui/hubFacade.js");
if (!/type: "mode\.focus"/.test(hubFacade) || !/type: "mode\.exit"/.test(hubFacade)) {
  throw new Error("mode focus/exit must cross the hub queue boundary");
}

const boot = read("apps/viewer/ssot/viewerHostBoot.js");
for (const token of [
  '3dsl.viewer.reader.focus',
  '3dsl.viewer.reader.overview',
  '3dsl.viewer.reader.requestState',
  '3dsl.viewer.reader.state',
]) {
  if (!boot.includes(token)) throw new Error(`inner Viewer boot missing reader bridge token: ${token}`);
}

console.log("reader-guidance check: PASS");