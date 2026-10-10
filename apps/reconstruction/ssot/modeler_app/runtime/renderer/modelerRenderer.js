// modeler/runtime/renderer/modelerRenderer.js
// Renderer layer: three/webgl execution.
//
// IMPORTANT:
// - Do not query DOM here. Canvas element is provided by hub.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { lineCaptionStyle, plateRenderSpec, arrowPlacement } from "../../../shared/renderConventions.js";

// ------------------------------------------------------------
// Minimal text labels (Modeler)
//
// - Keep this renderer self-contained (no viewer label layer dependency).
// - Initial document labels share immutable atlas sources; edited labels stay
//   standalone. Textures are disposed when their label is replaced.
// - This is intentionally "read-only labels": editing UI comes later.
// ------------------------------------------------------------

function getDpr() {
  const dpr = Number(globalThis?.devicePixelRatio);
  return Number.isFinite(dpr) && dpr > 0 ? Math.min(2, Math.max(1, dpr)) : 1;
}

function createCanvas(w, h) {
  // Avoid DOM queries; creating an offscreen canvas is acceptable.
  try {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  } catch {}
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  } catch {
    return null;
  }
}

function makeTextSprite(text, opts = {}) {
  const t = text == null ? "" : String(text);
  if (!t) return null;

  const fontSize = Math.max(8, Math.min(64, Number(opts.fontSize) || 12));
  const padding = Math.max(2, Math.min(16, Number(opts.padding) || 4));
  const dpr = getDpr();

  const canvas = createCanvas(2, 2);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.font = `${Math.round(fontSize * dpr)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const metrics = ctx.measureText(t);
  const textW = Math.ceil((Number(metrics.width) || 0) + padding * 2 * dpr);
  const ascent = Number(metrics.actualBoundingBoxAscent);
  const descent = Number(metrics.actualBoundingBoxDescent);
  const textH = Math.ceil(((Number.isFinite(ascent) && Number.isFinite(descent)) ? (ascent + descent) : (fontSize * 1.2 * dpr)) + padding * 2 * dpr);

  canvas.width = Math.max(1, textW);
  canvas.height = Math.max(1, textH);

  // draw
  ctx.font = `${Math.round(fontSize * dpr)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // background (subtle)
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // outline
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, Math.round(2 * dpr));
  ctx.strokeStyle = "rgba(0,0,0,0.9)";

  // text
  ctx.fillStyle = "#ffffff";
  const cx = canvas.width / 2;
  const baselineY = (Number.isFinite(ascent) ? (padding * dpr + ascent) : (canvas.height / 2));
  ctx.strokeText(t, cx, baselineY);
  ctx.fillText(t, cx, baselineY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  try {
    if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  } catch {}

  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10_000;

  // scale in world units: keep roughly consistent with font size
  const aspect = (canvas.width / canvas.height) || 1;
  const hWorld = Number(opts.worldSize) > 0 ? Number(opts.worldSize) : Math.max(2, fontSize * 0.25);
  const wWorld = hWorld * aspect;
  sprite.scale.set(wWorld, hWorld, 1);
  sprite.userData.__labelTexture = texture;
  return sprite;
}

function map3dssDirToThree(dir3dss) {
  const x = Number(dir3dss?.[0]) || 0;
  const y = Number(dir3dss?.[1]) || 0;
  const z = Number(dir3dss?.[2]) || 0;
  // Viewer + Modeler convention: Z-up in three.js (camera.up = (0,0,1)).
  // Therefore, 3DSS (x,y,z) maps directly to three (x,y,z).
  return new THREE.Vector3(x, y, z);
}

function axisTokenToVec3(token) {
  const t = (typeof token === "string" ? token.trim().toLowerCase() : "");
  // support both "x+" and "+x" forms for preview convenience
  switch (t) {
    case "+x":
    case "x+": return [1, 0, 0];
    case "-x":
    case "x-": return [-1, 0, 0];
    case "+y":
    case "y+": return [0, 1, 0];
    case "-y":
    case "y-": return [0, -1, 0];
    case "+z":
    case "z+": return [0, 0, 1];
    case "-z":
    case "z-": return [0, 0, -1];
    default: return null;
  }
}

function normalizePoseFrontUpForPreview(rawPose) {
  if (!rawPose || typeof rawPose !== "object") return null;

  let front = rawPose.front;
  let up = rawPose.up;

  if (typeof front === "string") front = axisTokenToVec3(front);
  if (typeof up === "string") up = axisTokenToVec3(up);

  if (!Array.isArray(front) || front.length < 3) return null;
  if (!Array.isArray(up) || up.length < 3) return null;

  const fx = Number(front[0]) || 0;
  const fy = Number(front[1]) || 0;
  const fz = Number(front[2]) || 0;
  const ux = Number(up[0]) || 0;
  const uy = Number(up[1]) || 0;
  const uz = Number(up[2]) || 0;

  const f = new THREE.Vector3(fx, fy, fz);
  const u = new THREE.Vector3(ux, uy, uz);
  if (f.lengthSq() <= 1e-10 || u.lengthSq() <= 1e-10) return null;
  f.normalize();
  u.normalize();

  // Orthonormalize (avoid invalid front/up)
  const xAxis = new THREE.Vector3().copy(u).cross(f);
  if (xAxis.lengthSq() <= 1e-10) return null;
  xAxis.normalize();
  const yAxis = new THREE.Vector3().copy(f).cross(xAxis).normalize();

  const frontOut = [f.x, f.y, f.z];
  const upOut = [yAxis.x, yAxis.y, yAxis.z];

  return {
    front: frontOut,
    up: upOut,
    key: `${frontOut.join(",")};${upOut.join(",")}`,
  };
}

function parseAlign(align) {
  const raw = typeof align === "string" ? align : "";
  const parts = raw.split("&").map((v) => v.trim()).filter(Boolean);
  const h = parts.find((v) => v === "left" || v === "center" || v === "right") || "center";
  const v = parts.find((v) => v === "top" || v === "middle" || v === "bottom" || v === "baseline") || "middle";
  return { h, v };
}

function applyAlignToSprite(sprite, align) {
  if (!sprite) return;
  const { h, v } = parseAlign(align);
  // Sprite.center: (0,0)=bottom-left, (1,1)=top-right
  const cx = h === "left" ? 0 : (h === "right" ? 1 : 0.5);
  const cy = (v === "bottom" || v === "baseline") ? 0 : (v === "top" ? 1 : 0.5);
  try {
    sprite.center.set(cx, cy);
  } catch {}
}

function makeTextPlane(text, opts = {}) {
  const t = text == null ? "" : String(text);
  if (!t) return null;

  const fontSize = Math.max(8, Math.min(64, Number(opts.fontSize) || 12));
  const padding = Math.max(2, Math.min(16, Number(opts.padding) || 4));
  const dpr = getDpr();

  const canvas = createCanvas(2, 2);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.font = `${Math.round(fontSize * dpr)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const metrics = ctx.measureText(t);
  const textW = Math.ceil((Number(metrics.width) || 0) + padding * 2 * dpr);
  const ascent = Number(metrics.actualBoundingBoxAscent);
  const descent = Number(metrics.actualBoundingBoxDescent);
  const textH = Math.ceil(((Number.isFinite(ascent) && Number.isFinite(descent)) ? (ascent + descent) : (fontSize * 1.2 * dpr)) + padding * 2 * dpr);

  canvas.width = Math.max(1, textW);
  canvas.height = Math.max(1, textH);

  // draw
  ctx.font = `${Math.round(fontSize * dpr)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, Math.round(2 * dpr));
  ctx.strokeStyle = "rgba(0,0,0,0.9)";

  ctx.fillStyle = "#ffffff";
  const cx = canvas.width / 2;
  const baselineY = (Number.isFinite(ascent) ? (padding * dpr + ascent) : (canvas.height / 2));
  ctx.strokeText(t, cx, baselineY);
  ctx.fillText(t, cx, baselineY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  try {
    if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  } catch {}

  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  // A label is one zero-thickness plane. With culling disabled, one pass draws
  // either face; separate back/front passes add no surface or blend result.
  // Keep DoubleSide so authored fixed text remains visible from either side.
  mat.forceSinglePass = true;

  // scale in world units: keep roughly consistent with font size
  const aspect = (canvas.width / canvas.height) || 1;
  const hWorld = Number(opts.worldSize) > 0 ? Number(opts.worldSize) : Math.max(2, fontSize * 0.25);
  const wWorld = hWorld * aspect;

  const { h, v } = parseAlign(opts.align);
  let ox = 0;
  let oy = 0;
  // geometry anchor: default center/middle at origin.
  if (h === "left") ox = +wWorld / 2;
  else if (h === "right") ox = -wWorld / 2;
  if (v === "bottom" || v === "baseline") oy = +hWorld / 2;
  else if (v === "top") oy = -hWorld / 2;

  const sharedGeometry = typeof opts.geometryFactory === "function";
  const geo = sharedGeometry ? opts.geometryFactory(wWorld, hWorld, ox, oy)
    : new THREE.PlaneGeometry(wWorld, hWorld);
  if (!sharedGeometry && (ox || oy)) geo.translate(ox, oy, 0);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10_000;
  mesh.userData.__labelTexture = texture;
  mesh.userData.__labelW = wWorld;
  mesh.userData.__labelH = hWorld;
  mesh.userData.__labelSharedGeometry = sharedGeometry;
  return mesh;
}

function applyPoseToLabelObject(obj, pose) {
  if (!obj) return;
  const front = pose?.front;
  const up = pose?.up;
  if (!Array.isArray(front) || front.length < 3) return;
  if (!Array.isArray(up) || up.length < 3) return;

  const f = map3dssDirToThree(front);
  const u = map3dssDirToThree(up);
  if (f.lengthSq() <= 1e-10 || u.lengthSq() <= 1e-10) return;
  f.normalize();
  u.normalize();

  // Orthonormal basis: z=front, y=up (re-orthogonalized), x = y x z
  const xAxis = new THREE.Vector3().copy(u).cross(f);
  if (xAxis.lengthSq() <= 1e-10) return;
  xAxis.normalize();
  const yAxis = new THREE.Vector3().copy(f).cross(xAxis).normalize();

  const m = new THREE.Matrix4();
  m.makeBasis(xAxis, yAxis, f);
  obj.quaternion.setFromRotationMatrix(m);
}

function clampDpr(dpr) {
  const v = Number(dpr);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.max(1, Math.min(2, v));
}

function map3dssToThree(pos3dss) {
  const x = Number(pos3dss?.[0]) || 0;
  const y = Number(pos3dss?.[1]) || 0;
  const z = Number(pos3dss?.[2]) || 0;
  // Viewer + Modeler convention: Z-up in three.js (camera.up = (0,0,1)).
  // Therefore, 3DSS (x,y,z) maps directly to three (x,y,z).
  return new THREE.Vector3(x, y, z);
}

function mapThreeTo3dss(v3) {
  const x = Number(v3?.x) || 0;
  const y = Number(v3?.y) || 0;
  const z = Number(v3?.z) || 0;
  // Viewer + Modeler convention: Z-up in three.js (camera.up = (0,0,1)).
  // Therefore, three (x,y,z) maps directly to 3DSS (x,y,z).
  return [x, y, z];
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

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x0b0f14, 1);
  // Keep controls/animation ticking, but do not resubmit an unchanged scene.
  let needsRender = true;
  const invalidate = () => { needsRender = true; };
  const renderStats = { draws: 0, renderCpuMs: 0, lastRenderMs: 0, firstRenderStartMs: null, lastRenderEndMs: null };
  canvas.addEventListener?.("webglcontextrestored", invalidate);

  const scene = new THREE.Scene();

  // Coordinate convention (match viewer):
  // - Use Z-up in three.js by setting camera.up = (0,0,1).
  // - Treat 3DSS coordinates as three.js coordinates directly: (x,y,z) -> (x,y,z).
  // - This avoids silent handedness flips from axis swaps and keeps viewer/modeler consistent.

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
  camera.up.set(0, 0, 1); // Z-up (match viewer)
  camera.position.set(-60, 40, 60);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.addEventListener?.("change", invalidate);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.update();

  const focusAnim = {
    active: false,
    t0: 0,
    duration: 0,
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    fromCam: new THREE.Vector3(),
    toCam: new THREE.Vector3(),
  };

  // world axis and grid (no gizmo widget)
  // GridHelper defaults Y-up (grid on XZ). Rotate to Z-up (grid on XY), matching viewer.
  const grid = new THREE.GridHelper(200, 20, 0x22334a, 0x162233);
  grid.rotation.x = Math.PI / 2;
  grid.position.set(0, 0, 0);
  scene.add(grid);

  // Axis helper: X=blue, Y=green, Z=red (3DSS convention)
  const axisLen = 80;
  const axisGroup = new THREE.Group();
  const mkAxis = (dir, color) => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(axisLen),
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geom, mat);
  };
  axisGroup.add(mkAxis(new THREE.Vector3(1, 0, 0), 0x2b8cff)); // X (3DSS X)
  axisGroup.add(mkAxis(new THREE.Vector3(0, 1, 0), 0x33ff66)); // Y
  axisGroup.add(mkAxis(new THREE.Vector3(0, 0, 1), 0xff3333)); // Z
  scene.add(axisGroup);

  // World axis mode (match viewer vocabulary): off | fixed | full_view
  // - off: hide grid+axis
  // - fixed: constant size at origin
  // - full_view: scale helpers relative to camera distance
  /** @type {"off"|"fixed"|"full_view"} */
  let worldAxisMode = "fixed";

  function applyWorldAxisMode() {
    const mode = worldAxisMode;
    const on = mode !== "off";
    grid.visible = on;
    axisGroup.visible = on;
    if (!on) return;

    let s = 1;
    if (mode === "full_view") {
      try {
        const dist = camera.position.distanceTo(controls.target);
        // Heuristic: at dist=60 => scale=1, increase with distance.
        s = Math.max(1, Math.min(12, dist / 60));
      } catch {}
    }
    try { axisGroup.scale.setScalar(s); } catch {}
    try { grid.scale.setScalar(s); } catch {}
  }

  function setWorldAxisMode(mode) {
    const m = String(mode || "").toLowerCase();
    worldAxisMode = (m === "off" || m === "fixed" || m === "full_view") ? m : "fixed";
    applyWorldAxisMode();
    invalidate();
  }

  const lightA = new THREE.DirectionalLight(0xffffff, 0.9);
  lightA.position.set(1, 2, 1);
  scene.add(lightA);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // text labels are managed separately from modelGroup so pick doesn't hit them
  const labelsGroup = new THREE.Group();
  labelsGroup.renderOrder = 9_000;
  scene.add(labelsGroup);

  // uuid -> object3d (for fast visibility updates)
  const objByUuid = new Map();

  // uuid -> label sprite (points + lines)
  const labelByUuid = new Map();

  // uuid -> base material color (to restore after highlight)
  const baseColorByUuid = new Map();

  // uuid -> 3DSS position (only for points/aux, used for transform preview)
  const pos3dssByUuid = new Map();
  const positionPreviewOriginals = new Map();
  let renderWarnings = [];

  // list of line objects (for fast endpoint updates during transforms)
  const lineObjects = [];

  // Primitive vertices are immutable; only object transforms/materials change.
  // Share identical constructor inputs within this document, then release once.
  const primitiveGeometries = new Map();
  function primitiveGeometry(kind, args) {
    // Retain legacy constructor behavior for non-numeric inputs without aliases
    // from JSON's conversion of undefined/NaN/Infinity to null.
    const key = args.every(Number.isFinite) ? JSON.stringify([kind, ...args]) : null;
    if (key && primitiveGeometries.has(key)) return primitiveGeometries.get(key);
    const geometry = new THREE[kind](...args);
    if (key) primitiveGeometries.set(key, geometry);
    return geometry;
  }

  // Initial label vertices never change: size/alignment are baked into the
  // geometry, while pose and placement belong to each independent object.
  // Sharing exact dimensions avoids one GPU vertex/index allocation per label.
  // Preview replacements remain standalone; cached shapes live for one document.
  const labelPlaneGeometries = new Map();
  function labelPlaneGeometry(width, height, ox, oy) {
    const key = JSON.stringify([width, height, ox, oy]);
    let geometry = labelPlaneGeometries.get(key);
    if (!geometry) {
      geometry = new THREE.PlaneGeometry(width, height);
      if (ox || oy) geometry.translate(ox, oy, 0);
      labelPlaneGeometries.set(key, geometry);
    }
    return geometry;
  }

  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector2();

  // Frame filtering (appearance.frames)
  let currentFrameIndex = 0;
  let uiHiddenSet = new Set();
  let uiSoloUuid = null;
  let explorationScope = null;
  let currentSelection = [];

  function framesAllows(frames, frameIndex) {
    if (frames == null) return true;
    if (typeof frames === 'number' && Number.isFinite(frames)) return Math.trunc(frames) === Math.trunc(frameIndex);
    if (typeof frames === 'string' && frames.trim() && Number.isFinite(Number(frames))) return Math.trunc(Number(frames)) === Math.trunc(frameIndex);
    if (Array.isArray(frames)) {
      const fi = Math.trunc(frameIndex);
      for (const v of frames) {
        if (typeof v === 'number' && Number.isFinite(v) && Math.trunc(v) == fi) return true;
        if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) && Math.trunc(Number(v)) == fi) return true;
      }
      return false;
    }
    return true;
  }

  function baseVisibleFor(uuid) {
    const obj = objByUuid.get(uuid);
    if (!obj) return false;
    const visFlag = obj.userData?.__docVisible;
    const docVisible = (visFlag === undefined) ? true : !!visFlag;
    const frames = obj.userData?.__docFrames;
    return docVisible && framesAllows(frames, currentFrameIndex);
  }

  function recomputeVisibility() {
    invalidate();
    for (const [uuid, obj] of objByUuid.entries()) {
      let vis = baseVisibleFor(uuid);
      if (uiHiddenSet.has(uuid)) vis = false;
      if (uiSoloUuid) vis = (uuid === uiSoloUuid) && vis;
      if (explorationScope && !explorationScope.has(uuid)) vis = false;
      obj.visible = !!vis;
      const label = labelByUuid.get(uuid);
      if (label) label.visible = !!vis;
    }

    // Ensure line labels follow line visibility even if line uuid differs
    for (const lnObj of lineObjects) {
      const u = lnObj?.userData?.uuid;
      if (!u) continue;
      const label = labelByUuid.get(u);
      if (label) label.visible = !!lnObj.visible;
    }
  }

  function setFrameIndex(frameIndex) {
    const value = Number(frameIndex);
    const fi = Math.max(-64, Math.min(63, Number.isFinite(value) ? Math.trunc(value) : 0));
    if (fi === currentFrameIndex) return;
    currentFrameIndex = fi;
    recomputeVisibility();
  }

  function setExplorationScope(ids) {
    explorationScope = Array.isArray(ids) ? new Set(ids.map(String)) : null;
    recomputeVisibility();
  }

  function clearGroup() {
    invalidate();
    const disposedGeometries = new Set();
    objByUuid.clear();
    labelByUuid.clear();
    baseColorByUuid.clear();
    pos3dssByUuid.clear();
    positionPreviewOriginals.clear();
    renderWarnings = [];
    lineObjects.length = 0;
    while (modelGroup.children.length) {
      const c = modelGroup.children[modelGroup.children.length - 1];
      modelGroup.remove(c);
      c.traverse((obj) => {
        if (obj.geometry && !disposedGeometries.has(obj.geometry)) {
          disposedGeometries.add(obj.geometry);
          obj.geometry.dispose?.();
        }
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
        else obj.material?.dispose?.();
      });
    }
    primitiveGeometries.clear();

    while (labelsGroup.children.length) {
      const s = labelsGroup.children[labelsGroup.children.length - 1];
      labelsGroup.remove(s);
      disposeLabelObject(s);
    }
    for (const geometry of labelPlaneGeometries.values()) geometry.dispose();
    labelPlaneGeometries.clear();
  }

  function getPointLabelText(p) {
    const t = p?.appearance?.marker?.text?.content;
    if (typeof t === "string" && t.trim()) return t.trim();
    const n = p?.signification?.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    return "";
  }

  // Pack only the initial, immutable label images. Each label remains a distinct
  // Sprite/plane with its original geometry, order, visibility and native raster
  // size. Texture clones share a Three Source (and its reference-counted GPU
  // storage); caption edits deliberately create a new standalone texture.
  function packInitialLabelTextures() {
    const maxSize = Math.min(2048, Math.floor(Number(renderer.capabilities?.maxTextureSize) || 2048));
    if (maxSize < 4) return;
    const entries = [];
    for (const label of labelsGroup.children) {
      const texture = label?.material?.map;
      const canvas = texture?.image;
      const w = Number(canvas?.width), h = Number(canvas?.height);
      if (!texture?.isCanvasTexture || !Number.isInteger(w) || !Number.isInteger(h) ||
          w < 1 || h < 1 || w + 2 > maxSize || h + 2 > maxSize) continue;
      // Leave unsupported canvas implementations on the original path.
      try { if (typeof canvas.getContext?.("2d")?.drawImage !== "function") continue; }
      catch { continue; }
      entries.push({ label, texture, canvas, w, h });
    }
    if (entries.length < 2) return;
    // Sorting packing metadata does not reorder scene objects or transparent
    // labels. One replicated edge pixel protects linear sampling at each side.
    entries.sort((a, b) => Number(b.label.visible) - Number(a.label.visible) || b.h - a.h || b.w - a.w);
    let page = [], x = 0, y = 0, rowH = 0, pageW = 0, pageH = 0;

    function commitPage() {
      if (page.length < 2) return;
      let atlas = null;
      const replacements = [];
      try {
        const canvas = createCanvas(pageW, pageH);
        const ctx = canvas?.getContext?.("2d");
        if (!ctx || typeof ctx.drawImage !== "function") return;
        ctx.imageSmoothingEnabled = false;
        for (const e of page) {
          const { canvas: src, w, h, x, y } = e;
          ctx.drawImage(src, x, y);
          ctx.drawImage(src, 0, 0, w, 1, x, y - 1, w, 1);
          ctx.drawImage(src, 0, h - 1, w, 1, x, y + h, w, 1);
          ctx.drawImage(src, 0, 0, 1, h, x - 1, y, 1, h);
          ctx.drawImage(src, w - 1, 0, 1, h, x + w, y, 1, h);
          for (const [sx, sy, dx, dy] of [
            [0, 0, x - 1, y - 1], [w - 1, 0, x + w, y - 1],
            [0, h - 1, x - 1, y + h], [w - 1, h - 1, x + w, y + h]
          ]) ctx.drawImage(src, sx, sy, 1, 1, dx, dy, 1, 1);
        }
        atlas = new THREE.CanvasTexture(canvas);
        for (const e of page) {
          // Preserve all sampler/color parameters. Source sharing is independent
          // of each label's UV transform; all clones are ready before rendering.
          const texture = e.texture.clone();
          texture.source = atlas.source;
          texture.repeat.set(e.w / pageW, e.h / pageH);
          texture.offset.set(e.x / pageW, texture.flipY ? 1 - (e.y + e.h) / pageH : e.y / pageH);
          texture.needsUpdate = true;
          replacements.push({ e, texture });
        }
      } catch {
        // Page transaction: failed copies/allocations never replace a label.
        for (const { texture } of replacements) try { texture.dispose(); } catch {}
        try { atlas?.dispose(); } catch {}
        return;
      }
      for (const { e, texture } of replacements) {
        e.label.material.map = texture;
        e.label.userData.__labelTexture = texture;
        e.label.userData.__labelAtlasRect = { x: e.x, y: e.y, w: e.w, h: e.h };
        try { e.texture.dispose(); } catch {}
        // Do not retain thousands of separate canvas backing stores after copy.
        e.canvas = null;
        e.texture = null;
      }
      // This root texture is never initialized in WebGL. Used slices own the
      // shared Source; their normal disposal releases GPU storage exactly once.
      try { atlas?.dispose(); } catch {}
    }

    for (const e of entries) {
      const w = e.w + 2, h = e.h + 2;
      // Preserve the standalone path's first-frame upload boundary: initially
      // hidden labels get separate pages, uploaded only if later shown.
      if (page.length && page[0].label.visible !== e.label.visible) {
        commitPage();
        page = []; x = 0; y = 0; rowH = 0; pageW = 0; pageH = 0;
      }
      if (x + w > maxSize) { x = 0; y += rowH; rowH = 0; }
      if (y + h > maxSize) {
        commitPage();
        page = []; x = 0; y = 0; rowH = 0; pageW = 0; pageH = 0;
      }
      e.x = x + 1; e.y = y + 1;
      page.push(e);
      x += w; rowH = Math.max(rowH, h);
      pageW = Math.max(pageW, x); pageH = Math.max(pageH, y + h);
    }
    commitPage();
  }

  function getLabelTextureStats() {
    const all = new Set(), visible = new Set(), atlases = new Set();
    let labels = 0, visibleLabels = 0, atlasLabels = 0;
    for (const label of labelsGroup.children) {
      const source = label.material?.map?.source;
      if (!source) continue;
      labels++; all.add(source);
      if (label.visible) { visibleLabels++; visible.add(source); }
      if (label.userData.__labelAtlasRect) { atlasLabels++; atlases.add(source); }
    }
    const pixels = (sources) => [...sources].reduce((n, source) => n + (Number(source.data?.width) || 0) * (Number(source.data?.height) || 0), 0);
    return { totalLabels: labels, visibleLabels, uniqueSourceCount: all.size, visibleSourceCount: visible.size,
      atlasSlices: atlasLabels, atlasSources: atlases.size, standaloneLabels: labels - atlasLabels,
      totalSourcePixels: pixels(all), visibleSourcePixels: pixels(visible) };
  }

  function getLineLabelText(ln) {
    const ct = ln?.appearance?.caption_text;
    const t = ct?.content;
    if (typeof t === "string" && t.trim()) return t.trim();
    const c = ln?.signification?.caption;
    if (typeof c === "string" && c.trim()) return c.trim();
    return "";
  }

  function getAuxLabelText(ax) {
    const t = ax?.appearance?.marker?.text?.content;
    if (typeof t === "string" && t.trim()) return t.trim();
    const n = ax?.signification?.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    return "";
  }

  function setLabelForUuid(uuid, sprite) {
    const u = String(uuid || "");
    if (!u || !sprite) return;
    labelByUuid.set(u, sprite);
    sprite.userData.uuid = u;
    sprite.userData.kind = objByUuid.get(u)?.userData?.kind || "point";
    labelsGroup.add(sprite);
  }

  function updatePointLabelPosition(uuid) {
    const u = String(uuid || "");
    const s = labelByUuid.get(u);
    if (!s) return;
    const obj = objByUuid.get(u);
    if (!obj) return;
    s.position.copy(obj.position);
    // lift a bit in +Z (up)
    s.position.z += s.userData.__positionOffset ?? 2.2;
  }

  function updateLineLabelPosition(lineObj) {
    const u = lineObj?.userData?.uuid;
    if (!u) return;
    const s = labelByUuid.get(u);
    if (!s) return;
    const geo = lineObj?.geometry;
    const posAttr = geo?.getAttribute?.("position");
    if (!posAttr || posAttr.count < 2) return;
    const ax = posAttr.getX(0), ay = posAttr.getY(0), az = posAttr.getZ(0);
    const last = posAttr.count - 1;
    const bx = posAttr.getX(last), by = posAttr.getY(last), bz = posAttr.getZ(last);
    s.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
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
        const marker = p?.appearance?.marker || {};
        const common = marker.common || {};
        const radius = Number(marker.radius) > 0 ? Number(marker.radius) : 0.9;
        const primitive = marker.primitive || "sphere";
        const geo = primitive === "box" ? primitiveGeometry("BoxGeometry", [...(marker.size || [1.4, 1.4, 1.4])])
          : primitive === "cone" || primitive === "pyramid" ? primitiveGeometry("ConeGeometry", [radius, Number(marker.height) || 2, primitive === "pyramid" ? 4 : 14])
          : primitiveGeometry("SphereGeometry", [radius, 14, 10]);
        const baseColor = new THREE.Color(common.color || 0xdddddd).getHex();
        const opacity = primitive === "none" ? 0 : Number.isFinite(common.opacity) ? common.opacity : 1;
        const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.6, metalness: 0.0, transparent: opacity < 1, opacity, depthWrite: primitive !== "none", wireframe: !!common.wireframe });
        const m = new THREE.Mesh(geo, mat);
        const v = map3dssToThree([x, y, z]);
        m.position.copy(v);
        m.userData.uuid = u;
        m.userData.kind = "point";
        m.userData.__noPrimitive = primitive === "none";
        m.userData.__docVisible = (p?.appearance?.visible !== false);
        m.userData.__docFrames = p?.appearance?.frames ?? null;
        modelGroup.add(m);
        if (u) {
          objByUuid.set(u, m);
          baseColorByUuid.set(u, baseColor);
          pos3dssByUuid.set(u, [x, y, z]);

          const txt = getPointLabelText(p);
          if (txt) {
            const textStyle = marker.text || {};
            const worldSize = Number(textStyle.size) > 0 ? Number(textStyle.size) : 8;
            const opts = { fontSize: Math.max(8, Math.min(64, worldSize * 8)), worldSize, align: textStyle.align || "", geometryFactory: labelPlaneGeometry };
            const pose = normalizePoseFrontUpForPreview(textStyle.pose);
            const s = pose ? makeTextPlane(txt, opts) : makeTextSprite(txt, opts);
            if (s) {
              if (pose) applyPoseToLabelObject(s, pose);
              else applyAlignToSprite(s, textStyle.align);
              s.userData.__positionOffset = worldSize * 0.1;
              setLabelForUuid(u, s);
              updatePointLabelPosition(u);
            }
          }
        }
      }
    }


