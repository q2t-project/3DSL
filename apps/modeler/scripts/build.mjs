import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const r = spawnSync(process.execPath, [path.join(__dirname, "sync-standalone.mjs")], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
