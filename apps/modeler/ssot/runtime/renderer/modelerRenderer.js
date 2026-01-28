// modeler/runtime/renderer/modelerRenderer.js
// Renderer layer: three/webgl execution.
//
// IMPORTANT:
// - Do not query DOM here. Canvas element is provided by hub.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ------------------------------------------------------------
// Minimal text labels (Modeler)
//
// - Keep this renderer self-contained (no viewer label layer dependency).
// - No caching/LRU for now (Modeler scale is small); textures are disposed
//   when document is replaced.
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
  const hWorld = Math.max(2, fontSize * 0.25);
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

  // scale in world units: keep roughly consistent with font size
  const aspect = (canvas.width / canvas.height) || 1;
  const hWorld = Math.max(2, fontSize * 0.25);
  const wWorld = hWorld * aspect;

  const { h, v } = parseAlign(opts.align);
  let ox = 0;
  let oy = 0;
  // geometry anchor: default center/middle at origin.
  if (h === "left") ox = +wWorld / 2;
  else if (h === "right") ox = -wWorld / 2;
  if (v === "bottom" || v === "baseline") oy = +hWorld / 2;
  else if (v === "top") oy = -hWorld / 2;

  const geo = new THREE.PlaneGeometry(wWorld, hWorld);
  if (ox || oy) geo.translate(ox, oy, 0);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10_000;
  mesh.userData.__labelTexture = texture;
  mesh.userData.__labelW = wWorld;
  mesh.userData.__labelH = hWorld;
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

  // list of line objects (for fast endpoint updates during transforms)
  const lineObjects = [];

  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector2();

  // Frame filtering (appearance.frames)
  let currentFrameIndex = 0;
  let uiHiddenSet = new Set();
  let uiSoloUuid = null;

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
    for (const [uuid, obj] of objByUuid.entries()) {
      let vis = baseVisibleFor(uuid);
      if (uiHiddenSet.has(uuid)) vis = false;
      if (uiSoloUuid) vis = (uuid === uiSoloUuid) && vis;
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
    const fi = (typeof frameIndex === 'number' && Number.isFinite(frameIndex)) ? Math.trunc(frameIndex) : Math.trunc(Number(frameIndex) || 0);
    if (fi === currentFrameIndex) return;
    currentFrameIndex = fi;
    recomputeVisibility();
  }

  function clearGroup() {
    objByUuid.clear();
    labelByUuid.clear();
    baseColorByUuid.clear();
    pos3dssByUuid.clear();
    lineObjects.length = 0;
    while (modelGroup.children.length) {
      const c = modelGroup.children.pop();
      c.geometry && c.geometry.dispose && c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose && m.dispose());
        else c.material.dispose && c.material.dispose();
      }
    }

    while (labelsGroup.children.length) {
      const s = labelsGroup.children.pop();
      const tex = s?.userData?.__labelTexture;
      try { tex && tex.dispose && tex.dispose(); } catch {}
      try { s?.material?.dispose && s.material.dispose(); } catch {}
    }
  }

  function getPointLabelText(p) {
    const t = p?.appearance?.marker?.text?.content;
    if (typeof t === "string" && t.trim()) return t.trim();
    const n = p?.signification?.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    return "";
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
    s.position.z += 2.2;
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
    const bx = posAttr.getX(1), by = posAttr.getY(1), bz = posAttr.getZ(1);
    s.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2 + 2.0);
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
        const baseColor = 0xdddddd;
        const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.6, metalness: 0.0 });
        const m = new THREE.Mesh(geo, mat);
        const v = map3dssToThree([x, y, z]);
        m.position.copy(v);
        m.userData.uuid = u;
        m.userData.kind = "point";
        m.userData.__docVisible = (p?.appearance?.visible !== false);
        m.userData.__docFrames = p?.appearance?.frames ?? null;
        modelGroup.add(m);
        if (u) {
          objByUuid.set(u, m);
          baseColorByUuid.set(u, baseColor);
          pos3dssByUuid.set(u, [x, y, z]);

          const txt = getPointLabelText(p);
          if (txt) {
            const s = makeTextSprite(txt, { fontSize: 12 });
            if (s) {
              setLabelForUuid(u, s);
              updatePointLabelPosition(u);
            }
          }
        }
      }
    }