// Known XY plates are drawn at their declared size and position. Other aux
// modules retain the legacy fallback and are not claimed as contract support.
if (Array.isArray(doc.aux)) {
  for (const ax of doc.aux) {
    const u = uuidOf(ax);
    const origin = safePos(ax);
    const plate = ax?.appearance?.module?.plate;
    const supportedPlate = plate?.plane === "xy" && Array.isArray(plate.size) && plate.size.length === 2
      && plate.size.every(v => Number.isFinite(v) && v >= 0) && Array.isArray(plate.position);
    const plateSpec = plateRenderSpec(plate);
    const pos = supportedPlate ? origin.map((v,i)=>v+plateSpec.position[i]) : origin;
    if (!supportedPlate) renderWarnings.push({uuid:u,feature:"aux",message:"Unsupported auxiliary module uses a placeholder"});
    const geo = supportedPlate ? new THREE.PlaneGeometry(plate.size[0],plate.size[1]) : primitiveGeometry("BoxGeometry", [1.4,1.4,1.4]);
    const baseColor = supportedPlate ? 0x6daac8 : 0x99dd99;
    const mat = supportedPlate ? new THREE.MeshBasicMaterial({color:baseColor,side:THREE.DoubleSide,transparent:true,opacity:plate.opacity ?? ax.appearance.opacity ?? 0.2,depthWrite:false})
      : new THREE.MeshStandardMaterial({color:baseColor,roughness:0.7,metalness:0});
    const m = new THREE.Mesh(geo,mat);
    m.position.copy(map3dssToThree(pos));
    if(supportedPlate) {
      const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:baseColor}));
      edge.userData.uuid=u;edge.userData.kind="aux";m.add(edge);
      const rotation=ax?.appearance?.orientation;
      if(Array.isArray(rotation))m.rotation.set(...rotation.map(v=>Number(v)*Math.PI/180));
    }
    m.userData.uuid=u;m.userData.kind="aux";
    m.userData.__unsupportedAux=!supportedPlate;
    m.userData.__docVisible=(ax?.appearance?.visible!==false);
    m.userData.__docFrames=ax?.appearance?.frames??null;
    modelGroup.add(m);
    if(u) {
      objByUuid.set(u,m);baseColorByUuid.set(u,baseColor);pos3dssByUuid.set(u,pos);
      const txt=getAuxLabelText(ax);
      if(typeof txt==="string" && txt.trim()) {
        const label=makeTextSprite(txt.trim(),{fontSize:12});
        if(label){setLabelForUuid(u,label);updatePointLabelPosition(u);}
      }
    }
  }
}

    // lines
    if (Array.isArray(doc.lines)) {
      for (const ln of doc.lines) {
        const u = uuidOf(ln);
        const a = resolveEndpoint(ln?.appearance?.end_a ?? ln?.end_a, pointIdx);
        const b = resolveEndpoint(ln?.appearance?.end_b ?? ln?.end_b, pointIdx);
        if (!a || !b) continue;
        const aV = map3dssToThree(a);
        const bV = map3dssToThree(b);
        const intermediates = ln?.appearance?.line_type === "polyline" && Array.isArray(ln?.appearance?.geometry?.polyline_points)
          ? ln.appearance.geometry.polyline_points.filter((v) => Array.isArray(v) && v.length >= 2 && v.every(Number.isFinite)).map((v) => map3dssToThree(v)) : [];
        const vertices = [aV, ...intermediates, bV].filter((v, i, all) => i === 0 || v.distanceToSquared(all[i - 1]) > 1e-12);
        const geo = new THREE.BufferGeometry().setFromPoints(vertices);
        const baseColor = new THREE.Color(ln?.appearance?.color || 0x88aaff).getHex();
        const opacity = Number.isFinite(ln?.appearance?.opacity) ? ln.appearance.opacity : 0.9;
        const style = ln?.appearance?.line_style || "solid";
        const mat = style === "dashed" || style === "dotted" ? new THREE.LineDashedMaterial({ color: baseColor, transparent: true, opacity, dashSize: style === "dotted" ? 0.3 : 2, gapSize: 1 })
          : new THREE.LineBasicMaterial({ color: baseColor, transparent: true, opacity: style === "none" ? 0 : opacity });
        const line = new THREE.Line(geo, mat);
        if (style === "dashed" || style === "dotted") line.computeLineDistances();
        line.userData.uuid = u;
        line.userData.kind = "line";
        line.userData.__docVisible = (ln?.appearance?.visible !== false);
        line.userData.__docFrames = ln?.appearance?.frames ?? null;
        const endA = ln?.appearance?.end_a ?? ln?.end_a;
        const endB = ln?.appearance?.end_b ?? ln?.end_b;
        line.userData.endARef = typeof endA?.ref === "string" ? endA.ref : null;
        line.userData.endBRef = typeof endB?.ref === "string" ? endB.ref : null;
        line.userData.a3dss = Array.isArray(a) ? [...a] : null;
        line.userData.b3dss = Array.isArray(b) ? [...b] : null;
        line.userData.arrow = ln?.appearance?.arrow || null;
        line.userData.sense = ln?.signification?.sense;
        if (!["straight", "polyline"].includes(ln?.appearance?.line_type || "straight")) renderWarnings.push({uuid:u,feature:"line_type",value:ln.appearance.line_type});
        if (!["solid", "dashed", "dotted", "none"].includes(style)) renderWarnings.push({uuid:u,feature:"line_style",value:style});
        if (ln?.appearance?.arrow?.primitive === "line") renderWarnings.push({uuid:u,feature:"arrow.line",message:"Rendered as a cone approximation"});
        rebuildLineArrows(line);
        modelGroup.add(line);
        if (u) {
          objByUuid.set(u, line);
          baseColorByUuid.set(u, baseColor);
        }
        lineObjects.push(line);
        // line caption label (at midpoint)
        if (u) {
          const txt = getLineLabelText(ln);
          if (txt) {
            const ct = ln?.appearance?.caption_text;
            const style = lineCaptionStyle(ct);
            const worldSize = style.worldSize;
            const fontSize = style.fontSize;
            const poseRaw = style.pose;
            const align = ct && typeof ct === "object" ? ct.align : null;
            const alignKey = typeof align === "string" ? align : "";
            // Support both vec3 arrays and axis tokens (legacy / draft convenience).
            const poseNorm = normalizePoseFrontUpForPreview(poseRaw);
            const wantPose = !!poseNorm;

            const label = wantPose
              ? makeTextPlane(txt, { fontSize, worldSize, align: alignKey, geometryFactory: labelPlaneGeometry })
              : makeTextSprite(txt, { fontSize, worldSize });
            if (label) {
              label.userData.__labelText = txt;
              label.userData.__labelFontSize = fontSize;
              label.userData.__labelWorldSize = worldSize;
              label.userData.__labelAlign = alignKey;
              label.userData.__labelPoseKey = wantPose ? String(poseNorm.key || "") : "";
              if (wantPose) {
                applyPoseToLabelObject(label, poseNorm);
              } else if (alignKey && label?.isSprite) {
                applyAlignToSprite(label, alignKey);
              }
              setLabelForUuid(u, label);
              updateLineLabelPosition(line);
            }
          }
        }
      }
    }
    recomputeVisibility();
    packInitialLabelTextures();
    setSelection(currentSelection);
  }

  function setSelection(selection) {
    invalidate();
    currentSelection = Array.isArray(selection) ? selection.map(String) : [];
    const sel = new Set(Array.isArray(selection) ? selection.map(String) : []);
    for (const [uuid, obj] of objByUuid.entries()) {
      const base = baseColorByUuid.get(uuid);
      const isSel = sel.has(uuid);
      const mat = obj?.material;
      if (!mat) continue;
      if (obj.userData?.__noPrimitive) mat.opacity = isSel ? 0.6 : 0;

      // Highlight by color swap only (simple + robust).
      const highlight = obj?.userData?.kind === "line" ? 0xff8844 : 0xffcc33;
      const targetColor = isSel ? highlight : base;
      if (!Number.isFinite(targetColor)) continue;

      try {
        if (Array.isArray(mat)) {
          for (const m of mat) {
            if (m?.color) m.color.setHex(targetColor);
          }
        } else {
          if (mat?.color) mat.color.setHex(targetColor);
        }
      } catch {}
    }
  }

  /**
   * Focus camera controls target on an object.
   * @param {string} uuid
   * @param {{ smooth?: boolean, durationMs?: number }=} opts
   */
  function focusOnUuid(uuid, opts) {
    const u = String(uuid || "");
    if (!u) return false;
    const obj = objByUuid.get(u);
    if (!obj) return false;
    const pos = new THREE.Vector3();
    try { obj.getWorldPosition(pos); } catch { return false; }
    invalidate();
    // Line vertices are in world coordinates; Object3D.position is their origin.
    if (obj.userData?.kind === "line") {
      obj.geometry?.computeBoundingBox?.();
      if (obj.geometry?.boundingBox && !obj.geometry.boundingBox.isEmpty()) {
        obj.geometry.boundingBox.getCenter(pos);
        obj.localToWorld(pos);
      }
    }

    const smooth = !!opts?.smooth;
    const durationMs = Math.max(0, Math.floor(opts?.durationMs ?? 260));

    // Keep the current camera offset, just move the target.
    const off = camera.position.clone().sub(controls.target);
    const nextTarget = pos.clone();
    const nextCam = pos.clone().add(off);

    if (!smooth || durationMs <= 0) {
      focusAnim.active = false;
      controls.target.copy(nextTarget);
      camera.position.copy(nextCam);
      controls.update();
      return true;
    }

    // Smooth transition over a short duration.
    focusAnim.active = true;
    focusAnim.t0 = performance.now();
    focusAnim.duration = durationMs;
    focusAnim.fromTarget.copy(controls.target);
    focusAnim.toTarget.copy(nextTarget);
    focusAnim.fromCam.copy(camera.position);
    focusAnim.toCam.copy(nextCam);
    return true;
  }

  // View state belongs to exploration history; it never changes document data.
  function getViewState() {
    return {
      position: camera.position.toArray(), target: controls.target.toArray(),
      up: camera.up.toArray(), fov: camera.fov, near: camera.near, far: camera.far,
    };
  }

  function setViewState(state) {
    const vec = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));
    if (!state || !vec(state.position) || !vec(state.target) || !vec(state.up)) return false;
    if (!Number.isFinite(state.fov) || state.fov <= 0 || state.fov >= 180) return false;
    const position = new THREE.Vector3().fromArray(state.position);
    const target = new THREE.Vector3().fromArray(state.target);
    const up = new THREE.Vector3().fromArray(state.up);
    const direction = position.clone().sub(target);
    if (direction.lengthSq() < 1e-12 || up.lengthSq() < 1e-12 || direction.clone().cross(up).lengthSq() < 1e-12) return false;
    focusAnim.active = false;
    // Flush OrbitControls' residual damping before assigning the restored pose.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    camera.position.copy(position);
    controls.target.copy(target);
    camera.up.copy(up).normalize();
    camera.fov = state.fov;
    if (Number.isFinite(state.near) && Number.isFinite(state.far) && state.near > 0 && state.far > state.near) {
      camera.near = state.near;
      camera.far = state.far;
    }
    camera.updateProjectionMatrix();
    controls.update();
    controls.enableDamping = damping;
    invalidate();
    return true;
  }

  function fitDocument() {
    const bounds = new THREE.Box3();
    for (const obj of objByUuid.values()) if (obj.visible) bounds.expandByObject(obj);
    if (bounds.isEmpty()) return false;
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(2, bounds.getSize(new THREE.Vector3()).length() / 2);
    const halfFov = Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.min(1, camera.aspect || 1));
    const distance = radius / Math.sin(halfFov) * 1.2;
    const direction = camera.position.clone().sub(controls.target).normalize();
    if (direction.lengthSq() < 1e-12) direction.set(-1, 1, 1).normalize();
    return setViewState({
      position: center.clone().addScaledVector(direction, distance).toArray(), target: center.toArray(),
      up: camera.up.toArray(), fov: camera.fov,
      near: Math.max(0.01, (distance - radius) / 100), far: Math.max(5000, distance + radius * 4),
    });
  }

  function applyVisibility(state) {
    const hiddenArr = state?.hidden || [];
    const solo = state?.solo || null;
    uiHiddenSet = new Set(Array.isArray(hiddenArr) ? hiddenArr.map(String) : []);
    uiSoloUuid = solo ? String(solo) : null;
    recomputeVisibility();
  }
  let raf = 0;
  let running = false;
  let maxFps = Infinity;
  let maxDpr = 2;
  let lastRenderTime = -Infinity;
  let lastSize = null;

  function setPerformanceOptions(options = {}) {
    maxFps = Number.isFinite(options.maxFps) && options.maxFps > 0 ? options.maxFps : Infinity;
    maxDpr = Number.isFinite(options.maxDpr) && options.maxDpr > 0 ? options.maxDpr : 2;
  }

  function updateFocusAnim() {
    if (!focusAnim.active) return;
    // The final animation tick must paint even after it clears active.
    invalidate();
    const t = performance.now();
    const dt = t - focusAnim.t0;
    const k = focusAnim.duration > 0 ? Math.min(1, Math.max(0, dt / focusAnim.duration)) : 1;
    // easeOutCubic
    const e = 1 - Math.pow(1 - k, 3);
    controls.target.copy(focusAnim.fromTarget).lerp(focusAnim.toTarget, e);
    camera.position.copy(focusAnim.fromCam).lerp(focusAnim.toCam, e);
    if (k >= 1) focusAnim.active = false;
  }

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    if (now - lastRenderTime < 1000 / maxFps) return;
    lastRenderTime = now;
    updateFocusAnim();
    if (controls.enabled) controls.update();
    applyWorldAxisMode();
    if (!needsRender) return;
    needsRender = false;
    const renderStart = performance.now();
    if (renderStats.firstRenderStartMs === null) renderStats.firstRenderStartMs = renderStart;
    renderer.render(scene, camera);
    renderStats.lastRenderEndMs = performance.now();
    renderStats.lastRenderMs = renderStats.lastRenderEndMs - renderStart;
    renderStats.renderCpuMs += renderStats.lastRenderMs;
    renderStats.draws += 1;
  }

  function start() {
    if (disposed) return;
    invalidate();
    if (running) return;
    running = true;
    lastRenderTime = -Infinity;
    // Host resize, UI attachment and sidecar restoration run in one task.
    // Paint their combined final state at the next frame opportunity.
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize(width, height, dpr) {
    const dd = Math.min(maxDpr, clampDpr(dpr));
    if (lastSize && lastSize.width === width && lastSize.height === height && lastSize.dpr === dd) return;
    lastSize = { width, height, dpr: dd };
    renderer.setPixelRatio(dd);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    invalidate();
  }

  function pickObjectAt(ndcX, ndcY) {
    tmpV.set(ndcX, ndcY);
    raycaster.setFromCamera(tmpV, camera);
    const hits = raycaster.intersectObjects([...modelGroup.children, ...labelsGroup.children], true).filter((hit) => {
      for (let obj = hit.object; obj; obj = obj.parent) if (!obj.visible) return false;
      return true;
    });
    if (!hits || hits.length === 0) return null;
    const h = hits[0];
    const uuid = h?.object?.userData?.uuid || null;
    const kind = h?.object?.userData?.kind || "unknown";
    if (!uuid) return null;
    return {
      uuid,
      kind,
      distance: h.distance,
      point: mapThreeTo3dss(h.point)
    };
  }

function rebuildLineArrows(lineObj) {
  for (const child of [...lineObj.children]) {
    if (!child.userData.__lineArrow) continue;
    lineObj.remove(child);
    child.geometry?.dispose?.();
    child.material?.dispose?.();
  }
  const arrow = lineObj.userData.arrow;
  const positions = lineObj.geometry?.getAttribute("position");
  if (!arrow || !positions || positions.count < 2 || arrow.primitive === "none" || arrow.placement === "none") return;
  const placement = arrowPlacement(arrow, lineObj.userData.sense);
  const vertex = (i) => new THREE.Vector3().fromBufferAttribute(positions, i);
  const add = (tip, from) => {
    const direction = tip.clone().sub(from);
    const length = direction.length();
    if (length < 1e-9) return;
    direction.normalize();
    const height = Math.min(length * 0.5, Number(arrow.height || arrow.length) > 0 ? Number(arrow.height || arrow.length) : 2);
    const radius = Number(arrow.radius) > 0 ? Number(arrow.radius) : height * 0.3;
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, arrow.primitive === "pyramid" ? 4 : 12), new THREE.MeshBasicMaterial({ color: lineObj.material.color, transparent: true, opacity: lineObj.material.opacity }));
    mesh.userData = { __lineArrow: true, uuid: lineObj.userData.uuid, kind: "line" };
    mesh.position.copy(tip).addScaledVector(direction, -height / 2);
    if (arrow.auto_orient !== false) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    lineObj.add(mesh);
  };
  if (placement === "end_a" || placement === "both") add(vertex(0), vertex(1));
  if (placement === "end_b" || placement === "both") add(vertex(positions.count - 1), vertex(positions.count - 2));
}

