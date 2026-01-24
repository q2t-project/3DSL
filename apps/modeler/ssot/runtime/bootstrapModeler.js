// modeler/runtime/bootstrapModeler.js
// P0: minimal host/bootstrap that returns a hub-like handle.
// - provides start/stop/dispose/resize
// - provides pickObjectAt (raycast)
// - provides core facade (document / selection / lock / quickcheck / uiState / focusByIssue)
// NOTE: Import/prep/strict export are NOT implemented here yet (shell only).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function clampDpr(dpr) {
  const v = Number(dpr);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.max(1, Math.min(2, v));
}

function asEl(elOrId) {
  if (!elOrId) return null;
  if (typeof elOrId === "string") return document.getElementById(elOrId);
  return elOrId;
}

function getCanvasFromRoot(root) {
  if (!root) return null;
  const byRole = root.querySelector('[data-role="modeler-canvas"]');
  if (byRole && byRole instanceof HTMLCanvasElement) return byRole;
  const byId = root.querySelector("#modeler-canvas");
  if (byId && byId instanceof HTMLCanvasElement) return byId;
  return null;
}

function makeEmitter() {
  const map = new Map();
  return {
    on(type, fn) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(fn);
      return () => map.get(type)?.delete(fn);
    },
    emit(type, payload) {
      const set = map.get(type);
      if (!set) return;
      for (const fn of [...set]) {
        try { fn(payload); } catch (_e) {}
      }
    }
  };
}

function safePos(node) {
  const p = node?.appearance?.position || node?.position;
  if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  return [0, 0, 0];
}

function uuidOf(node) {
  return node?.meta?.uuid || node?.uuid || null;
}

function buildIndexByUuid(doc) {
  const idx = new Map();
  if (doc?.points && Array.isArray(doc.points)) {
    for (const p of doc.points) {
      const u = uuidOf(p);
      if (!u) continue;
      idx.set(u, p);
    }
  }
  return idx;
}

function resolveEndpoint(ep, pointIdx) {
  if (!ep || typeof ep !== "object") return null;
  if (Array.isArray(ep.coord) && ep.coord.length >= 3) return [Number(ep.coord[0])||0, Number(ep.coord[1])||0, Number(ep.coord[2])||0];
  const ref = ep.ref;
  if (typeof ref === "string" && pointIdx && pointIdx.has(ref)) return safePos(pointIdx.get(ref));
  return null;
}

