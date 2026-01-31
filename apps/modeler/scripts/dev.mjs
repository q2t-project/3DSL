import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const publicDir = path.join(repoRoot, "apps", "modeler", "public");
const port = Number(process.env.PORT ?? 3000);

const argv = process.argv.slice(2);
const watchEnabled = argv.includes("--watch") || argv.includes("-w");

// SSOT inputs mirrored by sync-standalone.mjs
const watchRoots = [
  path.join(repoRoot, "apps", "modeler", "ssot"),
  path.join(repoRoot, "packages", "vendor"),
];

function runSync() {
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, "sync-standalone.mjs")],
    { stdio: "inherit" }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function debounce(fn, ms) {
  let t = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

function listDirsRecursive(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    out.push(cur);
    let ents;
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      if (!ent.isDirectory()) continue;
      const p = path.join(cur, ent.name);
      // skip common noise
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      stack.push(p);
    }
  }
  return out;
}

function startWatch(onChange) {
  const watchers = new Map();
  const schedule = debounce(onChange, 200);

  function addWatcher(dir, recursive) {
    if (watchers.has(dir)) return;
    try {
      const w = fs.watch(
        dir,
        recursive ? { recursive: true } : undefined,
        () => schedule()
      );
      w.on("error", () => {
        try {
          w.close();
        } catch {}
        watchers.delete(dir);
      });
      watchers.set(dir, w);
    } catch {
      // ignore
    }
  }

  // Prefer a single recursive watcher per root when supported (Windows/macOS).
  // Fallback: one watcher per directory (Linux).
  for (const root of watchRoots) {
    if (!fs.existsSync(root)) continue;
    let recursiveOk = false;
    try {
      // fs.watch will throw on unsupported options.
      addWatcher(root, true);
      recursiveOk = true;
    } catch {
      recursiveOk = false;
    }
    if (!recursiveOk) {
      for (const d of listDirsRecursive(root)) addWatcher(d, false);
    }
  }

  // Periodic rescan to pick up newly created directories in fallback mode.
  const interval = setInterval(() => {
    for (const root of watchRoots) {
      if (!fs.existsSync(root)) continue;
      // If we have a recursive watcher at the root, no need to rescan.
      if (watchers.has(root)) continue;
      for (const d of listDirsRecursive(root)) addWatcher(d, false);
    }
  }, 1500);

  return () => {
    clearInterval(interval);
    for (const w of watchers.values()) {
      try {
        w.close();
      } catch {}
    }
    watchers.clear();
  };
}

function mimeType(fp) {
  const ext = path.extname(fp).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".wasm":
      return "application/wasm";
    default:
      return "application/octet-stream";
  }
}

function safeResolve(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p.startsWith("/")) p = p.slice(1);
  p = p.replaceAll("\\", "/");
  const abs = path.resolve(publicDir, p);
  const rel = path.relative(publicDir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return abs;
}

function serveFile(res, fp) {
  const st = fs.statSync(fp);
  res.writeHead(200, {
    "Content-Type": mimeType(fp),
    "Content-Length": st.size,
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(fp).pipe(res);
}

function handle(req, res) {
  try {
    const abs = safeResolve(req.url ?? "/");
    if (!abs) {
      res.writeHead(400);
      res.end("bad request");
      return;
    }

    let fp = abs;
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
      const i1 = path.join(fp, "index.html");
      if (fs.existsSync(i1)) fp = i1;
    }

    if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    serveFile(res, fp);
  } catch (e) {
    res.writeHead(500);
    res.end("internal error");
    console.error(e);
  }
}

runSync();

if (watchEnabled) {
  const close = startWatch(() => {
    try {
      runSync();
    } catch {
      // keep server alive even if sync fails; error already printed by sync script.
    }
  });
  process.on("SIGINT", () => {
    try {
      close();
    } finally {
      process.exit(0);
    }
  });
  console.log("[modeler dev] watch: ON (ssot/vendor -> public mirror)");
}

http
  .createServer(handle)
  .listen(port, () => {
    console.log(`[modeler dev] serving ${publicDir}`);
    console.log(`[modeler dev] http://localhost:${port}`);
  });