function updateLineGeometry(lineObj) {
  if (!lineObj?.geometry) return;
  const endARef = lineObj.userData?.endARef || null;
  const endBRef = lineObj.userData?.endBRef || null;

  const a3 = endARef && pos3dssByUuid.has(endARef) ? pos3dssByUuid.get(endARef) : (lineObj.userData?.a3dss || null);
  const b3 = endBRef && pos3dssByUuid.has(endBRef) ? pos3dssByUuid.get(endBRef) : (lineObj.userData?.b3dss || null);
  if (!a3 || !b3) return;

  const aV = map3dssToThree(a3);
  const bV = map3dssToThree(b3);

  const posAttr = lineObj.geometry.getAttribute("position");
  if (posAttr && posAttr.count >= 2) {
    posAttr.setXYZ(0, aV.x, aV.y, aV.z);
    posAttr.setXYZ(posAttr.count - 1, bV.x, bV.y, bV.z);
    posAttr.needsUpdate = true;
    lineObj.geometry.computeBoundingSphere();
    if (lineObj.material?.isLineDashedMaterial) lineObj.computeLineDistances();
    rebuildLineArrows(lineObj);
    updateLineLabelPosition(lineObj);
    return;
  }

  // Fallback if geometry is not the expected shape.
  lineObj.geometry.dispose && lineObj.geometry.dispose();
  lineObj.geometry = new THREE.BufferGeometry().setFromPoints([aV, bV]);
  rebuildLineArrows(lineObj);
  updateLineLabelPosition(lineObj);
}

