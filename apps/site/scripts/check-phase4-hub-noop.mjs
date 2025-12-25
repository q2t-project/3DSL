// scripts/check-phase4-hub-noop.mjs
import { createViewerHub } from "../public/viewer/runtime/viewerHub.js";

// ------------------------------------------------------------
// Node 用: requestAnimationFrame / cancelAnimationFrame polyfill
// （テストではループ回さんので callback は呼ばへん）
// ------------------------------------------------------------
if (!globalThis.window) globalThis.window = globalThis;

if (typeof globalThis.requestAnimationFrame !== "function") {
  let rafId = 0;
  const cbs = new Map();

  globalThis.requestAnimationFrame = (cb) => {
    rafId += 1;
    cbs.set(rafId, cb);
    return rafId;
  };

  globalThis.cancelAnimationFrame = (id) => {
    cbs.delete(id);
  };

  globalThis.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
}

function fail(msg) {
  console.error("[phase4:hub-noop] FAIL:", msg);
  process.exit(1);
}
function ok(msg) {
  console.log("[phase4:hub-noop] OK:", msg);
}

function makeStubCore() {
  return {
    uiState: { mode: "macro", runtime: {}, selection: { uuid: null } },
    recomputeVisibleSet() { return { points: [], lines: [], aux: [] }; },
    cameraEngine: {
      getState() { return { fov: 50 }; },
      update() {},
    },
    frameController: { updatePlayback() {} },
    visibilityController: {
      isVisible() { return true; },
      setTypeFilter() {},
      getFilters() { return {}; },
    },
    selectionController: { select() {}, clear() {} },
    modeController: {
      set() {}, get() { return "macro"; }, canEnter() { return true; }, exit() {}, focus() {}
    },
  };
}

function makeStubRenderer() {
  return {
    resize() {},
    updateCamera() {},
    applyFrame() {},
    applySelectionHighlight() {},
    applyMicroFX() {},
    render() {},
    pickObjectAt() {
      return { uuid: "x", kind: "points", object: { userData: { uuid: "x", kind: "points" } } };
    },
    dispose() {},
  };
}

function main() {
  const hub = createViewerHub({ core: makeStubCore(), renderer: makeStubRenderer() });

  // start/stop idempotent
  hub.start();
  hub.start();
  hub.stop();
  hub.stop();

  // dispose idempotent + no-op
  hub.dispose();
  hub.dispose();

  // after dispose: should not throw
  try { hub.start(); } catch { fail("start after dispose threw"); }
  try { hub.stop(); } catch { fail("stop after dispose threw"); }
  try { hub.pickObjectAt(0, 0); } catch { fail("pickObjectAt after dispose threw"); }
  try { hub.resize(100, 100, 1); } catch { fail("resize after dispose threw"); }

  ok("dispose no-op + idempotency looks consistent.");
}

main();
