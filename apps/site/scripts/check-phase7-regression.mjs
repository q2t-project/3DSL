// scripts/check-phase7-regression.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const passthruArgs = process.argv.slice(2);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  return r.status === 0;
}

function runNodeIfExists(scriptPath, extraArgs = []) {
  if (!fs.existsSync(scriptPath)) {
    console.log(`[phase7] SKIP (missing) ${scriptPath}`);
    return true;
  }
  return run(process.execPath, [scriptPath, ...extraArgs]);
}

let ok = true;

// 1) フィクスチャ validate（schema + ref）
ok = runNodeIfExists(path.resolve("scripts/validate-3dss-fixtures.mjs"), ["--ref", ...passthruArgs]) && ok;

// 2) 既存の “境界・契約” チェック（存在する分だけ）
ok = runNodeIfExists(path.resolve("scripts/check-single-writer.mjs")) && ok;
ok = runNodeIfExists(path.resolve("scripts/check-phase2-core-contract.mjs")) && ok;
ok = runNodeIfExists(path.resolve("scripts/check-phase4-hub-contract.mjs")) && ok;
ok = runNodeIfExists(path.resolve("scripts/check-phase4-hub-noop.mjs")) && ok;

process.exit(ok ? 0 : 1);