/**
 * Convert a pointer position to a world point on the Z-constant plane (3DSS Z).
 * @param {number} ndcX
 * @param {number} ndcY
 * @param {number} planeZ 3DSS Z value
 * @returns {[number, number, number] | null} 3DSS position
 */
function worldPointOnPlaneZ(ndcX, ndcY, planeZ) {
  const z3dss = Number(planeZ);
  if (![ndcX, ndcY, z3dss].every(Number.isFinite)) return null;

  tmpV.set(Number(ndcX) || 0, Number(ndcY) || 0);
  raycaster.setFromCamera(tmpV, camera);

  // Z-up: plane normal is +Z
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z3dss);
  const out = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, out);
  if (!hit) return null;

  return mapThreeTo3dss(hit);
}

/**
 * Preview-only position update during transform gestures.
 * @param {string} uuid
 * @param {[number,number,number]} pos 3DSS position
 */
  /**
   * Project a world position (3DSS coords) into NDC.
   * @param {[number,number,number]} worldPos
   * @returns {[number,number,number] | null}
   */
  function projectToNdc(worldPos) {
    if (!Array.isArray(worldPos) || worldPos.length < 3) return null;
    const x = Number(worldPos[0]) || 0;
    const y = Number(worldPos[1]) || 0;
    const z = Number(worldPos[2]) || 0;
    const v = new THREE.Vector3(x, y, z);
    try { v.project(camera); } catch { return null; }
    return [v.x, v.y, v.z];
  }