function createCoreFacade(emitter) {
  let document3dss = null;
  let docLabel = "(unsaved)";
  let selection = [];
  const locked = new Set();
  let uiState = { activeTab: "points" };

  function setDocument(doc, meta = {}) {
    document3dss = doc;
    if (meta && typeof meta.label === "string") docLabel = meta.label;
    emitter.emit("document", document3dss);
  }

  function getDocument() {
    return document3dss;
  }

  function setSelection(uuids) {
    selection = Array.isArray(uuids) ? [...uuids] : [];
    emitter.emit("selection", selection);
  }

  function toggleLock(uuid) {
    if (!uuid) return;
    if (locked.has(uuid)) locked.delete(uuid);
    else locked.add(uuid);
    emitter.emit("lock", [...locked]);
  }

  function listLocks() {
    return [...locked];
  }

  function setUiState(partial) {
    uiState = { ...uiState, ...(partial || {}) };
    emitter.emit("uistate", uiState);
  }

  function getUiState() {
    return { ...uiState };
  }

  function runQuickCheck() {
    /**
     * QuickCheck is a permissive, non-blocking checker for Import/prep stage.
     * Output payload is fixed:
     *   { severity, uuid, path, expected, actual, message }
     */
    const issues = [];
    const push = ({ severity, uuid, path, expected, actual, message }) => {
      issues.push({ severity, uuid: uuid ?? null, path, expected, actual, message });
    };

    const doc = document3dss;
    if (!doc || typeof doc !== "object") {
      push({
        severity: "warn",
        uuid: null,
        path: "/",
        expected: "a 3DSS document object",
        actual: typeof doc,
        message: "No document loaded"
      });
      return issues;
    }

    // Root unknown fields (warn)
    const allowedRoot = new Set(["document_meta", "points", "lines", "aux"]);
    for (const k of Object.keys(doc)) {
      if (!allowedRoot.has(k)) {
        push({
          severity: "warn",
          uuid: null,
          path: `/${k}`,
          expected: "(known 3DSS root key)",
          actual: doc[k],
          message: `Unknown root field: ${k}`
        });
      }
    }

    // document_meta
    if (!doc.document_meta || typeof doc.document_meta !== "object") {
      push({
        severity: "warn",
        uuid: null,
        path: "/document_meta",
        expected: "object (required for Export)",
        actual: doc.document_meta,
        message: "document_meta is missing or not an object"
      });
    } else {
      const dm = doc.document_meta;
      if (typeof dm.schema_uri !== "string" || !dm.schema_uri) {
        push({
          severity: "warn",
          uuid: dm.document_uuid ?? null,
          path: "/document_meta/schema_uri",
          expected: "string (schema $id/#anchor)",
          actual: dm.schema_uri,
          message: "schema_uri is missing"
        });
      } else {
        // Unknown schema_uri is allowed (warn)
        const ok = dm.schema_uri.includes("3DSS.schema.json");
        if (!ok) {
          push({
            severity: "warn",
            uuid: dm.document_uuid ?? null,
            path: "/document_meta/schema_uri",
            expected: ".../3DSS.schema.json#...",
            actual: dm.schema_uri,
            message: "schema_uri does not look like 3DSS.schema.json (allowed, but check)"
          });
        }
      }
      if (typeof dm.document_uuid !== "string" || !dm.document_uuid) {
        push({
          severity: "warn",
          uuid: null,
          path: "/document_meta/document_uuid",
          expected: "string (UUID)",
          actual: dm.document_uuid,
          message: "document_uuid is missing"
        });
      }
    }

    // Arrays type check (warn)
    for (const k of ["points", "lines", "aux"]) {
      if (doc[k] != null && !Array.isArray(doc[k])) {
        push({
          severity: "warn",
          uuid: null,
          path: `/${k}`,
          expected: "array",
          actual: typeof doc[k],
          message: `${k} should be an array`
        });
      }
    }

    // UUID uniqueness and line endpoint refs
    const uuidSet = new Set();
    const allUuids = new Set();

    const collectUuids = (arr, kind) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const node = arr[i];
        const uuid = uuidOf(node);
        const basePath = `/${kind}/${i}`;
        if (!uuid) {
          push({
            severity: "warn",
            uuid: null,
            path: `${basePath}/(uuid)` ,
            expected: "uuid string",
            actual: uuid,
            message: "uuid is missing (Export will require it)"
          });
          continue;
        }
        allUuids.add(uuid);
        if (uuidSet.has(uuid)) {
          push({
            severity: "error",
            uuid,
            path: `${basePath}`,
            expected: "unique uuid",
            actual: uuid,
            message: "Duplicate uuid"
          });
        } else {
          uuidSet.add(uuid);
        }
      }
    };

    collectUuids(doc.points, "points");
    collectUuids(doc.lines, "lines");
    collectUuids(doc.aux, "aux");

    // line endpoints ref integrity
    if (Array.isArray(doc.lines)) {
      for (let i = 0; i < doc.lines.length; i++) {
        const l = doc.lines[i];
        const lUuid = uuidOf(l) ?? null;
        const basePath = `/lines/${i}`;
        for (const endKey of ["end_a", "end_b"]) {
          const end = l?.appearance?.[endKey];
          const ref = end?.ref;
          if (ref == null) continue;
          if (typeof ref !== "string") {
            push({
              severity: "warn",
              uuid: lUuid,
              path: `${basePath}/appearance/${endKey}/ref`,
              expected: "string uuid",
              actual: ref,
              message: "ref should be a uuid string"
            });
            continue;
          }
          if (!allUuids.has(ref)) {
            push({
              severity: "warn",
              uuid: lUuid,
              path: `${basePath}/appearance/${endKey}/ref`,
              expected: "existing uuid",
              actual: ref,
              message: "ref points to unknown uuid"
            });
          }
        }
      }
    }

    return issues;
  }

  function focusByIssue(issue) {
    // UI will handle actual focus; here we just emit for coordination.
    emitter.emit("focus", issue);
  }

  return {
    document: { get: getDocument, set: setDocument, getLabel: () => docLabel },
    selection: { get: () => [...selection], set: setSelection },
    lock: { toggle: toggleLock, list: listLocks },
    uiState: { get: getUiState, set: setUiState },
    quickcheck: { run: runQuickCheck },
    focusByIssue
  };
}

