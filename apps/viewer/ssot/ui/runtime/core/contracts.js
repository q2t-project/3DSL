// viewer/runtime/core/contracts.js
// Phase2: data contracts (single source of truth)

/** @typedef {'macro'|'meso'|'micro'} UIMode */
/** @typedef {'points'|'lines'|'aux'} ElementKind */

/** @typedef {'auto'|'fixed'|'adaptive'} LineWidthMode */
/** @typedef {'weak'|'normal'|'strong'} MicroFXProfile */

/**
 * VisibleSet は「いま描画対象の UUID 集合」。
 * - recomputeVisibleSet(factory) が生成し、uiState.visibleSet に置く
 * - renderer はこれだけを見て applyFrame する
 *
 * @typedef {Object} VisibleSet
 * @property {number} frame               - この visibleSet を作った frame index（監査用）
 * @property {ReadonlySet<string>} points
 * @property {ReadonlySet<string>} lines
 * @property {ReadonlySet<string>} aux
 */

/**
 * Selection は「外向き API は {uuid}|null」「内側は kind 任意」の 2層にする。
 *
 * @typedef {Object} SelectionState
 * @property {string|null} uuid
 * @property {ElementKind|null} [kind]    - 無くてもOK（normalizeSelection で補完してもいい）
 *
 * @typedef {{uuid:string}} SelectionPublic
 */

/**
 * microFX に渡す “最小契約”。
 * highlight/glow が最低限必要とするキーだけを保証する。
 *
 * @typedef {Object} MicroState
 * @property {string|null} focusUuid
 * @property {string[]} relatedUuids
 * @property {[number,number,number]|undefined} [focusPosition] // あってもよい（無くても動く設計にする）
 */

/**
 * uiState の “最低限ここだけは必ずある” 契約。
 * - viewerSettingsController が vs/render/fx/micro の正規化を持つので、ここでは上書きしない
 *
 * @typedef {Object} UIState
 * @property {UIMode} mode
 * @property {{current:number}} frame
 * @property {{isFramePlaying?:boolean, isCameraAuto?:boolean}} runtime
 * @property {{ types: Record<ElementKind, boolean> }} filters
 * @property {{
 *   render?: { lineWidthMode?: LineWidthMode },
 *   fx?: { micro?: { enabled?: boolean, profile?: MicroFXProfile } }
 * }} viewerSettings
 * @property {VisibleSet|null} visibleSet
 * @property {SelectionState|null} selection
 * @property {MicroState|null} microState
 */

// ------------------------------------------------------------
// minimal normalizers (shape only; do not compute)
// ------------------------------------------------------------

/**
 * uiState の形だけ整える（値の意味解釈はしない）
 * @param {any} uiState
 * @returns {UIState}
 */
export function ensureUIStateShape(uiState) {
  const fail = (msg) => { throw new Error(`ensureUIStateShape: ${msg}`); };
  const isObj = (v) => v !== null && typeof v === "object";
  const isBool = (v) => typeof v === "boolean";
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const isStr = (v) => typeof v === "string";
  const isStrArray = (v) => Array.isArray(v) && v.every(isStr);
  const isKind = (v) => v === "points" || v === "lines" || v === "aux";

  if (!isObj(uiState)) fail("uiState must be an object");

  if (!isObj(uiState.frame)) fail("uiState.frame must be an object");
 if (!isNum(uiState.frame.current)) fail("uiState.frame.current must be a finite number");

  if (!isObj(uiState.runtime)) fail("uiState.runtime must be an object");
  if (!isBool(uiState.runtime.isFramePlaying)) fail("uiState.runtime.isFramePlaying must be boolean");
  if (!isBool(uiState.runtime.isCameraAuto)) fail("uiState.runtime.isCameraAuto must be boolean");

  if (!isObj(uiState.filters)) fail("uiState.filters must be an object");
  if (!isObj(uiState.filters.types)) fail("uiState.filters.types must be an object");
  if (!isBool(uiState.filters.types.points)) fail("uiState.filters.types.points must be boolean");
  if (!isBool(uiState.filters.types.lines)) fail("uiState.filters.types.lines must be boolean");
  if (!isBool(uiState.filters.types.aux)) fail("uiState.filters.types.aux must be boolean");

  // legacy keys は禁止（残ってたら落とす）
  const f = uiState.filters;
  const hasLegacy =
    (f && typeof f === "object" && (("points" in f) || ("lines" in f) || ("aux" in f)));
  if (hasLegacy) {
    throw new Error("contracts: legacy filters.(points|lines|aux) is not allowed; use filters.types.*");
  }

  if (!isObj(uiState.viewerSettings)) fail("uiState.viewerSettings must be an object");

  if (uiState.mode !== "macro" && uiState.mode !== "meso" && uiState.mode !== "micro") {
    fail("uiState.mode must be 'macro'|'meso'|'micro'");
  }

  if (uiState.selection != null) {
    if (!isObj(uiState.selection)) fail("uiState.selection must be object|null");
    if (!isStr(uiState.selection.uuid)) fail("uiState.selection.uuid must be string");
    if ("kind" in uiState.selection && uiState.selection.kind != null && !isKind(uiState.selection.kind)) {
      fail("uiState.selection.kind must be 'points'|'lines'|'aux'|null");
    }
  }

  if (uiState.microState != null) {
    if (!isObj(uiState.microState)) fail("uiState.microState must be object|null");
    const ms = uiState.microState;
    if (!(ms.focusUuid === null || isStr(ms.focusUuid))) fail("microState.focusUuid must be string|null");
    if (!isStrArray(ms.relatedUuids)) fail("microState.relatedUuids must be string[]");
    if ("focusPosition" in ms && ms.focusPosition !== undefined) {
      const p = ms.focusPosition;
      const ok = Array.isArray(p) && p.length === 3 && p.every(isNum);
      if (!ok) fail("microState.focusPosition must be [number,number,number] | undefined");
    }
  }

  if (uiState.visibleSet != null) {
    if (!isObj(uiState.visibleSet)) fail("uiState.visibleSet must be object|null");
    const vs = uiState.visibleSet;
    if (!isNum(vs.frame)) fail("visibleSet.frame must be a finite number");
    const isSetLike = (s) => isObj(s) && typeof s.has === "function" && typeof s.forEach === "function";
    if (!isSetLike(vs.points)) fail("visibleSet.points must be a Set-like");
    if (!isSetLike(vs.lines)) fail("visibleSet.lines must be a Set-like");
    if (!isSetLike(vs.aux)) fail("visibleSet.aux must be a Set-like");
  }

  return /** @type {UIState} */ (uiState);
}

/**
 * selection の外向き契約を固定（hub 外に出す形）
 * @param {SelectionState|null|undefined} sel
 * @returns {SelectionPublic|null}
 */
export function toPublicSelection(sel) {
  return sel && typeof sel.uuid === "string" ? { uuid: sel.uuid } : null;
}
