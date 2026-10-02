#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VIEWER_BRIDGE_V1_COMMAND,
  VIEWER_BRIDGE_V1_EVENT,
  createViewerBridgeV1,
} from "../../../viewer/ssot/viewerBridgeV1.js";

const saved = {
  location: globalThis.location,
  parent: globalThis.parent,
  addEventListener: globalThis.addEventListener,
  removeEventListener: globalThis.removeEventListener,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

let listener = null;
const parentEvents = [];
const sourceEvents = [];

Object.defineProperty(globalThis, "location", { configurable: true, value: { origin: "https://3dsl.jp" } });
Object.defineProperty(globalThis, "parent", {
  configurable: true,
  value: { postMessage: (msg, origin) => parentEvents.push({ msg, origin }) },
});
globalThis.addEventListener = (type, fn) => { if (type === "message") listener = fn; };
globalThis.removeEventListener = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

let selection = { uuid: null, kind: null };
let mode = "macro";
let frame = 0;
let loadedUrl = null;

const hub = {
  core: {
    selection: { get: () => selection },
    mode: {
      get: () => mode,
      focus: (uuid, kind) => { selection = { uuid, kind: kind ?? null }; mode = "micro"; },
      exit: () => { mode = "macro"; },
    },
    frame: {
      getActive: () => frame,
      setActive: (n) => { frame = n; },
    },
    camera: {
      setViewByName: () => {},
      setViewPreset: () => {},
    },
  },
};
let host = { hub };

const bridge = createViewerBridgeV1({
  getHost: () => host,
  isProbablyUrlish: (u) => typeof u === "string" && u.startsWith("/"),
  remount: async (opts) => {
    loadedUrl = opts.modelUrl ?? null;
    host = { hub };
    return host;
  },
});
bridge.start();
assert.ok(listener, "bridge message listener installed");
assert.equal(parentEvents[0]?.msg?.type, VIEWER_BRIDGE_V1_EVENT);
assert.equal(parentEvents[0]?.msg?.event, "ready");

async function command(requestId, command, payload) {
  listener({
    origin: "https://3dsl.jp",
    data: { type: VIEWER_BRIDGE_V1_COMMAND, version: "1.0", request_id: requestId, command, payload },
    source: { postMessage: (msg, origin) => sourceEvents.push({ msg, origin }) },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return sourceEvents.find((x) => x.msg.request_id === requestId && x.msg.event === "commandResult")?.msg;
}

let res = await command("1", "focus", { uuid: "u1", kind: "points" });
assert.equal(res?.payload?.ok, true);
assert.equal(mode, "micro");
assert.equal(selection.uuid, "u1");

res = await command("2", "setFrame", { frame: 7 });
assert.equal(res?.payload?.ok, true);
assert.equal(frame, 7);

res = await command("3", "exitFocus", {});
assert.equal(res?.payload?.ok, true);
assert.equal(mode, "macro");

res = await command("4", "loadUrl", { modelUrl: "/_data/library/x/model.3dss.json" });
assert.equal(res?.payload?.ok, true);
assert.equal(loadedUrl, "/_data/library/x/model.3dss.json");

res = await command("5", "notACommand", {});
assert.equal(res?.payload?.ok, false);

bridge.dispose();

for (const [key, value] of Object.entries(saved)) {
  if (value === undefined) {
    try { delete globalThis[key]; } catch {}
  } else {
    try { Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); } catch {}
  }
}

console.log("viewer-bridge-v1 contract: PASS");
