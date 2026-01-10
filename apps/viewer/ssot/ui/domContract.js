// viewer/ui/domContract.js
//
// SOURCE OF TRUTH: viewer_dom_contract.md (SSOT)
// This file is the executable mirror of that spec.

export const DOM_CONTRACT_VERSION = '2025-12-20';

/**
 * @typedef {Object} RoleSpec
 * @property {string} name
 * @property {string} preferred
 * @property {string|null} fallback
 * @property {string|null} tag
 */

/**
 * data-role 優先 / id fallback の「役割→DOM」対応表
 * - preferred: data-role selector
 * - fallback: id selector (null allowed)
 */
const ROLE_SPECS = /** @type {Record<string, RoleSpec>} */ ({
  // core
  viewerCanvas: { name: 'viewerCanvas', preferred: '[data-role="viewer-canvas"]', fallback: '#viewer-canvas', tag: 'CANVAS' },
  gizmoSlot: { name: 'gizmoSlot', preferred: '[data-role="gizmo-slot"]', fallback: '#gizmo-slot', tag: 'DIV' },
  gizmoModeLabel: { name: 'gizmoModeLabel', preferred: '[data-role="gizmo-mode-label"]', fallback: '#gizmo-mode-label', tag: null },
  worldAxesToggle: { name: 'worldAxesToggle', preferred: '[data-role="world-axes-toggle"]', fallback: '#world-axes-toggle', tag: 'BUTTON' },
  presetViewToggle: { name: 'presetViewToggle', preferred: '[data-role="gizmo-presets-toggle"]', fallback: '#gizmo-presets-toggle', tag: 'BUTTON' },

  // legacy alias (keep for back-compat with older UI code)
  gizmoPresetsToggle: { name: 'gizmoPresetsToggle', preferred: '[data-role="gizmo-presets-toggle"]', fallback: '#gizmo-presets-toggle', tag: 'BUTTON' },

  // auto orbit
  autoOrbitSlot: { name: 'autoOrbitSlot', preferred: '[data-role="auto-orbit-slot"]', fallback: '#auto-orbit-slot', tag: 'DIV' },
  autoOrbitToggle: { name: 'autoOrbitToggle', preferred: '[data-role="auto-orbit-toggle"]', fallback: '#auto-orbit-toggle', tag: 'BUTTON' },
  autoOrbitCW: { name: 'autoOrbitCW', preferred: '[data-role="auto-orbit-cw"]', fallback: '#auto-orbit-cw', tag: 'BUTTON' },
  autoOrbitCCW: { name: 'autoOrbitCCW', preferred: '[data-role="auto-orbit-ccw"]', fallback: '#auto-orbit-ccw', tag: 'BUTTON' },

  viewerHud: { name: 'viewerHud', preferred: '[data-role="viewer-hud"]', fallback: '#viewer-hud', tag: 'DIV' },

  // doc caption (optional)
  docCaptionTitle: { name: 'docCaptionTitle', preferred: '[data-role="doc-caption-title"]', fallback: '#doc-caption-title', tag: 'DIV' },
  docCaptionBody: { name: 'docCaptionBody', preferred: '[data-role="doc-caption-body"]', fallback: '#doc-caption-body', tag: 'DIV' },

  // filters (prod_full required)
  filterLines: { name: 'filterLines', preferred: '[data-role="filter-lines"]', fallback: '#filter-lines', tag: 'BUTTON' },
  filterPoints: { name: 'filterPoints', preferred: '[data-role="filter-points"]', fallback: '#filter-points', tag: 'BUTTON' },
  filterAux: { name: 'filterAux', preferred: '[data-role="filter-aux"]', fallback: '#filter-aux', tag: 'BUTTON' },

  // timeline controls (prod_full required)
  btnPlay: { name: 'btnPlay', preferred: '[data-role="btn-play"]', fallback: '#btn-play', tag: 'BUTTON' },
  btnRew: { name: 'btnRew', preferred: '[data-role="btn-rew"]', fallback: '#btn-rew', tag: 'BUTTON' },
  btnFf: { name: 'btnFf', preferred: '[data-role="btn-ff"]', fallback: '#btn-ff', tag: 'BUTTON' },
  btnStepBack: { name: 'btnStepBack', preferred: '[data-role="btn-step-back"]', fallback: '#btn-step-back', tag: 'BUTTON' },
  btnStepForward: { name: 'btnStepForward', preferred: '[data-role="btn-step-forward"]', fallback: '#btn-step-forward', tag: 'BUTTON' },

  frameSlider: { name: 'frameSlider', preferred: '[data-role="frame-slider"]', fallback: '#frame-slider', tag: 'INPUT' },
  frameLabelCurrent: { name: 'frameLabelCurrent', preferred: '[data-role="frame-label-current"]', fallback: '#frame-label-current', tag: null },
  frameLabelMin: { name: 'frameLabelMin', preferred: '[data-role="frame-label-min"]', fallback: '#frame-label-min', tag: null },
  frameLabelMax: { name: 'frameLabelMax', preferred: '[data-role="frame-label-max"]', fallback: '#frame-label-max', tag: null },
  frameLabelZero: { name: 'frameLabelZero', preferred: '[data-role="frame-label-zero"]', fallback: '#frame-label-zero', tag: null },
  frameZeroLine: { name: 'frameZeroLine', preferred: '[data-role="frame-zero-line"]', fallback: '#frame-zero-line', tag: null },

  // optional UI knobs (prod_full optional)
  vsLineWidthMode: { name: 'vsLineWidthMode', preferred: '[data-role="vs-line-width-mode"]', fallback: '#vs-line-width-mode', tag: 'SELECT' },
  vsMicroProfile: { name: 'vsMicroProfile', preferred: '[data-role="vs-micro-profile"]', fallback: '#vs-micro-profile', tag: 'SELECT' },
  vsPointSize: { name: 'vsPointSize', preferred: '[data-role="vs-point-size"]', fallback: '#vs-point-size', tag: 'INPUT' },
  vsPointAlpha: { name: 'vsPointAlpha', preferred: '[data-role="vs-point-alpha"]', fallback: '#vs-point-alpha', tag: 'INPUT' },

  // dev harness meta (devHarness_* required)
  metaFile: { name: 'metaFile', preferred: '[data-role="meta-file"]', fallback: '#meta-file', tag: null },
  metaModel: { name: 'metaModel', preferred: '[data-role="meta-model"]', fallback: '#meta-model', tag: null },
  metaModelLog: { name: 'metaModelLog', preferred: '[data-role="meta-model-log"]', fallback: '#meta-model-log', tag: null },
});

