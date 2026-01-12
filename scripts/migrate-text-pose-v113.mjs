import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? ".";
const exts = new Set([".json"]);

function axisTokenToVec3(tok) {
  switch (tok) {
    case "x+": return [1, 0, 0];
    case "x-": return [-1, 0, 0];
    case "y+": return [0, 1, 0];
    case "y-": return [0, -1, 0];
    case "z+": return [0, 0, 1];
    case "z-": return [0, 0, -1];
    default: return null;
  }
}

function planeToPose(plane) {
  if (plane === "xy") return { mode: "fixed", front: [0, 0, 1], up: [0, 1, 0] };
  if (plane === "yz") return { mode: "fixed", front: [1, 0, 0], up: [0, 0, 1] };
  if (plane === "zx") return { mode: "fixed", front: [0, 1, 0], up: [0, 0, 1] };
  if (plane === "billboard") return { mode: "billboard" };
  return null;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function migratePoseIn(obj) {
  if (!obj || typeof obj !== "object") return;

  // 深掘り
  if (Array.isArray(obj)) return obj.forEach(migratePoseIn);

  // marker.text を見る
  const mk = obj.appearance?.marker;
  const txt = mk?.text;
  if (txt && typeof txt === "object") {
    // legacy plane -> pose
    if ("plane" in txt) {
      const p = planeToPose(txt.plane);
      if (p) txt.pose = p;
      delete txt.plane;
    }

    // pose 内の front/up がトークンなら vec3へ
    const pose = txt.pose;
    if (pose && typeof pose === "object") {
      if (typeof pose.front === "string") {
        const v = axisTokenToVec3(pose.front);
        if (v) pose.front = v;
      }
      if (typeof pose.up === "string") {
        const v = axisTokenToVec3(pose.up);
        if (v) pose.up = v;
      }
    }

    // pose が無いなら固定デフォルトを明示（統一方針）
    if (!txt.pose) {
      txt.pose = { mode: "fixed", front: [0, 1, 0], up: [0, 0, 1] };
    }
  }

  for (const v of Object.values(obj)) migratePoseIn(v);
}

let changed = 0;

for (const f of walk(root)) {
  if (!f.endsWith(".3dss.json")) continue;
  const raw = fs.readFileSync(f, "utf8");
  let j;
  try { j = JSON.parse(raw); } catch { continue; }

  const before = JSON.stringify(j);
  migratePoseIn(j);
  const after = JSON.stringify(j);

  if (before !== after) {
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n", "utf8");
    changed++;
  }
}

console.log("migrated files:", changed);