// aux (minimal: render as small box, pickable)
if (Array.isArray(doc.aux)) {
  for (const ax of doc.aux) {
    const u = uuidOf(ax);
    const [x, y, z] = safePos(ax);
    const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const baseColor = 0x99dd99;
    const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7, metalness: 0.0 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(map3dssToThree([x, y, z]));
    m.userData.uuid = u;
    m.userData.kind = "aux";
    m.userData.__docVisible = (ax?.appearance?.visible !== false);
    m.userData.__docFrames = ax?.appearance?.frames ?? null;
    modelGroup.add(m);
    if (u) {
      objByUuid.set(u, m);
      baseColorByUuid.set(u, baseColor);
      pos3dssByUuid.set(u, [x, y, z]);

      const txt = getAuxLabelText(ax);
      if (typeof txt === "string" && txt.trim()) {
        const s = makeTextSprite(txt.trim(), { fontSize: 12 });
        if (s) {
          setLabelForUuid(u, s);
          updatePointLabelPosition(u);
        }
      }
    }
  }
}

    // lines
    if (Array.isArray(doc.lines)) {
      for (const ln of doc.lines) {
        const u = uuidOf(ln);
        const a = resolveEndpoint(ln?.end_a, pointIdx);
        const b = resolveEndpoint(ln?.end_b, pointIdx);
        if (!a || !b) continue;
        const aV = map3dssToThree(a);
        const bV = map3dssToThree(b);
        const geo = new THREE.BufferGeometry().setFromPoints([aV, bV]);
        const baseColor = 0x88aaff;
        const mat = new THREE.LineBasicMaterial({ color: baseColor, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(geo, mat);
        line.userData.uuid = u;
        line.userData.kind = "line";
        line.userData.__docVisible = (ln?.appearance?.visible !== false);
        line.userData.__docFrames = ln?.appearance?.frames ?? null;
        line.userData.endARef = typeof ln?.end_a?.ref === "string" ? ln.end_a.ref : null;
        line.userData.endBRef = typeof ln?.end_b?.ref === "string" ? ln.end_b.ref : null;
        line.userData.a3dss = Array.isArray(a) ? [...a] : null;
        line.userData.b3dss = Array.isArray(b) ? [...b] : null;
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
            const sizeVal = ct && typeof ct === "object" ? Number(ct.size) : NaN;
            const fontSize = Number.isFinite(sizeVal) && sizeVal > 0 ? Math.max(8, Math.min(64, Math.round(sizeVal))) : 11;
            const poseRaw = ct && typeof ct === "object" ? ct.pose : null;
            const align = ct && typeof ct === "object" ? ct.align : null;
            const alignKey = typeof align === "string" ? align : "";
            // Support both vec3 arrays and axis tokens (legacy / draft convenience).
            const poseNorm = normalizePoseFrontUpForPreview(poseRaw);
            const wantPose = !!poseNorm;

            const label = wantPose
              ? makeTextPlane(txt, { fontSize, align: alignKey })
              : makeTextSprite(txt, { fontSize });
            if (label) {
              label.userData.__labelText = txt;
              label.userData.__labelFontSize = fontSize;
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
  }

  function setSelection(selection) {
    const sel = new Set(Array.isArray(selection) ? selection.map(String) : []);
    for (const [uuid, obj] of objByUuid.entries()) {
      const base = baseColorByUuid.get(uuid);
      const isSel = sel.has(uuid);
      const mat = obj?.material;
      if (!mat) continue;

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

    const smooth = !!opts?.smooth;
    const durationMs = Math.max(0, Math.floor(opts?.durationMs ?? 260));

    // Keep the current camera offset, just move the target.
    const off = camera.position.clone().sub(controls.target);
    const nextTarget = pos.clone();
    const nextCam = pos.clone().add(off);

    if (!smooth || durationMs <= 0) {
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

  function applyVisibility(state) {
    const hiddenArr = state?.hidden || [];
    const solo = state?.solo || null;
    uiHiddenSet = new Set(Array.isArray(hiddenArr) ? hiddenArr.map(String) : []);
    uiSoloUuid = solo ? String(solo) : null;
    recomputeVisibility();
  }
  let raf = 0;
  let running = false;

  function updateFocusAnim() {
    if (!focusAnim.active) return;
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
    updateFocusAnim();
    controls.update();
    applyWorldAxisMode();
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
      point: mapThreeTo3dss(h.point)
    };
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
    posAttr.setXYZ(1, bV.x, bV.y, bV.z);
    posAttr.needsUpdate = true;
    lineObj.geometry.computeBoundingSphere();
    updateLineLabelPosition(lineObj);
    return;
  }

  // Fallback if geometry is not the expected shape.
  lineObj.geometry.dispose && lineObj.geometry.dispose();
  lineObj.geometry = new THREE.BufferGeometry().setFromPoints([aV, bV]);
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
  if (!Number.isFinite(z3dss)) return null;

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
function previewSetPosition(uuid, pos) {
  const u = String(uuid || "");
  if (!u) return;
  if (!Array.isArray(pos) || pos.length < 3) return;

  const obj = objByUuid.get(u);
  if (!obj) return;

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
}

function replaceLabelForUuid(uuid, sprite) {
  const u = String(uuid || "");
  if (!u) return;
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

  const sizeVal = captionText && typeof captionText === "object" ? Number(captionText.size) : NaN;
  const fontSize = Number.isFinite(sizeVal) && sizeVal > 0 ? Math.max(8, Math.min(64, Math.round(sizeVal))) : 11;
  const align = captionText && typeof captionText === "object" ? captionText.align : null;
  const poseRaw = captionText && typeof captionText === "object" ? captionText.pose : null;
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

  if (prevText == want && prevSize == fontSize && prevPoseKey == poseKey && prevAlign == alignKey) {
    updateLineLabelPosition(obj);
    return;
  }

  // Create label: when pose is present, use a plane mesh (so orientation applies).
  // Otherwise keep sprite (billboard) but apply align via sprite.center.
  const label = wantPose
    ? makeTextPlane(want, { fontSize, align: alignKey })
    : makeTextSprite(want, { fontSize });
  if (!label) return;

  label.userData.__labelText = want;
  label.userData.__labelFontSize = fontSize;
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
      items
    };
  } catch (_e) {
    return null;
  }
}

  function dispose() {
    stop();
    clearGroup();
    controls.dispose();
    renderer.dispose();
  }

  return { start, stop, resize, dispose, setDocument, applyVisibility, pickObjectAt, setSelection, focusOnUuid, worldPointOnPlaneZ, previewSetPosition, previewSetLineEnds, previewSetCaptionText, previewSetOverride, setFrameIndex, setWorldAxisMode, getDebugPoseSnapshot };
}

// NOTE:
// This file only implements the Renderer layer (`createRenderer`).
// The entry port `bootstrapModeler` is implemented in `runtime/bootstrapModeler.js`.