function previewSetPosition(uuid, pos) {
  const u = String(uuid || "");
  if (!u) return;
  if (!Array.isArray(pos) || pos.length < 3) return;

  const obj = objByUuid.get(u);
  if (!obj) return;

  invalidate();
  const next3 = [Number(pos[0]) || 0, Number(pos[1]) || 0, Number(pos[2]) || 0];
  obj.position.copy(map3dssToThree(next3));
  updatePointLabelPosition(u);

  // Update cached pos for points/aux.
  const kind = obj.userData?.kind || "";
  if (kind === "point" || kind === "aux") {
    pos3dssByUuid.set(u, next3);
    // Update dependent line endpoints.
    for (const ln of lineObjects) {
      const aRef = ln.userData?.endARef;
      const bRef = ln.userData?.endBRef;
      if (aRef === u || bRef === u) updateLineGeometry(ln);
    }
  }
}

/** Batch preview for one drag. Document, dirty state and history are untouched. */
function previewPositions(entries) {
  if (!Array.isArray(entries) || !entries.length) return false;
  const next = entries.map(e => ({uuid: String(e?.uuid || ''), position: e?.position}));
  if (new Set(next.map(e => e.uuid)).size !== next.length || next.some(e =>
      !objByUuid.has(e.uuid) || !pos3dssByUuid.has(e.uuid) || !Array.isArray(e.position) ||
      e.position.length !== 3 || !e.position.every(Number.isFinite))) return false;
  for (const e of next) {
    if (!positionPreviewOriginals.has(e.uuid)) positionPreviewOriginals.set(e.uuid, [...pos3dssByUuid.get(e.uuid)]);
    pos3dssByUuid.set(e.uuid, [...e.position]);
    objByUuid.get(e.uuid).position.copy(map3dssToThree(e.position));
    updatePointLabelPosition(e.uuid);
  }
  const changed = new Set(next.map(e => e.uuid));
  for (const line of lineObjects) if (changed.has(line.userData.endARef) || changed.has(line.userData.endBRef)) updateLineGeometry(line);
  invalidate();
  return true;
}
function clearPositionPreview() {
  if (!positionPreviewOriginals.size) return false;
  const entries = [...positionPreviewOriginals].map(([uuid, position]) => ({uuid, position}));
  previewPositions(entries);
  positionPreviewOriginals.clear();
  return true;
}
function setInteractionState({activeTool, orbitEnabled} = {}) {
  const enabled = activeTool !== 'move' && orbitEnabled !== false;
  if (controls.enabled === enabled) return;
  if (!enabled) {
    const view = getViewState();
    focusAnim.active = false;
    setViewState(view); // clear pending damping without shifting the current view
  }
  controls.enabled = enabled;
  invalidate();
}
function getRenderDiagnostics() {
  return {
    profile: 'modeler-r021', orbitEnabled: controls.enabled,
    sharedLabelPlaneGeometries: labelPlaneGeometries.size,
    flatLabelSinglePass: true,
    unsupported: renderWarnings.map(w => ({...w})),
    previewCount: positionPreviewOriginals.size,
    features: ['world-unit-text', 'fixed-text-pose', 'xy-boundary-plate', 'straight', 'polyline', 'reversible-position-preview'],
  };
}

