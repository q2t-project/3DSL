import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const TARGET_ROOT = path.join(ROOT, 'packages', '3dss-content');

// Only fix schema_uri if it is already pointing at the v1.1.3 schema but missing the fragment.
const SCHEMA_FROM = 'https://q2t-project.github.io/3dsl/schemas/release/v1.1.3/3DSS.schema.json';
const SCHEMA_TO = 'https://q2t-project.github.io/3dsl/schemas/release/v1.1.3/3DSS.schema.json#v1.1.3';

function isExcludedDirName(name) {
  if (name === 'dist') return true; // 生成物のみ除外
  return false;
}


function walkFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (isExcludedDirName(ent.name)) continue;
      walkFiles(p, out);
      continue;
    }
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith('.3dss.json')) continue;
    out.push(p);
  }
}

function vec3FromToken(raw) {
  const s = String(raw).trim().toLowerCase();
  const map = {
    '+x': [1, 0, 0],
    'x+': [1, 0, 0],
    '-x': [-1, 0, 0],
    'x-': [-1, 0, 0],
    '+y': [0, 1, 0],
    'y+': [0, 1, 0],
    '-y': [0, -1, 0],
    'y-': [0, -1, 0],
    '+z': [0, 0, 1],
    'z+': [0, 0, 1],
    '-z': [0, 0, -1],
    'z-': [0, 0, -1],
  };
  return map[s] ?? null;
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function visit(node, ctx, onPose) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) visit(node[i], ctx, onPose);
    return;
  }
  if (!isPlainObject(node)) return;

  for (const [k, v] of Object.entries(node)) {
    if (k === 'pose') {
      onPose(v, ctx);
      // still recurse in case there are nested pose objects
      visit(v, ctx, onPose);
      continue;
    }
    visit(v, ctx, onPose);
  }
}

function normalizePose(pose, problems, changed) {
  if (!isPlainObject(pose)) return;

  // front/up may be shorthand strings; normalize to vec3.
  for (const key of ['front', 'up']) {
    if (!(key in pose)) continue;
    const v = pose[key];
    if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')) continue;
    if (typeof v === 'string') {
      const vec = vec3FromToken(v);
      if (vec) {
        pose[key] = vec;
        changed.count++;
      } else {
        problems.push(`pose.${key}=${JSON.stringify(v)}`);
      }
      continue;
    }
    // unknown type
    problems.push(`pose.${key}=${JSON.stringify(v)}`);
  }
}

function maybeFixSchemaUri(obj, changed) {
  if (!isPlainObject(obj)) return;
  const dm = obj.document_meta;
  if (!isPlainObject(dm)) return;
  if (dm.schema_uri === SCHEMA_FROM) {
    dm.schema_uri = SCHEMA_TO;
    changed.schemaUri++;
  }
}

const files = [];
walkFiles(TARGET_ROOT, files);

let scanned = 0;
let changedFiles = 0;
let poseEdits = 0;
let schemaUriEdits = 0;
let skipped = 0;
const remainingProblems = [];
const changedPaths = [];

for (const abs of files) {
  scanned++;
  let raw;
  try {
    raw = fs.readFileSync(abs, 'utf8');
  } catch {
    skipped++;
    continue;
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    skipped++;
    continue;
  }

  const probs = [];
  const changed = { count: 0, schemaUri: 0 };

  // keep schema_uri stable, only fix the missing fragment case.
  maybeFixSchemaUri(json, changed);

  visit(json, { file: abs }, (pose) => normalizePose(pose, probs, changed));

  if (changed.count > 0 || changed.schemaUri > 0) {
    fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n', 'utf8');
    changedFiles++;
    poseEdits += changed.count;
    schemaUriEdits += changed.schemaUri;
    changedPaths.push(path.relative(ROOT, abs));
  }

  if (probs.length) {
    remainingProblems.push({ file: path.relative(ROOT, abs), problems: probs });
  }
}

// Write reports for zipping / review.
fs.mkdirSync(path.join(ROOT, '_tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '_tmp', 'migrate_pose_changed_files.txt'), changedPaths.join('\n') + (changedPaths.length ? '\n' : ''), 'utf8');
fs.writeFileSync(path.join(ROOT, '_tmp', 'migrate_pose_remaining_problems.json'), JSON.stringify(remainingProblems, null, 2) + '\n', 'utf8');

console.log(`[migrate] scanned=${scanned}`);
console.log(`[migrate] changedFiles=${changedFiles}`);
console.log(`[migrate] poseEdits=${poseEdits}`);
console.log(`[migrate] schemaUriEdits=${schemaUriEdits}`);
console.log(`[migrate] skipped=${skipped} (invalid json etc)`);
console.log(`[migrate] remainingProblems=${remainingProblems.length} (pose that couldn't be normalized)`);
if (remainingProblems.length) {
  for (const item of remainingProblems.slice(0, 20)) {
    console.log(`- ${item.file} :: ${item.problems.join(', ')}`);
  }
  if (remainingProblems.length > 20) console.log(`... (${remainingProblems.length - 20} more)`);
  console.log('[migrate] NOTE: some pose values could not be normalized. Fix those manually if needed.');
}
