
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const TARGET_ROOT = path.join(ROOT, 'packages', '3dss-content');

function isExcludedDir(name) {
  // Exclude only backup/snapshot dirs.
  if (name === "_tmp") return true;
  if (name.startsWith("_backup")) return true;
  if (name.startsWith("_fixtures_backup")) return true;
  return false;
}


function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!isExcludedDir(ent.name)) walk(p, out);
    } else if (ent.isFile() && ent.name.endsWith('.3dss.json')) {
      out.push(p);
    }
  }
}

function vec3(token) {
  const m = {
    "x+": [1, 0, 0], "+x": [1, 0, 0],
    "x-": [-1, 0, 0], "-x": [-1, 0, 0],
    "y+": [0, 1, 0], "+y": [0, 1, 0],
    "y-": [0, -1, 0], "-y": [0, -1, 0],
    "z+": [0, 0, 1], "+z": [0, 0, 1],
    "z-": [0, 0, -1], "-z": [0, 0, -1],
  };
  return m[String(token).toLowerCase()] ?? null;
}

function normalizePose(pose) {
  let changed = false;
  if (typeof pose !== 'object' || Array.isArray(pose)) return false;

  if (typeof pose.front === "string") {
    const v = vec3(pose.front);
    if (v) { pose.front = v; changed = true; }
  }
  if (typeof pose.up === "string") {
    const v = vec3(pose.up);
    if (v) { pose.up = v; changed = true; }
  }
  delete pose.mode;
  delete pose.roll;
  return changed;
}

const files = [];
walk(TARGET_ROOT, files);

let scanned=0, changedFiles=0, edits=0;

for (const f of files) {
  scanned++;
  let json;
  try { json = JSON.parse(fs.readFileSync(f,'utf8')); }
  catch { continue; }

  let changed = false;

  for (const line of (json.lines ?? [])) {
    const p = line?.appearance?.caption_text?.pose;
    if (p && normalizePose(p)) { changed=true; edits++; }
  }
  for (const pt of (json.points ?? [])) {
    const p = pt?.appearance?.marker?.text?.pose;
    if (p && normalizePose(p)) { changed=true; edits++; }
  }

  if (changed) {
    fs.writeFileSync(f, JSON.stringify(json,null,2)+'\n','utf8');
    changedFiles++;
  }
}

console.log(`[text-migrate] scanned=${scanned}`);
console.log(`[text-migrate] changedFiles=${changedFiles}`);
console.log(`[text-migrate] edits=${edits}`);