/**
 * Preview-only line endpoint update (draft edits) without mutating document.
 * @param {string} uuid line uuid
 * @param {{ref?:string, coord?:[number,number,number]}|null} endA
 * @param {{ref?:string, coord?:[number,number,number]}|null} endB
 */
function previewSetLineEnds(uuid, endA, endB) {
  const u = String(uuid || "");
  if (!u) return;

  const obj = objByUuid.get(u);
  if (!obj || obj.userData?.kind !== "line") return;

  invalidate();
  // Apply A
  if (endA && typeof endA === "object") {
    if (typeof endA.ref === "string" && endA.ref) {
      obj.userData.endARef = String(endA.ref);
      obj.userData.a3dss = null;
    } else if (Array.isArray(endA.coord) && endA.coord.length >= 3) {
      const c = [Number(endA.coord[0]) || 0, Number(endA.coord[1]) || 0, Number(endA.coord[2]) || 0];
      obj.userData.endARef = null;
      obj.userData.a3dss = c;
    }
  } else if (endA === null) {
    obj.userData.endARef = null;
    obj.userData.a3dss = null;
  }

  // Apply B
  if (endB && typeof endB === "object") {
    if (typeof endB.ref === "string" && endB.ref) {
      obj.userData.endBRef = String(endB.ref);
      obj.userData.b3dss = null;
    } else if (Array.isArray(endB.coord) && endB.coord.length >= 3) {
      const c = [Number(endB.coord[0]) || 0, Number(endB.coord[1]) || 0, Number(endB.coord[2]) || 0];
      obj.userData.endBRef = null;
      obj.userData.b3dss = c;
    }
  } else if (endB === null) {
    obj.userData.endBRef = null;
    obj.userData.b3dss = null;
  }

  updateLineGeometry(obj);
}