const STRICT_PROFILES = new Set(['prod_full', 'devHarness_full']);

const PROFILE_REQUIRED = /** @type {Record<string, string[]>} */ ({
  // production full UI
  prod_full: [
    'viewerCanvas',
    'gizmoSlot',
    'filterLines',
    'filterPoints',
    'filterAux',
    'btnPlay',
    'btnRew',
    'btnFf',
    'btnStepBack',
    'btnStepForward',
    'frameSlider',
    'frameLabelCurrent',
    'frameLabelMin',
    'frameLabelMax',
    'frameLabelZero',
    'frameZeroLine',
  ],

  // dev harness: full == prod_full + meta
  devHarness_full: [
    'viewerCanvas',
    'gizmoSlot',
    'filterLines',
    'filterPoints',
    'filterAux',
    'btnPlay',
    'btnRew',
    'btnFf',
    'btnStepBack',
    'btnStepForward',
    'frameSlider',
    'frameLabelCurrent',
    'frameLabelMin',
    'frameLabelMax',
    'frameLabelZero',
    'frameZeroLine',
    'metaFile',
    'metaModel',
    'metaModelLog',
  ],

  // dev harness: minimal boot
  devHarness_min: ['viewerCanvas', 'metaFile', 'metaModel', 'metaModelLog'],

  // dev harness: hub-only (no file picker)
  devHarness_hub: ['viewerCanvas', 'metaModel', 'metaModelLog'],
});

function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'string') return 'prod_full';
  return profile;
}

function queryFirst(doc, preferred, fallback) {
  const d = doc || document;
  try {
    const a = preferred ? d.querySelector(preferred) : null;
    if (a) return a;
  } catch (_e) {}
  try {
    const b = fallback ? d.querySelector(fallback) : null;
    if (b) return b;
  } catch (_e) {}
  return null;
}

function validateTag(el, expectedTag) {
  if (!el) return true;
  if (!expectedTag) return true;
  return String(el.tagName || '').toUpperCase() === expectedTag;
}

/**
 * Resolve an element by role name.
 * @param {string} roleName
 * @param {Document} [doc]
 */
export function getRoleEl(roleName, doc) {
  const spec = ROLE_SPECS[roleName];
  if (!spec) return null;
  const el = queryFirst(doc, spec.preferred, spec.fallback);
  return el || null;
}

/**
 * Validate the DOM contract for a given profile.
 * - Does not throw.
 * - `ok` is true when all required roles exist and have expected tag (when defined).
 *
 * @param {string} profile
 * @param {Document} [doc]
 */
export function validateDomContract(profile, doc) {
  const p = normalizeProfile(profile);
  const required = PROFILE_REQUIRED[p] || PROFILE_REQUIRED.prod_full;

  /** @type {string[]} */
  const missing = [];
  /** @type {Array<{role:string, expectedTag:string, actualTag:string}>} */
  const tagMismatches = [];

  for (const roleName of required) {
    const spec = ROLE_SPECS[roleName];
    const el = getRoleEl(roleName, doc);
    if (!el) {
      missing.push(roleName);
      continue;
    }
    if (spec?.tag && !validateTag(el, spec.tag)) {
      tagMismatches.push({
        role: roleName,
        expectedTag: spec.tag,
        actualTag: String(el.tagName || ''),
      });
    }
  }

  const ok = missing.length === 0 && tagMismatches.length === 0;

  return {
    ok,
    version: DOM_CONTRACT_VERSION,
    profile: p,
    missingRequiredRoles: missing,
    tagMismatches,
  };
}

/**
 * Assert DOM contract.
 * - For strict profiles (prod_full/devHarness_full), missing required roles throws.
 * - For non-strict profiles, it never throws and returns the report.
 *
 * @param {string} profile
 * @param {Document} [doc]
 */
export function assertDomContract(profile, doc) {
  const p = normalizeProfile(profile);
  const report = validateDomContract(p, doc);
  if (!report.ok && STRICT_PROFILES.has(p)) {
    const msg =
      `[domContract] missing required DOM roles (profile=${p}, version=${DOM_CONTRACT_VERSION})\n` +
      `missing: ${report.missingRequiredRoles.join(', ') || '(none)'}\n` +
      `tagMismatches: ${report.tagMismatches.length}`;
    const err = new Error(msg);
    // attach report for debugging
    err.report = report;
    throw err;
  }
  return report;
}
