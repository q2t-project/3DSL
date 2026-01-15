// packages/docs/docs/test/regressionRunner.js
// Browser-side regression runner for viewer harness.
//
// Usage (in dev harness page console):
//   const r = await import("/viewer/docs/test/regressionRunner.js?ts=" + Date.now());
//   await r.runAll(); // uses globalThis.__viewerHub by default
//
// Contract:
// - globalThis.__viewerHub should exist and be the hub instance (created by dev harness).

function getHub(hub) {
  const h = hub ?? globalThis.__viewerHub;
  if (!h) throw new Error("[regressionRunner] hub not found. Provide hub or set globalThis.__viewerHub");
  return h;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Minimal runner skeleton.
// Project-specific test list can be expanded later; keep this file stable and small.
export async function runAll(hub) {
  const h = getHub(hub);

  // Basic smoke: ensure hub has minimal surface.
  if (typeof h.load !== "function") throw new Error("[regressionRunner] hub.load missing");
  if (typeof h.start !== "function") throw new Error("[regressionRunner] hub.start missing");

  // If the hub was not started, start it (safe-noop in Node contract).
  try { h.start(); } catch {}

  // Give one frame-ish delay for any async init to settle.
  await sleep(0);

  return { ok: true, name: "regressionRunner", notes: "basic surface smoke only" };
}