function disposeLabelObject(obj) {
  if (!obj) return;
  try {
    const tex = obj?.userData?.__labelTexture;
    tex && tex.dispose && tex.dispose();
  } catch {}
  try { obj?.material?.dispose && obj.material.dispose(); } catch {}
  // Sprite geometry belongs to Three. Shared initial planes belong to the
  // document cache; only a standalone preview replacement owns its geometry.
  if (!obj.isSprite && !obj.userData.__labelSharedGeometry) try { obj?.geometry?.dispose?.(); } catch {}
}

function replaceLabelForUuid(uuid, sprite) {
  const u = String(uuid || "");
  if (!u) return;
  invalidate();
  const prev = labelByUuid.get(u);
  if (prev) {
    try { labelsGroup.remove(prev); } catch {}
    disposeLabelObject(prev);
    labelByUuid.delete(u);
  }
  if (sprite) {
    setLabelForUuid(u, sprite);
  }
}

/**
 * Preview-only caption_text update (draft edits) without mutating document.
 * NOTE:
 * - align: applied for both sprites (sprite.center) and planes.
 * - pose: applied only when pose(front/up) is provided (plane mesh is used).
 * @param {string} uuid line uuid
 * @param {{content?:string, size?:number, align?:string, pose?:any}|null} captionText
 * @param {string} fallbackText used when captionText is null/empty
 */
