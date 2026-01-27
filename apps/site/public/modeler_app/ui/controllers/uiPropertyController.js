// ui/controllers/uiPropertyController.js
// Property panel controller (Phase 2):
// - Always follows current selection (single selection)
// - Separates "unapplied property edits" (buffer dirty) from document dirty
// - Apply is the commit point (one history step)

function getRoleEl(root, role) {
  const el = root.querySelector(`[data-role="${role}"]`);
  return el || null;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function vecLen3(v) {
  const x = num(v?.[0]);
  const y = num(v?.[1]);
  const z = num(v?.[2]);
  return Math.sqrt(x * x + y * y + z * z);
}

function vecDot3(a, b) {
  return num(a?.[0]) * num(b?.[0]) + num(a?.[1]) * num(b?.[1]) + num(a?.[2]) * num(b?.[2]);
}

function vecScale3(v, s) {
  return [num(v?.[0]) * s, num(v?.[1]) * s, num(v?.[2]) * s];
}

function vecSub3(a, b) {
  return [num(a?.[0]) - num(b?.[0]), num(a?.[1]) - num(b?.[1]), num(a?.[2]) - num(b?.[2])];
}

function vecNormalize3(v) {
  const len = vecLen3(v);
  if (!(len > 0)) return null;
  return vecScale3(v, 1 / len);
}

/**
 * Pose guard:
 * - Reject zero vectors
 * - Orthonormalize up against front via Gram-Schmidt
 * - Reject near-parallel vectors
 *
 * Returns {{pose: {front:number[], up:number[]} | null, error: string | null}}
 */
function sanitizePose(frontRaw, upRaw) {
  const EPS = 1e-6;
  const frontN = vecNormalize3(frontRaw);
  if (!frontN || vecLen3(frontN) < EPS) return { pose: null, error: "Invalid pose.front (zero vector)" };

  const upN0 = vecNormalize3(upRaw);
  if (!upN0 || vecLen3(upN0) < EPS) return { pose: null, error: "Invalid pose.up (zero vector)" };

  // Remove component of up along front.
  const proj = vecScale3(frontN, vecDot3(upN0, frontN));
  const upOrtho = vecSub3(upN0, proj);
  const upN = vecNormalize3(upOrtho);
  if (!upN || vecLen3(upN) < EPS) return { pose: null, error: "Invalid pose (front/up are parallel)" };

  // front is already unit, up is re-normalized and orthogonalized.
  return { pose: { front: [frontN[0], frontN[1], frontN[2]], up: [upN[0], upN[1], upN[2]] }, error: null };
}

function uuidOf(node) {
  return node?.meta?.uuid || node?.uuid || null;
}

function parseEndpointInput(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // If it doesn't look like a coord list, treat it as a point uuid ref.
  if (!/[\s,]/.test(s)) {
    return { ref: s };
  }

  // Coord: allow "x,y,z" or "x y z" (ignore extra tokens).
  const parts = s.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  const z = Number(parts[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return { coord: [x, y, z] };
}

function findByUuid(doc, uuid) {
  if (!doc || !uuid) return { kind: null, node: null };
  if (Array.isArray(doc.points)) {
    const n = doc.points.find((p) => uuidOf(p) === uuid);
    if (n) return { kind: "point", node: n };
  }
  if (Array.isArray(doc.lines)) {
    const n = doc.lines.find((p) => uuidOf(p) === uuid);
    if (n) return { kind: "line", node: n };
  }
  if (Array.isArray(doc.aux)) {
    const n = doc.aux.find((p) => uuidOf(p) === uuid);
    if (n) return { kind: "aux", node: n };
  }
  return { kind: null, node: null };
}

function localizedStringText(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    if (typeof v.ja === "string" && v.ja) return v.ja;
    if (typeof v.en === "string" && v.en) return v.en;
    // Legacy: caption.default (non-schema)
    if (typeof v.default === "string" && v.default) return v.default;
  }
  return "";
}

function getPointName(node) {
  return String(node?.signification?.name ?? node?.meta?.name ?? node?.name ?? "").trim();
}

function setPointName(node, v) {
  if (!node) return;
  if (!node.signification || typeof node.signification !== "object") {
    node.signification = { ...(node.signification || {}) };
  }
  node.signification.name = String(v ?? "");
}

function getLineCaption(node) {
  const sig = node?.signification;
  if (sig && typeof sig === "object") {
    if (sig.caption != null) return localizedStringText(sig.caption);
    // Legacy: line.signification.name
    if (typeof sig.name === "string") return sig.name;
  }
  return "";
}

function setLineCaption(node, v) {
  if (!node) return;
  if (!node.signification || typeof node.signification !== "object") {
    node.signification = { ...(node.signification || {}) };
  }
  node.signification.caption = String(v ?? "");
  // Ensure we don't keep legacy non-schema key.
  if (node.signification && typeof node.signification === "object" && "name" in node.signification) {
    try { delete node.signification.name; } catch {}
  }
}

function getMarkerText(node) {
  const t = node?.appearance?.marker?.text;
  return (t && typeof t === "object") ? t : null;
}

function getMarkerTextContent(node) {
  const t = getMarkerText(node);
  return typeof t?.content === "string" ? t.content : "";
}

function getMarkerTextSize(node) {
  const t = getMarkerText(node);
  return Number.isFinite(Number(t?.size)) ? Number(t.size) : 10;
}

function getMarkerTextAlign(node) {
  const t = getMarkerText(node);
  return typeof t?.align === "string" ? t.align : "";
}


function getMarkerTextPose(node) {
  const pose = node?.appearance?.marker?.text?.pose;
  if (!pose || typeof pose !== "object") return null;
  const front = Array.isArray(pose.front) ? pose.front.map((v) => num(v)) : null;
  const up = Array.isArray(pose.up) ? pose.up.map((v) => num(v)) : null;
  if (!front || front.length !== 3 || !up || up.length !== 3) return null;
  return { front: [num(front[0]), num(front[1]), num(front[2])], up: [num(up[0]), num(up[1]), num(up[2])] };
}

function getCaptionText(node) {
  const ct = node?.appearance?.caption_text;
  return (ct && typeof ct === "object") ? ct : null;
}
function getCaptionTextContent(node) {
  const ct = getCaptionText(node);
  const c = ct?.content;
  return (typeof c === "string") ? c : "";
}
function getCaptionTextSize(node) {
  const ct = getCaptionText(node);
  const s = ct?.size;
  return Number.isFinite(Number(s)) ? Number(s) : 0;
}
function getCaptionTextAlign(node) {
  const ct = getCaptionText(node);
  const a = ct?.align;
  return (typeof a === "string") ? a : "";
}
function getCaptionTextPose(node) {
  const ct = getCaptionText(node);
  const pose = ct?.pose;
  if (!pose || typeof pose !== "object") return null;
  const front = Array.isArray(pose.front) ? pose.front.map((v) => num(v)) : null;
  const up = Array.isArray(pose.up) ? pose.up.map((v) => num(v)) : null;
  if (!front || front.length !== 3 || !up || up.length !== 3) return null;
  return { front: [num(front[0]), num(front[1]), num(front[2])], up: [num(up[0]), num(up[1]), num(up[2])] };
}


function getPos(node) {
  const p = node?.appearance?.position || node?.position;
  if (Array.isArray(p) && p.length >= 3) return [num(p[0]), num(p[1]), num(p[2])];
  return [0, 0, 0];
}

function setPos(node, arr) {
  if (!node) return;
  if (!node.appearance || typeof node.appearance !== "object") node.appearance = { ...(node.appearance || {}) };
  node.appearance.position = [num(arr[0]), num(arr[1]), num(arr[2])];
}

function cloneDoc(doc) {
  return (typeof structuredClone === "function") ? structuredClone(doc) : JSON.parse(JSON.stringify(doc));
}

/**
 * @param {{
 *  root: HTMLElement,
 *  core: any,
 *  signal: AbortSignal,
 *  setHud: (msg: string) => void,
 *  onDirtyChange?: (dirty: boolean) => void,
 * }} deps
 */
export function createUiPropertyController(deps) {
  const { root, core, previewSetPosition, previewSetLineEnds, previewSetCaptionText, signal, setHud, onDirtyChange, setSelectionUuids } = deps;

  const emptyEl = getRoleEl(root, "prop-empty");
  const multiEl = getRoleEl(root, "prop-multi");
  const multiCountEl = getRoleEl(root, "prop-multi-count");
  const selCountHeaderEl = getRoleEl(root, "prop-selection-count");
  const panelEl = getRoleEl(root, "prop-panel");
  const uuidEl = getRoleEl(root, "prop-uuid");
  const kindEl = getRoleEl(root, "prop-kind");
  const pathEl = getRoleEl(root, "prop-path");
  const dirtyEl = getRoleEl(root, "prop-dirty");

  const inpName = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-name"));
  const nameLabel = /** @type {HTMLElement|null} */ (getRoleEl(root, "prop-name-label"));
  const auxModuleField = getRoleEl(root, "prop-aux-module-field");
  const selAuxModule = /** @type {HTMLSelectElement|null} */ (getRoleEl(root, "prop-aux-module"));

  const textField = getRoleEl(root, "prop-text-field");
  const inpTextContent = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-content"));
  const inpTextSize = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-size"));
  const selTextAlign = /** @type {HTMLSelectElement|null} */ (getRoleEl(root, "prop-text-align"));
  const inpTextFrontX = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-front-x"));
  const inpTextFrontY = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-front-y"));
  const inpTextFrontZ = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-front-z"));
  const inpTextUpX = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-up-x"));
  const inpTextUpY = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-up-y"));
  const inpTextUpZ = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-text-up-z"));
  const textPoseModeEl = /** @type {HTMLElement|null} */ (getRoleEl(root, "prop-text-pose-mode"));
  const posField = getRoleEl(root, "prop-pos-field");
  const inpX = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-x"));
  const inpY = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-y"));
  const inpZ = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-z"));

  const selPosStep = /** @type {HTMLSelectElement|null} */ (getRoleEl(root, "prop-pos-step"));
  const posStepHintEl = /** @type {HTMLElement|null} */ (getRoleEl(root, "prop-pos-step-hint"));

  const lineEndsField = getRoleEl(root, "prop-line-ends-field");
  const inpEndA = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-line-end-a"));
  const inpEndB = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-line-end-b"));
  const pointsDatalist = /** @type {HTMLDataListElement|null} */ (getRoleEl(root, "prop-points-datalist"));
  const btnPickEndA = /** @type {HTMLButtonElement|null} */ (getRoleEl(root, "prop-line-end-a-pick"));
  const btnPickEndB = /** @type {HTMLButtonElement|null} */ (getRoleEl(root, "prop-line-end-b-pick"));
  const btnClearEndA = /** @type {HTMLButtonElement|null} */ (getRoleEl(root, "prop-line-end-a-clear"));
  const btnClearEndB = /** @type {HTMLButtonElement|null} */ (getRoleEl(root, "prop-line-end-b-clear"));
  const lineEndsHint = getRoleEl(root, "prop-line-ends-hint");

  const endAResolvedEl = /** @type {HTMLElement|null} */ (getRoleEl(root, "prop-line-end-a-resolved"));
  const endBResolvedEl = /** @type {HTMLElement|null} */ (getRoleEl(root, "prop-line-end-b-resolved"));

  const captionTextField = getRoleEl(root, "prop-caption-text-field");
  const inpCaptionTextContent = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-content"));
  const inpCaptionTextSize = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-size"));
  const selCaptionTextAlign = /** @type {HTMLSelectElement|null} */ (getRoleEl(root, "prop-caption-text-align"));
  const inpCaptionTextFrontX = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-front-x"));
  const inpCaptionTextFrontY = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-front-y"));
  const inpCaptionTextFrontZ = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-front-z"));
  const inpCaptionTextUpX = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-up-x"));
  const inpCaptionTextUpY = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-up-y"));
  const inpCaptionTextUpZ = /** @type {HTMLInputElement|null} */ (getRoleEl(root, "prop-caption-text-up-z"));
  const captionTextPoseModeEl = /** @type {HTMLElement|null} */ (getRoleEl(root, "prop-caption-text-pose-mode"));

  /** @type {{uuid:string, kind:string, path:string} | null} */
  let active = null;
  let dirty = false;

  // Position stepping UI (visible step selector)
  let posStep = 0.1;
  const POS_STEP_LS_KEY = "3dsl.modeler.posStep";

  function clampPosStep(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return 0.1;
    // Keep it reasonable; UI offers 0.01..10
    return Math.min(10, Math.max(0.01, n));
  }

  function syncPosStepUi() {
    posStep = clampPosStep(posStep);
    try {
      if (selPosStep) selPosStep.value = String(posStep);
    } catch {}
    try {
      if (inpX) inpX.step = String(posStep);
      if (inpY) inpY.step = String(posStep);
      if (inpZ) inpZ.step = String(posStep);
    } catch {}
  }

  function loadPosStepFromStorage() {
    try {
      const raw = localStorage.getItem(POS_STEP_LS_KEY);
      if (raw != null && raw !== "") posStep = clampPosStep(raw);
    } catch {}
    syncPosStepUi();
  }

  function savePosStepToStorage() {
    try { localStorage.setItem(POS_STEP_LS_KEY, String(posStep)); } catch {}
  }


  // Draft preview scheduling (avoid spamming renderer on wheel/keydown repeats).
  let rafPreview = 0;
  let pendingPreviewUuid = "";
  /** @type {[number,number,number] | null} */
  let pendingPreviewPos = null;
  let pendingPreviewLineUuid = "";
  /** @type {{ref?:string, coord?:[number,number,number]}|null} */
  let pendingPreviewEndA = null;
  /** @type {{ref?:string, coord?:[number,number,number]}|null} */
  let pendingPreviewEndB = null;
  let pendingPreviewCaptionUuid = "";
  /** @type {{content?:string, size?:number, align?:string, pose?:{front:number[], up:number[]}}|null} */
  let pendingPreviewCaptionText = null;
  let pendingPreviewCaptionFallback = "";
  let lockedActive = false;

// Draft preview lifecycle (P1): keep a single base snapshot per active property,
// and always revert preview back to this base on hide/discard/apply/selection changes.
/** @type {{uuid:string, kind:string, pos?:[number,number,number], endA?:any, endB?:any, captionText?:any, captionFallback?:string} | null} */
let previewBase = null;

function previewCaptureBase(uuid, kind) {
  try {
    const doc = core.getDocument?.();
    const found = findByUuid(doc, uuid);
    if (!found?.node) { previewBase = null; return; }

    const u = String(uuid || "");
    const k = String(kind || found.kind || "");
    /** @type {any} */
    const base = { uuid: u, kind: k };

    if (k === "point" || k === "aux") {
      base.pos = getPos(found.node);
    }

    if (k === "line") {
      const aObj = found.node?.end_a;
      const bObj = found.node?.end_b;
      const a = (aObj && typeof aObj === "object") ? (typeof aObj.ref === "string" ? aObj.ref : (Array.isArray(aObj.coord) ? aObj.coord.join(",") : "")) : String(aObj || "");
      const b = (bObj && typeof bObj === "object") ? (typeof bObj.ref === "string" ? bObj.ref : (Array.isArray(bObj.coord) ? bObj.coord.join(",") : "")) : String(bObj || "");
      base.endA = parseEndpointInput(a);
      base.endB = parseEndpointInput(b);

      const beforeCTPose = getCaptionTextPose(found.node);
      const ct = getCaptionText(found.node) ? {
        content: getCaptionTextContent(found.node),
        size: getCaptionTextSize(found.node),
        ...(getCaptionTextAlign(found.node) ? { align: getCaptionTextAlign(found.node) } : {}),
        ...(beforeCTPose ? { pose: beforeCTPose } : {}),
      } : null;
      base.captionText = ct;
      base.captionFallback = getLineCaption(found.node) || "";
    }

    previewBase = base;
  } catch {
    previewBase = null;
  }
}

function previewRevertToBase() {
  if (!previewBase) return;
  // Cancel pending rAF updates.
  if (rafPreview) {
    try { cancelAnimationFrame(rafPreview); } catch {}
    rafPreview = 0;
  }
  pendingPreviewUuid = "";
  pendingPreviewPos = null;
  pendingPreviewLineUuid = "";
  pendingPreviewEndA = null;
  pendingPreviewEndB = null;
  pendingPreviewCaptionUuid = "";
  pendingPreviewCaptionText = null;
  pendingPreviewCaptionFallback = "";

  try {
    if (previewBase.pos && previewSetPosition) {
      previewSetPosition(String(previewBase.uuid), previewBase.pos);
    }
  } catch {}
  try {
    if (previewBase.kind === "line" && previewSetLineEnds) {
      previewSetLineEnds(String(previewBase.uuid), previewBase.endA ?? null, previewBase.endB ?? null);
    }
  } catch {}
  try {
    if (previewBase.kind === "line" && previewSetCaptionText) {
      previewSetCaptionText(String(previewBase.uuid), previewBase.captionText ?? null, String(previewBase.captionFallback || ""));
    }
  } catch {}
}


  /** @type {"a"|"b"|null} */
  let endpointPick = null;

  function isDirty() { return !!dirty; }
  function getActiveUuid() { return active?.uuid || null; }

  function isUuidLocked(uuid) {
    if (!uuid) return false;
    try {
      const locks = core.listLocks?.() || [];
      return Array.isArray(locks) && locks.includes(String(uuid));
    } catch {
      return false;
    }
  }

  function setInputsEnabled(enabled) {
    const en = !!enabled;
    if (inpName) inpName.disabled = !en;
    if (selAuxModule) selAuxModule.disabled = !en;
    if (inpX) inpX.disabled = !en;
    if (inpY) inpY.disabled = !en;
    if (inpZ) inpZ.disabled = !en;
    if (inpEndA) inpEndA.disabled = !en;
    if (inpEndB) inpEndB.disabled = !en;
    if (inpTextContent) inpTextContent.disabled = !en;
    if (inpTextSize) inpTextSize.disabled = !en;
    if (selTextAlign) selTextAlign.disabled = !en;
    if (inpTextFrontX) inpTextFrontX.disabled = !en;
    if (inpTextFrontY) inpTextFrontY.disabled = !en;
    if (inpTextFrontZ) inpTextFrontZ.disabled = !en;
    if (inpTextUpX) inpTextUpX.disabled = !en;
    if (inpTextUpY) inpTextUpY.disabled = !en;
    if (inpTextUpZ) inpTextUpZ.disabled = !en;
    if (inpCaptionTextContent) inpCaptionTextContent.disabled = !en;
    if (inpCaptionTextSize) inpCaptionTextSize.disabled = !en;
    if (selCaptionTextAlign) selCaptionTextAlign.disabled = !en;
    if (inpCaptionTextFrontX) inpCaptionTextFrontX.disabled = !en;
    if (inpCaptionTextFrontY) inpCaptionTextFrontY.disabled = !en;
    if (inpCaptionTextFrontZ) inpCaptionTextFrontZ.disabled = !en;
    if (inpCaptionTextUpX) inpCaptionTextUpX.disabled = !en;
    if (inpCaptionTextUpY) inpCaptionTextUpY.disabled = !en;
    if (inpCaptionTextUpZ) inpCaptionTextUpZ.disabled = !en;
    if (panelEl) panelEl.dataset.locked = en ? "false" : "true";
  }

  function setEndpointPick(next) {
    endpointPick = next;
    if (lineEndsHint) lineEndsHint.hidden = !endpointPick;
    if (btnPickEndA) btnPickEndA.disabled = !!lockedActive;
    if (btnPickEndB) btnPickEndB.disabled = !!lockedActive;
    if (btnClearEndA) btnClearEndA.disabled = !!lockedActive;
    if (btnClearEndB) btnClearEndB.disabled = !!lockedActive;

    try {
      if (endpointPick === "a") setHud?.("Pick end_a: click a point in preview (ESC to cancel)");
      else if (endpointPick === "b") setHud?.("Pick end_b: click a point in preview (ESC to cancel)");
    } catch {}
  }

  function cancelEndpointPick() {
    if (!endpointPick) return;
    setEndpointPick(null);
    try { setHud?.("Pick cancelled"); } catch {}
  }

  function startEndpointPick(side) {
    if (!active || active.kind !== "line") return;
    if (lockedActive) {
      try { setHud?.(`Locked: ${active.uuid}`); } catch {}
      return;
    }
    setEndpointPick(side);
  }

  function setEndpointValue(side, pointUuid) {
    if (!active || active.kind !== "line") return;
    if (lockedActive) return;
    const u = String(pointUuid || "").trim();
    if (!u) return;
    if (side === "a" && inpEndA) inpEndA.value = u;
    if (side === "b" && inpEndB) inpEndB.value = u;
    setDirty(true);
  }

  /**
   * Intercept preview picks while endpoint pick mode is active.
   * @returns {boolean} true if the pick was consumed.
   */
  function handlePickOverride(issueLike) {
    if (!endpointPick) return false;
    const uuid = issueLike?.uuid ? String(issueLike.uuid) : "";
    const kind = String(issueLike?.kind || "").toLowerCase();
    if (!uuid || kind !== "point") {
      try { setHud?.("Pick a point to set endpoint"); } catch {}
      return true;
    }
    setEndpointValue(endpointPick, uuid);
    setEndpointPick(null);
    try { setHud?.(`Set end_${endpointPick} = ${uuid.slice(0, 8)}…`); } catch {}
    return true;
  }

  function refreshLockState() {
    const uuid = active?.uuid || null;
    lockedActive = !!(uuid && isUuidLocked(uuid));
    setInputsEnabled(!lockedActive);
    if (kindEl) {
      const base = String(active?.kind || "");
      kindEl.textContent = lockedActive ? `${base} 🔒` : base;
    }
  }

  function syncPoseModeBadgesFromInputs() {
    // Pose affects rendering mode: sprite (no pose) vs plane label (pose).
    // Show a small hint next to the pose summary so users know what will happen.
    const hasAny = (arr) => Array.isArray(arr) && arr.some((v) => String(v ?? "").trim() !== "");

    const pointPoseVals = [inpTextFrontX, inpTextFrontY, inpTextFrontZ, inpTextUpX, inpTextUpY, inpTextUpZ].map((el) => el?.value ?? "");
    const linePoseVals = [inpCaptionTextFrontX, inpCaptionTextFrontY, inpCaptionTextFrontZ, inpCaptionTextUpX, inpCaptionTextUpY, inpCaptionTextUpZ].map((el) => el?.value ?? "");

    if (textPoseModeEl) {
      const enabled = active?.kind === "point" || active?.kind === "aux";
      if (!enabled) {
        textPoseModeEl.textContent = "";
      } else {
        textPoseModeEl.textContent = hasAny(pointPoseVals) ? "(plane)" : "(sprite)";
      }
    }

    if (captionTextPoseModeEl) {
      const enabled = active?.kind === "line";
      if (!enabled) {
        captionTextPoseModeEl.textContent = "";
      } else {
        captionTextPoseModeEl.textContent = hasAny(linePoseVals) ? "(plane)" : "(sprite)";
      }
    }
  }

  function setDirty(next) {
    const n = !!next;
    if (dirty === n) return;
    dirty = n;
    if (dirtyEl) dirtyEl.hidden = !dirty;
    syncPoseModeBadgesFromInputs();
    try { onDirtyChange && onDirtyChange(dirty); } catch {}
  }

  function hideAll() {
    // Revert any draft preview back to document state before hiding.
    previewRevertToBase();
    previewBase = null;
    active = null;
    lockedActive = false;
    setDirty(false);
    setInputsEnabled(true);
    if (panelEl) panelEl.hidden = true;
    if (multiEl) multiEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    if (selCountHeaderEl) selCountHeaderEl.hidden = true;
  }

  function showMulti(count) {
    // Revert any draft preview back to document state before switching modes.
    previewRevertToBase();
    previewBase = null;
    active = null;
    lockedActive = false;
    setDirty(false);
    setInputsEnabled(true);
    if (panelEl) panelEl.hidden = true;
    if (emptyEl) emptyEl.hidden = true;
    if (multiEl) multiEl.hidden = false;
    if (multiCountEl) multiCountEl.textContent = String(Math.max(0, Number(count) || 0));
    if (selCountHeaderEl) {
      selCountHeaderEl.textContent = `${String(Math.max(0, Number(count) || 0))} selected`;
      selCountHeaderEl.hidden = false;
    }
  }


  function formatEndpointRef(doc, ref) {
    const v = String(ref || "");
    if (!v) return "";
    // UUID reference to an existing point
    const pts = Array.isArray(doc?.points) ? doc.points : [];
    for (const p of pts) {
      const pu = uuidOf(p);
      if (pu && String(pu) === v) {
        const nm = getPointName(p) || "(unnamed)";
        return `${nm} (${v.slice(0, 8)}…)`;
      }
    }
    // coord shorthand (joined string) or unknown uuid
    if (v.includes(",") && v.split(",").length === 3) return `coord (${v})`;
    return `unknown (${v.slice(0, 8)}…)`;
  }

  function fillInputsFromDoc(uuid) {
    const doc = core.getDocument?.();
    const found = findByUuid(doc, uuid);

    const name = (found.kind === "line") ? getLineCaption(found.node) : getPointName(found.node);
    if (inpName) inpName.value = name;

    const isPoint = found.kind === "point";
    const isAux = found.kind === "aux";
    const isLine = found.kind === "line";

    // Marker text (point/aux)
    if (textField) {
      textField.hidden = !(isPoint || isAux);
      textField.style.display = (isPoint || isAux) ? "" : "none";
    }
    if (isPoint || isAux) {
      if (inpTextContent) inpTextContent.value = getMarkerTextContent(found.node);
      if (inpTextSize) inpTextSize.value = String(getMarkerTextSize(found.node));
      if (selTextAlign) selTextAlign.value = getMarkerTextAlign(found.node);
      const pose = getMarkerTextPose(found.node);
      if (inpTextFrontX) inpTextFrontX.value = pose ? String(pose.front[0]) : "";
      if (inpTextFrontY) inpTextFrontY.value = pose ? String(pose.front[1]) : "";
      if (inpTextFrontZ) inpTextFrontZ.value = pose ? String(pose.front[2]) : "";
      if (inpTextUpX) inpTextUpX.value = pose ? String(pose.up[0]) : "";
      if (inpTextUpY) inpTextUpY.value = pose ? String(pose.up[1]) : "";
      if (inpTextUpZ) inpTextUpZ.value = pose ? String(pose.up[2]) : "";
    } else {
      if (inpTextContent) inpTextContent.value = "";
      if (inpTextSize) inpTextSize.value = "";
      if (selTextAlign) selTextAlign.value = "";
      if (inpTextFrontX) inpTextFrontX.value = "";
      if (inpTextFrontY) inpTextFrontY.value = "";
      if (inpTextFrontZ) inpTextFrontZ.value = "";
      if (inpTextUpX) inpTextUpX.value = "";
      if (inpTextUpY) inpTextUpY.value = "";
      if (inpTextUpZ) inpTextUpZ.value = "";
    }
    if (nameLabel) nameLabel.textContent = isLine ? "caption" : "name";
    if (posField) posField.hidden = !(isPoint || isAux);
    if (lineEndsField) lineEndsField.hidden = !isLine;
    if (captionTextField) { captionTextField.hidden = !isLine; captionTextField.style.display = isLine ? "" : "none"; }

    // Aux does not support signification.name in schema; treat "name" as display-only.
    // In UI we hide the name input and show module selector instead.
    if (auxModuleField) {
      auxModuleField.hidden = !isAux;
      // Some overrides may accidentally force [hidden] visible; hard-hide as well.
      auxModuleField.style.display = isAux ? "" : "none";
    }
    if (inpName) {
      const field = inpName.closest?.('.prop-field');
      if (field) {
        field.hidden = isAux;
        field.style.display = isAux ? 'none' : '';
      }
    }
    if (isPoint || isAux) {
      const [x, y, z] = getPos(found.node);
      if (inpX) inpX.value = String(x);
      if (inpY) inpY.value = String(y);
      if (inpZ) inpZ.value = String(z);
    }

    if (isAux) {
      const mod = found.node?.appearance?.module;
      const key = (mod && typeof mod === "object") ? (Object.keys(mod)[0] || "") : "";
      if (selAuxModule) selAuxModule.value = String(key);
    }

    if (!isAux) {
      if (selAuxModule) selAuxModule.value = "";
    }

    if (isLine) {
      const aObj = found.node?.end_a;
      const bObj = found.node?.end_b;
      const a = (aObj && typeof aObj === "object") ? (typeof aObj.ref === "string" ? aObj.ref : (Array.isArray(aObj.coord) ? aObj.coord.join(",") : "")) : String(aObj || "");
      const b = (bObj && typeof bObj === "object") ? (typeof bObj.ref === "string" ? bObj.ref : (Array.isArray(bObj.coord) ? bObj.coord.join(",") : "")) : String(bObj || "");
      if (inpEndA) inpEndA.value = a;
      if (inpEndB) inpEndB.value = b;

      if (endAResolvedEl) endAResolvedEl.textContent = a ? formatEndpointRef(doc, a) : "";
      if (endBResolvedEl) endBResolvedEl.textContent = b ? formatEndpointRef(doc, b) : "";

      // caption_text (appearance.caption_text)
      if (inpCaptionTextContent) inpCaptionTextContent.value = getCaptionTextContent(found.node);
      if (inpCaptionTextSize) {
        const v = getCaptionTextSize(found.node);
        inpCaptionTextSize.value = v ? String(v) : "";
      }
      if (selCaptionTextAlign) selCaptionTextAlign.value = getCaptionTextAlign(found.node);
      const cpose = getCaptionTextPose(found.node);
      if (inpCaptionTextFrontX) inpCaptionTextFrontX.value = cpose ? String(cpose.front[0]) : "";
      if (inpCaptionTextFrontY) inpCaptionTextFrontY.value = cpose ? String(cpose.front[1]) : "";
      if (inpCaptionTextFrontZ) inpCaptionTextFrontZ.value = cpose ? String(cpose.front[2]) : "";
      if (inpCaptionTextUpX) inpCaptionTextUpX.value = cpose ? String(cpose.up[0]) : "";
      if (inpCaptionTextUpY) inpCaptionTextUpY.value = cpose ? String(cpose.up[1]) : "";
      if (inpCaptionTextUpZ) inpCaptionTextUpZ.value = cpose ? String(cpose.up[2]) : "";

      // Populate point UUID candidates for datalist.
      if (pointsDatalist) {
        pointsDatalist.textContent = "";
        const pts = Array.isArray(doc?.points) ? doc.points : [];
        for (const p of pts) {
          const pu = uuidOf(p);
          if (!pu) continue;
          const opt = document.createElement("option");
          opt.value = String(pu);
          const nm = getPointName(p);
          if (nm) opt.label = `${nm} (${String(pu).slice(0, 8)}…)`;
          pointsDatalist.appendChild(opt);
        }
      }
    }

    if (!isLine) {
      if (inpEndA) inpEndA.value = "";
      if (inpEndB) inpEndB.value = "";
      if (pointsDatalist) pointsDatalist.textContent = "";
      if (endAResolvedEl) endAResolvedEl.textContent = "";
      if (endBResolvedEl) endBResolvedEl.textContent = "";
      if (inpCaptionTextContent) inpCaptionTextContent.value = "";
      if (inpCaptionTextSize) inpCaptionTextSize.value = "";
      if (selCaptionTextAlign) selCaptionTextAlign.value = "";
      if (inpCaptionTextFrontX) inpCaptionTextFrontX.value = "";
      if (inpCaptionTextFrontY) inpCaptionTextFrontY.value = "";
      if (inpCaptionTextFrontZ) inpCaptionTextFrontZ.value = "";
      if (inpCaptionTextUpX) inpCaptionTextUpX.value = "";
      if (inpCaptionTextUpY) inpCaptionTextUpY.value = "";
      if (inpCaptionTextUpZ) inpCaptionTextUpZ.value = "";
    }

    // Update small pose-mode hints.
    syncPoseModeBadgesFromInputs();
  }

  function showProperty(issueLike) {
    // Selection changed: revert previous draft preview (if any) back to document state.
    previewRevertToBase();
    previewBase = null;
    const uuid = issueLike?.uuid ? String(issueLike.uuid) : "";
    if (!uuid) { hideAll(); return; }

    const doc = core.getDocument?.();
    const found = findByUuid(doc, uuid);
    const kind = found.kind || issueLike?.kind || "unknown";
    const path = issueLike?.path || "/";

    active = { uuid, kind, path };
    setDirty(false);

    if (uuidEl) uuidEl.textContent = uuid;
    if (kindEl) kindEl.textContent = String(kind);
    if (pathEl) pathEl.textContent = String(path);

    fillInputsFromDoc(uuid);
    refreshLockState();

    if (selCountHeaderEl) selCountHeaderEl.hidden = true;

    // Best-effort focus hint (viewport/outliner). Selection is already the SSOT.
    try {
      if (typeof core.focusByIssue === "function") core.focusByIssue({ uuid, kind, path });
    } catch {}

    if (emptyEl) emptyEl.hidden = true;
    if (multiEl) multiEl.hidden = true;
    if (panelEl) panelEl.hidden = false;
    if (selCountHeaderEl) selCountHeaderEl.hidden = true;
  }

  function discardEdits() {
    if (!active) return;
    fillInputsFromDoc(active.uuid);
    setDirty(false);
    setHud("Edits discarded");
  }

  function buildPatchForActiveEdits() {
    if (!active) return null;
    const uuid = active.uuid;
    const doc = core.getDocument?.();
    const found = findByUuid(doc, uuid);
    if (!found.node) return null;

    /** @type {{target:string, kind:string, ops: Array<{path:string, before:any, after:any}>}} */
    const patch = { target: uuid, kind: found.kind || "unknown", ops: [] };

    // Name/caption
    if (found.kind === "point") {
      const beforeName = getPointName(found.node);
      const nextName = inpName ? String(inpName.value || "").trim() : "";
      if (beforeName !== nextName) {
        patch.ops.push({ path: "/signification/name", before: beforeName, after: nextName });
      }

      // marker.text (content/size/align). Empty content => remove marker.text.
      const beforeText = getMarkerText(found.node);
      const beforeContent = getMarkerTextContent(found.node);
      const beforeSize = getMarkerTextSize(found.node);
      const beforeAlign = getMarkerTextAlign(found.node);

      const nextContent = inpTextContent ? String(inpTextContent.value || "").trim() : "";
      const nextSize = inpTextSize ? num(inpTextSize.value, beforeSize) : beforeSize;
      const nextAlign = selTextAlign ? String(selTextAlign.value || "") : beforeAlign;
      const beforePose = getMarkerTextPose(found.node);
      const readPose = (frontInputs, upInputs, before) => {
        const frontVals = frontInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
        const upVals = upInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
        const allEmpty = frontVals.every((s) => !s) && upVals.every((s) => !s);
        if (allEmpty) return null;
        const fb = before?.front || [0,0,0];
        const ub = before?.up || [0,0,0];
        const front = frontVals.map((s,i)=> s? num(s, fb[i]) : fb[i]);
        const up = upVals.map((s,i)=> s? num(s, ub[i]) : ub[i]);
        const { pose, error } = sanitizePose(front, up);
        if (error) return { __invalid: true, error };
        return pose;
      };
      const nextPose = readPose([inpTextFrontX, inpTextFrontY, inpTextFrontZ], [inpTextUpX, inpTextUpY, inpTextUpZ], beforePose);

      if (nextPose && nextPose.__invalid) {
        setHud(nextPose.error || "Invalid pose");
        return null;
      }

      // Only consider marker.text when at least one of the fields is present in DOM.
      const hasTextInputs = !!(inpTextContent || inpTextSize || selTextAlign);
      if (hasTextInputs) {
        if (!nextContent) {
          // Remove marker.text if it existed.
          if (beforeText) patch.ops.push({ path: "/appearance/marker/text", before: beforeText, after: null });
        } else {
          // Ensure we create/overwrite marker.text.
          const nextText = {
            content: nextContent,
            size: nextSize,
            ...(nextAlign ? { align: nextAlign } : {}),
            ...(nextPose ? { pose: nextPose } : {}),
          };
          const beforeNorm = beforeText ? {
            content: beforeContent,
            size: beforeSize,
            ...(beforeAlign ? { align: beforeAlign } : {}),
            ...(beforePose ? { pose: beforePose } : {}),
          } : null;
          if (JSON.stringify(beforeNorm) !== JSON.stringify(nextText)) {
            patch.ops.push({ path: "/appearance/marker/text", before: beforeText, after: nextText });
          }
        }
      }
    } else if (found.kind === "aux") {
      // marker.text for aux (optional). Empty content removes marker.text.
      const beforeText = getMarkerText(found.node);
      const beforeContent = getMarkerTextContent(found.node);
      const beforeSize = getMarkerTextSize(found.node);
      const beforeAlign = getMarkerTextAlign(found.node);
      const beforePose = getMarkerTextPose(found.node);
      const nextContent = inpTextContent ? String(inpTextContent.value || "").trim() : "";
      const nextSize = inpTextSize ? num(inpTextSize.value, beforeSize) : beforeSize;
      const nextAlign = selTextAlign ? String(selTextAlign.value || "") : beforeAlign;
      const readPose = (frontInputs, upInputs, before) => {
        const frontVals = frontInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
        const upVals = upInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
        const allEmpty = frontVals.every((s) => !s) && upVals.every((s) => !s);
        if (allEmpty) return null;
        const fb = before?.front || [0,0,0];
        const ub = before?.up || [0,0,0];
        const front = frontVals.map((s,i)=> s? num(s, fb[i]) : fb[i]);
        const up = upVals.map((s,i)=> s? num(s, ub[i]) : ub[i]);
        const { pose, error } = sanitizePose(front, up);
        if (error) return { __invalid: true, error };
        return pose;
      };
      const nextPose = readPose([inpTextFrontX, inpTextFrontY, inpTextFrontZ], [inpTextUpX, inpTextUpY, inpTextUpZ], beforePose);

      if (nextPose && nextPose.__invalid) {
        setHud(nextPose.error || "Invalid pose");
        return null;
      }
      const hasTextInputs = !!(inpTextContent || inpTextSize || selTextAlign || inpTextFrontX || inpTextUpX);
      if (hasTextInputs) {
        if (!nextContent) {
          if (beforeText) patch.ops.push({ path: "/appearance/marker/text", before: beforeText, after: null });
        } else {
          const nextText = { content: nextContent, size: nextSize, ...(nextAlign ? { align: nextAlign } : {}), ...(nextPose ? { pose: nextPose } : {}) };
          const beforeNorm = beforeText ? { content: beforeContent, size: beforeSize, ...(beforeAlign ? { align: beforeAlign } : {}), ...(beforePose ? { pose: beforePose } : {}) } : null;
          if (JSON.stringify(beforeNorm) !== JSON.stringify(nextText)) {
            patch.ops.push({ path: "/appearance/marker/text", before: beforeText, after: nextText });
          }
        }
      }
    } else if (found.kind === "line") {
      const beforeCaption = getLineCaption(found.node);
      const nextCaption = inpName ? String(inpName.value || "").trim() : "";
      if (beforeCaption !== nextCaption) {
        patch.ops.push({ path: "/signification/caption", before: beforeCaption, after: nextCaption });
      }

      // caption_text (content/size/align/pose). Empty content => remove caption_text.
      const beforeCT = getCaptionText(found.node);
      const beforeCTContent = getCaptionTextContent(found.node);
      const beforeCTSize = getCaptionTextSize(found.node);
      const beforeCTAlign = getCaptionTextAlign(found.node);
      const beforeCTPose = getCaptionTextPose(found.node);
      const nextCTContent = inpCaptionTextContent ? String(inpCaptionTextContent.value || "").trim() : "";
      const nextCTSize = inpCaptionTextSize ? num(inpCaptionTextSize.value, beforeCTSize) : beforeCTSize;
      const nextCTAlign = selCaptionTextAlign ? String(selCaptionTextAlign.value || "") : beforeCTAlign;
      const readPose = (frontInputs, upInputs, before) => {
        const frontVals = frontInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
        const upVals = upInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
        const allEmpty = frontVals.every((s) => !s) && upVals.every((s) => !s);
        if (allEmpty) return null;
        const fb = before?.front || [0,0,0];
        const ub = before?.up || [0,0,0];
        const front = frontVals.map((s,i)=> s? num(s, fb[i]) : fb[i]);
        const up = upVals.map((s,i)=> s? num(s, ub[i]) : ub[i]);
        const { pose, error } = sanitizePose(front, up);
        if (error) return { __invalid: true, error };
        return pose;
      };
      const nextCTPose = readPose([inpCaptionTextFrontX, inpCaptionTextFrontY, inpCaptionTextFrontZ], [inpCaptionTextUpX, inpCaptionTextUpY, inpCaptionTextUpZ], beforeCTPose);

      if (nextCTPose && nextCTPose.__invalid) {
        setHud(nextCTPose.error || "Invalid pose");
        return null;
      }
      const hasCTInputs = !!(inpCaptionTextContent || inpCaptionTextSize || selCaptionTextAlign || inpCaptionTextFrontX || inpCaptionTextUpX);
      if (hasCTInputs) {
        if (!nextCTContent) {
          if (beforeCT) patch.ops.push({ path: "/appearance/caption_text", before: beforeCT, after: null });
        } else {
          const nextCT = { content: nextCTContent, size: nextCTSize, ...(nextCTAlign ? { align: nextCTAlign } : {}), ...(nextCTPose ? { pose: nextCTPose } : {}) };
          const beforeNorm = beforeCT ? { content: beforeCTContent, size: beforeCTSize, ...(beforeCTAlign ? { align: beforeCTAlign } : {}), ...(beforeCTPose ? { pose: beforeCTPose } : {}) } : null;
          if (JSON.stringify(beforeNorm) !== JSON.stringify(nextCT)) {
            patch.ops.push({ path: "/appearance/caption_text", before: beforeCT, after: nextCT });
          }
        }
      }
    }

    // Position
    if (found.kind === "point" || found.kind === "aux") {
      const beforePos = getPos(found.node);
      const nextPos = [inpX ? num(inpX.value) : 0, inpY ? num(inpY.value) : 0, inpZ ? num(inpZ.value) : 0];
      if (beforePos[0] != nextPos[0] || beforePos[1] != nextPos[1] || beforePos[2] != nextPos[2]) {
        patch.ops.push({ path: "/appearance/position", before: beforePos, after: nextPos });
      }
    }

    // Aux module
    if (found.kind === "aux") {
      const beforeMod = found.node?.appearance?.module;
      const beforeKey = (beforeMod && typeof beforeMod === "object") ? (Object.keys(beforeMod)[0] || "") : "";
      const nextKey = selAuxModule ? String(selAuxModule.value || "") : "";
      if (beforeKey !== nextKey) {
        patch.ops.push({ path: "/appearance/module", before: beforeKey, after: nextKey });
      }
    }

    // Line endpoints (ref or coord)
    if (found.kind === "line") {
      const pointUuids = new Set((Array.isArray(doc?.points) ? doc.points : []).map((p) => String(uuidOf(p) || "")).filter(Boolean));

      const beforeA = found.node?.end_a || null;
      const beforeB = found.node?.end_b || null;
      const parsedA = inpEndA ? parseEndpointInput(String(inpEndA.value || "")) : null;
      const parsedB = inpEndB ? parseEndpointInput(String(inpEndB.value || "")) : null;
      const nextA = parsedA ?? beforeA;
      const nextB = parsedB ?? beforeB;

      // Validate refs against current points
      if (nextA && typeof nextA === "object" && typeof nextA.ref === "string" && nextA.ref && !pointUuids.has(nextA.ref)) {
        setHud(`Invalid end_a (point uuid not found): ${nextA.ref.slice(0, 8)}`);
        return null;
      }
      if (nextB && typeof nextB === "object" && typeof nextB.ref === "string" && nextB.ref && !pointUuids.has(nextB.ref)) {
        setHud(`Invalid end_b (point uuid not found): ${nextB.ref.slice(0, 8)}`);
        return null;
      }

      if (JSON.stringify(beforeA) != JSON.stringify(nextA)) patch.ops.push({ path: "/end_a", before: beforeA, after: nextA });
      if (JSON.stringify(beforeB) != JSON.stringify(nextB)) patch.ops.push({ path: "/end_b", before: beforeB, after: nextB });
    }

    if (patch.ops.length === 0) return null;
    return patch;
  }

  function applyPatch(doc, patch) {
    const clone = cloneDoc(doc);
    const found = findByUuid(clone, patch?.target);
    if (!found.node) return clone;

    for (const op of patch.ops || []) {
      if (op.path === "/signification/name" && found.kind === "point") {
        setPointName(found.node, String(op.after ?? ""));
      }
      else if (op.path === "/signification/caption" && found.kind === "line") {
        setLineCaption(found.node, String(op.after ?? ""));
      }
      else if (op.path === "/appearance/position" && (found.kind === "point" || found.kind === "aux")) {
        setPos(found.node, op.after);
      }
      else if (op.path === "/appearance/marker/text" && (found.kind === "point" || found.kind === "aux")) {
        if (!found.node.appearance || typeof found.node.appearance !== "object") found.node.appearance = { ...(found.node.appearance || {}) };
        if (!found.node.appearance.marker || typeof found.node.appearance.marker !== "object") {
          // Keep marker primitive stable; default to none.
          found.node.appearance.marker = { primitive: "none" };
        }
        if (!op.after) {
          try { delete found.node.appearance.marker.text; } catch {}
        } else {
          found.node.appearance.marker.text = op.after;
        }
      }
      else if (op.path === "/appearance/caption_text" && found.kind === "line") {
        if (!found.node.appearance || typeof found.node.appearance !== "object") found.node.appearance = { ...(found.node.appearance || {}) };
        if (!op.after) {
          try { delete found.node.appearance.caption_text; } catch {}
        } else {
          found.node.appearance.caption_text = op.after;
        }
      }
      else if (op.path === "/appearance/module" && found.kind === "aux") {
        if (!found.node.appearance || typeof found.node.appearance !== "object") found.node.appearance = { ...(found.node.appearance || {}) };
        const k = String(op.after || "");
        if (!k) {
          delete found.node.appearance.module;
        } else {
          found.node.appearance.module = { [k]: {} };
        }
      }
      else if (op.path === "/end_a" && found.kind === "line") {
        if (op.after && typeof op.after === "object") {
          found.node.end_a = op.after;
        }
      }
      else if (op.path === "/end_b" && found.kind === "line") {
        if (op.after && typeof op.after === "object") {
          found.node.end_b = op.after;
        }
      }
    }

    return clone;
  }

  function applyActiveEdits() {
    if (!active) return false;
    if (lockedActive) {
      setHud(`Locked: ${active.uuid}`);
      return false;
    }
    const patch = buildPatchForActiveEdits();
    if (!patch) {
      setDirty(false);
      return false;
    }

    // Coalesce all mutations triggered by a single Apply into one undo step.
    try { core.beginHistoryGroup?.(); } catch {}
    try {
      core.updateDocument?.((doc) => applyPatch(doc, patch));
    } finally {
      try { core.endHistoryGroup?.(); } catch {}
    }

    // After commit, refresh preview base to committed document state.
    try { if (active) { previewCaptureBase(active.uuid, active.kind); previewRevertToBase(); } } catch {}

    setDirty(false);
    setHud(`Applied: ${patch.target}`);
    return true;
  }

  /**
   * 3-way resolution for unapplied edits.
   * @returns {boolean} true if it is safe to proceed.
   */
  function ensureEditsAppliedOrConfirm() {
    if (!dirty) return true;

    const apply = window.confirm("You have unapplied property edits. Apply them now?\n\nOK = Apply\nCancel = More options");
    if (apply) {
      applyActiveEdits();
      return true;
    }

    const discard = window.confirm("Discard unapplied edits?\n\nOK = Discard\nCancel = Stay here");
    if (discard) {
      discardEdits();
      return true;
    }

    return false;
  }

  function onAnyInput() {
    if (!active) return;
    if (lockedActive) {
      try { setHud(`Locked: ${active.uuid}`); } catch {}
      // Revert buffer to document values.
      fillInputsFromDoc(active.uuid);
      return;
    }

    // Draft preview (P1): reflect edits in preview without mutating core.
    // Apply is the only commit point.
    try {
      const doc = core.getDocument?.();

      if (previewSetPosition && (active.kind === "point" || active.kind === "aux")) {
        const found = findByUuid(doc, active.uuid);
        const beforePos = found?.node ? getPos(found.node) : [0, 0, 0];
        pendingPreviewUuid = String(active.uuid);
        pendingPreviewPos = [
          inpX ? num(inpX.value, beforePos[0]) : beforePos[0],
          inpY ? num(inpY.value, beforePos[1]) : beforePos[1],
          inpZ ? num(inpZ.value, beforePos[2]) : beforePos[2],
        ];
      }

      if (previewSetLineEnds && active.kind === "line") {
        pendingPreviewLineUuid = String(active.uuid);
        pendingPreviewEndA = inpEndA ? parseEndpointInput(inpEndA.value) : null;
        pendingPreviewEndB = inpEndB ? parseEndpointInput(inpEndB.value) : null;
      }

      if (previewSetCaptionText && active.kind === "line") {
        const found = findByUuid(doc, active.uuid);
        const beforeCTPose = found?.node ? getCaptionTextPose(found.node) : null;
        const readPose = (frontInputs, upInputs, before) => {
          const frontVals = frontInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
          const upVals = upInputs.map((el) => (el ? String(el.value ?? "").trim() : ""));
          const allEmpty = frontVals.every((s) => !s) && upVals.every((s) => !s);
          if (allEmpty) return null;
          const fb = before?.front || [0,0,0];
          const ub = before?.up || [0,0,0];
          const front = frontVals.map((s,i)=> s? num(s, fb[i]) : fb[i]);
          const up = upVals.map((s,i)=> s? num(s, ub[i]) : ub[i]);
          const { pose, error } = sanitizePose(front, up);
          if (error) return { __invalid: true, error };
          return pose;
        };
        const pose = readPose([inpCaptionTextFrontX, inpCaptionTextFrontY, inpCaptionTextFrontZ], [inpCaptionTextUpX, inpCaptionTextUpY, inpCaptionTextUpZ], beforeCTPose);
        if (pose && pose.__invalid) {
          try { setHud(pose.error || "Invalid pose"); } catch {}
          // Do not update preview on invalid input.
        } else {
          pendingPreviewCaptionUuid = String(active.uuid);
          pendingPreviewCaptionFallback = found?.node ? getLineCaption(found.node) : "";
          const content = inpCaptionTextContent ? String(inpCaptionTextContent.value || "").trim() : "";
          const beforeSize = found?.node ? getCaptionTextSize(found.node) : 0;
          const size = inpCaptionTextSize ? num(inpCaptionTextSize.value, beforeSize) : beforeSize;
          const align = selCaptionTextAlign ? String(selCaptionTextAlign.value || "") : (found?.node ? getCaptionTextAlign(found.node) : "");
          pendingPreviewCaptionText = content ? { content, size, ...(align ? { align } : {}), ...(pose ? { pose } : {}) } : null;
        }
      }

      if ((pendingPreviewUuid && pendingPreviewPos) || pendingPreviewLineUuid || pendingPreviewCaptionUuid) {
        if (!rafPreview) {
          rafPreview = requestAnimationFrame(() => {
            rafPreview = 0;

            const u = pendingPreviewUuid;
            const p = pendingPreviewPos;
            pendingPreviewUuid = "";
            pendingPreviewPos = null;

            const ln = pendingPreviewLineUuid;
            const a = pendingPreviewEndA;
            const b = pendingPreviewEndB;
            pendingPreviewLineUuid = "";
            pendingPreviewEndA = null;
            pendingPreviewEndB = null;

            const cu = pendingPreviewCaptionUuid;
            const ct = pendingPreviewCaptionText;
            const fb = pendingPreviewCaptionFallback;
            pendingPreviewCaptionUuid = "";
            pendingPreviewCaptionText = null;
            pendingPreviewCaptionFallback = "";

            try {
              if (u && p) previewSetPosition?.(String(u), p);
            } catch {}
            try {
              if (ln) previewSetLineEnds?.(String(ln), a, b);
            } catch {}
            try {
              if (cu) previewSetCaptionText?.(String(cu), ct, fb);
            } catch {}
          });
        }
      }
    } catch {}
    setDirty(true);
  }


  function attachPosInputKeyHandlers(inp) {
    if (!inp) return;
    inp.addEventListener(
      "keydown",
      (ev) => {
        if (!active) return;
        if (lockedActive) return;
        if (ev.key === "Enter" && !ev.ctrlKey && !ev.metaKey) {
          // Enter: Apply and advance (Shift+Enter keeps focus)
          if (!dirty) return;
          ev.preventDefault();
          const keep = ev.shiftKey;
          applyActiveEdits();
          queueMicrotask(() => {
            try {
              if (keep) {
                inp.focus();
                inp.select?.();
                return;
              }
              // Advance focus for fast numeric entry: X -> Y -> Z -> X
              const order = [inpX, inpY, inpZ].filter(Boolean);
              const idx = order.indexOf(inp);
              const next = order[(idx + 1) % order.length] || inp;
              next.focus();
              next.select?.();
            } catch {}
          });
          return;
        }
        if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
          // Arrow keys: fine/coarse stepping with modifiers
          ev.preventDefault();
          const base = posStep;
          // NOTE: On Windows/Chrome, Alt can get eaten by the browser/menu.
          // Accept Ctrl as an alias for fine stepping.
          const mul = ev.shiftKey ? 10 : ((ev.altKey || ev.ctrlKey) ? 0.1 : 1);
          const delta = base * mul * (ev.key === "ArrowUp" ? 1 : -1);
          const cur = Number(inp.value || "0") || 0;
          const next = cur + delta;
          inp.value = String(Number.isFinite(next) ? next : cur);
          onAnyInput();
        }
      },
      { signal }
    );

    // Wheel stepping (focus must be on this input)
    inp.addEventListener(
      "wheel",
      (ev) => {
        if (!active) return;
        if (lockedActive) return;
        if (document.activeElement !== inp) return;
        // Prevent page scroll while editing numbers.
        ev.preventDefault();
        const base = posStep;
        const mul = ev.shiftKey ? 10 : ((ev.altKey || ev.ctrlKey) ? 0.1 : 1);
        // Some devices use deltaX when Shift is held (horizontal scroll).
        const d = (Math.abs(ev.deltaY) >= Math.abs(ev.deltaX)) ? ev.deltaY : ev.deltaX;
        const dir = d < 0 ? 1 : -1;
        const delta = base * mul * dir;
        const cur = Number(inp.value || "0") || 0;
        const next = cur + delta;
        inp.value = String(Number.isFinite(next) ? next : cur);
        onAnyInput();
      },
      { signal, passive: false }
    );
  }


  loadPosStepFromStorage();

  if (inpName) inpName.addEventListener("input", onAnyInput, { signal });
  if (inpTextContent) inpTextContent.addEventListener("input", onAnyInput, { signal });
  if (inpTextSize) inpTextSize.addEventListener("input", onAnyInput, { signal });
  if (selTextAlign) selTextAlign.addEventListener("change", onAnyInput, { signal });
  if (selAuxModule) selAuxModule.addEventListener("change", onAnyInput, { signal });
  if (inpX) inpX.addEventListener("input", onAnyInput, { signal });
  if (inpY) inpY.addEventListener("input", onAnyInput, { signal });
  if (inpZ) inpZ.addEventListener("input", onAnyInput, { signal });

  if (selPosStep) selPosStep.addEventListener(
    "change",
    () => {
      posStep = clampPosStep(selPosStep.value);
      syncPosStepUi();
      savePosStepToStorage();
      // Keep focus on the active numeric field if any.
      try {
        const el = document.activeElement;
        if (el === inpX || el === inpY || el === inpZ) {
          el.focus();
          el.select?.();
        }
      } catch {}
    },
    { signal }
  );

  attachPosInputKeyHandlers(inpX);
  attachPosInputKeyHandlers(inpY);
  attachPosInputKeyHandlers(inpZ);
  if (inpEndA) inpEndA.addEventListener("input", onAnyInput, { signal });
  if (inpEndB) inpEndB.addEventListener("input", onAnyInput, { signal });

  // Endpoint helpers (Line)
  if (btnPickEndA) btnPickEndA.addEventListener("click", () => startEndpointPick("a"), { signal });
  if (btnPickEndB) btnPickEndB.addEventListener("click", () => startEndpointPick("b"), { signal });
  if (btnClearEndA) btnClearEndA.addEventListener(
    "click",
    () => {
      if (!active || active.kind !== "line") return;
      if (lockedActive) return;
      if (inpEndA) inpEndA.value = "";
      setDirty(true);
    },
    { signal }
  );
  if (btnClearEndB) btnClearEndB.addEventListener(
    "click",
    () => {
      if (!active || active.kind !== "line") return;
      if (lockedActive) return;
      if (inpEndB) inpEndB.value = "";
      setDirty(true);
    },
    { signal }
  );

  function handlePreviewPickOverride(issueLike) {
    if (!endpointPick) return false;
    // During endpoint pick, we intercept preview clicks to set end_a/end_b.
    const uuid = issueLike?.uuid ? String(issueLike.uuid) : "";
    const kind = String(issueLike?.kind || "").toLowerCase();
    if (!uuid || kind !== "point") {
      try { setHud("Pick a point for endpoint"); } catch {}
      return true;
    }
    if (!active || active.kind !== "line") {
      cancelEndpointPick();
      return true;
    }
    if (lockedActive) {
      try { setHud(`Locked: ${active.uuid}`); } catch {}
      cancelEndpointPick();
      return true;
    }
    if (endpointPick === "a") {
      if (inpEndA) inpEndA.value = uuid;
    } else {
      if (inpEndB) inpEndB.value = uuid;
    }
    setDirty(true);
    const which = endpointPick;
    setEndpointPick(null);
    try { setHud(`Set end_${which} = ${uuid.slice(0, 8)}…`); } catch {}
    return true;
  }

  // Keyboard helpers within property editor:
  // - Ctrl/Cmd+Enter: Apply
  // - Escape: Discard
  if (panelEl) {
    panelEl.addEventListener(
      "keydown",
      (ev) => {
        if (!active) return;
        if (ev.key === "Escape") {
          if (endpointPick) {
            ev.preventDefault();
            cancelEndpointPick();
            return;
          }
          if (dirty) {
            ev.preventDefault();
            discardEdits();
          }
          return;
        }
        if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          applyActiveEdits();
        }
      },
      { signal }
    );
  }

  function refreshActiveFromDoc() {
    if (!active) return;
    if (dirty) return; // don't overwrite buffer

    // Keep header info stable, but refresh values from the current document.
    fillInputsFromDoc(active.uuid);
    refreshLockState();
  }

  function syncFromSelection() {
    // Selection -> Property state machine (single SSOT event: hub 'selection')
    //
    //  Selection size | Property UI
    //  -------------- | -------------------------------
    //  0              | empty placeholder (no active)
    //  2+             | property closed + show count
    //  1              | property open for that uuid
    //
    // Transition rule when buffer-dirty:
    // - If selection moves away from the active uuid, require Apply/Discard.
    // - If user cancels, revert selection back to the active uuid.
    const sel = core.getSelection?.() || [];
    const list = Array.isArray(sel) ? sel : [];

    // Switching away while draft edits exist must be resolved first.
    if (dirty) {
      const activeUuid = active?.uuid || null;
      const nextIsDifferent = (list.length !== 1) || (String(list[0] || "") !== String(activeUuid || ""));
      if (nextIsDifferent) {
        const ok = ensureEditsAppliedOrConfirm();
        if (!ok) {
          if (activeUuid) {
            try {
              if (typeof setSelectionUuids === "function") setSelectionUuids([activeUuid], null, "property-revert");
              else core.setSelection?.([activeUuid]);
            } catch { try { core.setSelection?.([activeUuid]); } catch {} }
          }
          return;
        }
      }
    }

    if (list.length === 0) {
      hideAll();
      return;
    }

    if (list.length !== 1) {
      showMulti(list.length);
      return;
    }

    const uuid = String(list[0] || "");
    if (!uuid) {
      hideAll();
      return;
    }

    // No change
    if (active?.uuid === uuid) {
      refreshActiveFromDoc();
      return;
    }

    showProperty({ uuid });
  }

  // Initialize
  hideAll();

  return {
    showProperty,
    hidePanel: hideAll,
    showMulti,
    discardEdits,
    applyActiveEdits,
    ensureEditsAppliedOrConfirm,
    refreshActiveFromDoc,
    refreshLockState,
    syncFromSelection,
    isDirty,
    isActiveLocked: () => !!lockedActive,
    getActiveUuid,
    // Preview pick override (endpoint pick mode)
    handlePreviewPickOverride,
    isEndpointPickActive: () => !!endpointPick,
    cancelEndpointPick,
  };
}