function createRenderer(canvas, emitter) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x0b0f14, 1);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
  camera.position.set(60, 40, 60);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // world axis and grid (no gizmo widget)
  const grid = new THREE.GridHelper(200, 20, 0x22334a, 0x162233);
  grid.position.set(0, 0, 0);
  scene.add(grid);

  const axes = new THREE.AxesHelper(80);
  scene.add(axes);

  const lightA = new THREE.DirectionalLight(0xffffff, 0.9);
  lightA.position.set(1, 2, 1);
  scene.add(lightA);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector2();

  function clearGroup() {
    while (modelGroup.children.length) {
      const c = modelGroup.children.pop();
      c.geometry && c.geometry.dispose && c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose && m.dispose());
        else c.material.dispose && c.material.dispose();
      }
    }
  }

  function setDocument(doc) {
    clearGroup();
    if (!doc || typeof doc !== "object") return;

    const pointIdx = buildIndexByUuid(doc);

    // points
    if (Array.isArray(doc.points)) {
      for (const p of doc.points) {
        const u = uuidOf(p);
        const [x, y, z] = safePos(p);
        const geo = new THREE.SphereGeometry(0.9, 14, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6, metalness: 0.0 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.userData.uuid = u;
        m.userData.kind = "point";
        modelGroup.add(m);
      }
    }

    // lines
    if (Array.isArray(doc.lines)) {
      for (const ln of doc.lines) {
        const u = uuidOf(ln);
        const a = resolveEndpoint(ln?.end_a, pointIdx);
        const b = resolveEndpoint(ln?.end_b, pointIdx);
        if (!a || !b) continue;
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a[0], a[1], a[2]),
          new THREE.Vector3(b[0], b[1], b[2])
        ]);
        const mat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(geo, mat);
        line.userData.uuid = u;
        line.userData.kind = "line";
        modelGroup.add(line);
      }
    }
  }

  let raf = 0;
  let running = false;

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    controls.update();
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    frame();
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize(width, height, dpr) {
    const dd = clampDpr(dpr);
    renderer.setPixelRatio(dd);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function pickObjectAt(ndcX, ndcY) {
    tmpV.set(ndcX, ndcY);
    raycaster.setFromCamera(tmpV, camera);
    const hits = raycaster.intersectObjects(modelGroup.children, true);
    if (!hits || hits.length === 0) return null;
    const h = hits[0];
    const uuid = h?.object?.userData?.uuid || null;
    const kind = h?.object?.userData?.kind || "unknown";
    if (!uuid) return null;
    return {
      uuid,
      kind,
      distance: h.distance,
      point: [h.point.x, h.point.y, h.point.z]
    };
  }

  // canvas pick event -> emitter
  canvas.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((ev.clientY - r.top) / r.height) * 2 - 1);
    const hit = pickObjectAt(x, y);
    if (hit) emitter.emit("picked", hit);
  });

  function dispose() {
    stop();
    clearGroup();
    controls.dispose();
    renderer.dispose();
  }

  return { start, stop, resize, dispose, setDocument, pickObjectAt };
}

/**
 * Port: entry.bootstrapModeler
 * @param {HTMLElement|string} rootElOrId
 * @param {Object} [options]
 * @returns {any} hub
 */
export function bootstrapModeler(rootElOrId, options = {}) {
  const root = asEl(rootElOrId);
  if (!root) throw new Error("bootstrapModeler: root element not found");
  const canvas = getCanvasFromRoot(root);
  if (!canvas) throw new Error("bootstrapModeler: canvas not found");

  const emitter = makeEmitter();
  const core = createCoreFacade(emitter);
  const renderer = createRenderer(canvas, emitter);

  // wire: when doc changes -> renderer
  emitter.on("document", (doc) => renderer.setDocument(doc));

  let disposed = false;

  const hub = {
    core,

    on: emitter.on,

    start() {
      if (disposed) return;
      renderer.start();
    },

    stop() {
      if (disposed) return;
      renderer.stop();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.dispose();
    },

    resize(width, height, dpr) {
      if (disposed) return;
      renderer.resize(width, height, dpr);
    },

    pickObjectAt(ndcX, ndcY) {
      if (disposed) return null;
      return renderer.pickObjectAt(ndcX, ndcY);
    }
  };

  // dev boot log
  if (options && options.devBootLog) {
    console.log("[BOOT] modeler bootstrap ok");
  }

  return hub;
}

/**
 * Convenience (not in manifest yet):
 * bootstrap + fetch document + set core.document
 */
export async function bootstrapModelerFromUrl(rootElOrId, url, options = {}) {
  const hub = bootstrapModeler(rootElOrId, options);
  if (url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`fetch failed ${r.status} ${url}`);
    const doc = await r.json();
    hub.core.document.set(doc, { source: "url", label: url });
  }
  return hub;
}