function previewSetCaptionText(uuid, captionText, fallbackText) {
  const u = String(uuid || "");
  if (!u) return;
  const obj = objByUuid.get(u);
  if (!obj || obj.userData?.kind !== "line") return;

  const raw = captionText && typeof captionText === "object" ? String(captionText.content ?? "").trim() : "";
  const text = raw || String(fallbackText || "").trim();
  const want = text ? text : "";

  if (!want) {
    replaceLabelForUuid(u, null);
    return;
  }

  const style = lineCaptionStyle(captionText);
  const worldSize = style.worldSize;
  const fontSize = style.fontSize;
  const align = captionText && typeof captionText === "object" ? captionText.align : null;
  const poseRaw = style.pose;
  // Draft preview supports both vec3 arrays and axis tokens ("x+", "+x", etc.).
  const poseNorm = normalizePoseFrontUpForPreview(poseRaw);
  const wantPose = !!poseNorm;

  // If unchanged, keep existing.
  const prevObj = labelByUuid.get(u);
  const prevText = String(prevObj?.userData?.__labelText || "");
  const prevSize = Number(prevObj?.userData?.__labelFontSize || 0) || 0;
  const prevPoseKey = String(prevObj?.userData?.__labelPoseKey || "");
  const poseKey = wantPose ? String(poseNorm.key || "") : "";
  const prevAlign = String(prevObj?.userData?.__labelAlign || "");
  const alignKey = typeof align === "string" ? align : "";

  if (prevText == want && prevSize == fontSize && prevObj?.userData?.__labelWorldSize === worldSize && prevPoseKey == poseKey && prevAlign == alignKey) {
    updateLineLabelPosition(obj);
    invalidate();
    return;
  }

  // Create label: when pose is present, use a plane mesh (so orientation applies).
  // Otherwise keep sprite (billboard) but apply align via sprite.center.
  const label = wantPose
    ? makeTextPlane(want, { fontSize, worldSize, align: alignKey })
    : makeTextSprite(want, { fontSize, worldSize });
  if (!label) return;

  label.userData.__labelText = want;
  label.userData.__labelFontSize = fontSize;
  label.userData.__labelWorldSize = worldSize;
  label.userData.__labelAlign = alignKey;
  label.userData.__labelPoseKey = poseKey;

  if (wantPose) {
    applyPoseToLabelObject(label, poseNorm);
  } else if (alignKey && label?.isSprite) {
    applyAlignToSprite(label, alignKey);
  }

  replaceLabelForUuid(u, label);
  updateLineLabelPosition(obj);
}

/**
 * Generalized preview override setter (draft edits) without mutating document.
 * This is a thin wrapper over the specialized preview* methods.
 * @param {"position"|"lineEnds"|"captionText"} kind
 * @param {string} uuid
 * @param {any} payload
 */
function previewSetOverride(kind, uuid, payload) {
  const k = String(kind || "");
  if (k === "position") {
    previewSetPosition(uuid, payload);
    return;
  }
  if (k === "lineEnds") {
    const endA = payload && typeof payload === "object" ? payload.endA : undefined;
    const endB = payload && typeof payload === "object" ? payload.endB : undefined;
    previewSetLineEnds(uuid, endA, endB);
    return;
  }
  if (k === "captionText") {
    const ct = payload && typeof payload === "object" ? payload.captionText : payload;
    const fb = payload && typeof payload === "object" ? payload.fallbackText : "";
    previewSetCaptionText(uuid, ct, fb);
    return;
  }
}



// ------------------------------------------------------------
// Debug snapshot (for viewer/modeler comparison)
// - Never throws; returns null on failure.
// ------------------------------------------------------------
function getDebugPoseSnapshot(opts = {}) {
  try {
    const uuids = Array.isArray(opts?.uuids) ? opts.uuids.map(String) : [];
    const rect = (() => {
      try { return canvas.getBoundingClientRect?.() ?? null; } catch (_e) { return null; }
    })();
    const wCss = Number(rect?.width) || Number(canvas.clientWidth) || 0;
    const hCss = Number(rect?.height) || Number(canvas.clientHeight) || 0;

    const project = (v3) => {
      try {
        const v = v3.clone();
        v.project(camera);
        const ndc = { x: v.x, y: v.y, z: v.z };
        const px = (wCss > 0 && hCss > 0)
          ? {
              x: (ndc.x + 1) * 0.5 * wCss,
              y: (1 - (ndc.y + 1) * 0.5) * hCss
            }
          : null;
        return { ndc, px };
      } catch (_e) {
        return null;
      }
    };

    const items = [];
    for (const u of uuids) {
      const pos = (() => {
        try {
          // Prefer cached 3DSS position if available (points/aux).
          const p = pos3dssByUuid.get(u);
          if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
        } catch (_e) {}
        try {
          const o = objByUuid.get(u);
          if (!o) return null;
          const wp = o.getWorldPosition?.(new THREE.Vector3());
          if (!wp) return null;
          return [wp.x, wp.y, wp.z];
        } catch (_e) {
          return null;
        }
      })();

      const proj = pos ? project(new THREE.Vector3(pos[0], pos[1], pos[2])) : null;
      items.push({ uuid: u, world: pos, screen: proj?.px ?? null, ndc: proj?.ndc ?? null });
    }

    const origin = project(new THREE.Vector3(0, 0, 0));
    const axis = {
      x10: project(new THREE.Vector3(10, 0, 0)),
      y10: project(new THREE.Vector3(0, 10, 0)),
      z10: project(new THREE.Vector3(0, 0, 10))
    };

    return {
      kind: "modeler",
      size: { wCss, hCss },
      cam: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov,
        near: camera.near,
        far: camera.far
      },
      origin: { screen: origin?.px ?? null, ndc: origin?.ndc ?? null },
      axis,
      items,
      // CPU submission observations only; this does not measure GPU completion.
      renderStats: { ...renderStats, dirty: needsRender },
      labelTextureStats: getLabelTextureStats(),
      rendering: getRenderDiagnostics()
    };
  } catch (_e) {
    return null;
  }
}

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    canvas.removeEventListener?.("webglcontextrestored", invalidate);
    controls.removeEventListener?.("change", invalidate);
    clearGroup();
    for (const helper of [grid, axisGroup]) helper.traverse((obj) => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      else obj.material?.dispose?.();
    });
    controls.dispose();
    renderer.dispose();
  }

  return { start, stop, resize, dispose, setDocument, applyVisibility, pickObjectAt, setSelection, focusOnUuid, getViewState, setViewState, fitDocument, setExplorationScope, setPerformanceOptions, worldPointOnPlaneZ, previewSetPosition, previewSetLineEnds, previewSetCaptionText, previewSetOverride, previewPositions, clearPositionPreview, setInteractionState, getRenderDiagnostics, setFrameIndex, setWorldAxisMode, getDebugPoseSnapshot };
}

// NOTE:
// This file only implements the Renderer layer (`createRenderer`).
// The entry port `bootstrapModeler` is implemented in `runtime/bootstrapModeler.js`.
