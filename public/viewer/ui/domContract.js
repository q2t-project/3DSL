// public/viewer/ui/domContract.js
//
// DOM Contract (machine-readable)
// - UI はここに定義された selector(data-role) にのみ依存する
// - profile.requires が欠けた場合だけ strict profile は落とす
//
// NOTE:
// - gizmo の “個別ボタン role” は廃止（axis/view は row だけ）
// - row の中身（X/Y/Z, NE/NW/SW/SE）は JS が生成する

export const DOM_CONTRACT_VERSION = "2025-12-21";

// selector-only（data-role のみ）
function pickEl(doc, spec) {
  if (!doc || !spec?.selector) return null;
  try { return doc.querySelector(spec.selector); } catch (_e) { return null; }
}

function checkType(el, type) {
  if (!type) return true;
  const tag = String(type).toLowerCase();

  if (tag.includes(":")) {
    const [t, sub] = tag.split(":");
    if (!el || el.tagName.toLowerCase() !== t) return false;
    if (t === "input") return (el.getAttribute("type") || "").toLowerCase() === sub;
    return true;
  }

  return !!el && el.tagName.toLowerCase() === tag;
}

function checkAttrs(el, attrs) {
  if (!attrs) return true;
  for (const [k, v] of Object.entries(attrs)) {
    const cur = el.getAttribute(k);
    if (v == null) {
      if (cur == null) return false;
    } else {
      if (String(cur) !== String(v)) return false;
    }
  }
  return true;
}

// ------------------------------
// Contract definition
// ------------------------------
export const DOM_CONTRACT = Object.freeze({
  profiles: Object.freeze({
    prod_minimal: Object.freeze({
      requires: [
        "canvas",
        "gizmoSlot",
      ],
    }),

    // strict: 欠けたら落とす想定の「画面完成形」
    prod_full: Object.freeze({
      requires: [
        "canvas",
        "hudToast",
        "docCaptionTitle",
        "docCaptionBody",
        "gizmoSlot",

        // gizmo rows (JS generates buttons)
        "gizmoAxisRow",
        "gizmoViewRow",

        // gizmo HUD / toggles (gizmo.js reads via getEl)
        "gizmoPresetsToggle",
        "gizmoModeLabel",
        "worldAxesToggle",
        "autoOrbitToggle",
        "autoOrbitCW",
        "autoOrbitCCW",
 
        // filters
        "filterLines",
        "filterPoints",
        "filterAux",

        // frame
        "btnPlay",
        "btnRew",
        "btnFf",
        "btnStepBack",
        "btnStepForward",

        // timeline widgets (timeline.js reads via getEl)
        "frameBlock",
        "frameControls",
        "frameSliderWrapper",
        "frameSlider",
        "frameLabelMin",
        "frameLabelMax",
        "frameLabelCurrent",
        "frameLabelZero",
        "frameZeroLine",
       ],
     }),
 
    devHarness_full: Object.freeze({
      requires: [
        // prod_full 相当
        "canvas",
        "hudToast",
        "docCaptionTitle",
        "docCaptionBody",
        "gizmoSlot",
        "gizmoAxisRow",
        "gizmoViewRow",
        "gizmoPresetsToggle",
        "gizmoModeLabel",
        "worldAxesToggle",
        "autoOrbitToggle",
        "autoOrbitCW",
        "autoOrbitCCW",
        "filterLines",
        "filterPoints",
        "filterAux",
        "btnPlay",
        "btnRew",
        "btnFf",
        "btnStepBack",
        "btnStepForward",
        "frameBlock",
        "frameControls",
        "frameSliderWrapper",
        "frameSlider",
        "frameLabelMin",
        "frameLabelMax",
        "frameLabelCurrent",
        "frameLabelZero",
        "frameZeroLine",
 
        // dev harness extras
        "metaFile",
        "metaModel",
        "metaModelLog",

        // dev viewer settings
        "vsLineWidthMode",
        "vsMicroProfile",
      ],
    }),
  }),

  roles: Object.freeze({
    // ---- base
    canvas: Object.freeze({
      selector: `[data-role="viewer-canvas"]`,
      type: "canvas",
    }),

    // ---- HUD toast
    hudToast: Object.freeze({
      selector: `[data-role="viewer-hud"]`,
      type: "div",
    }),

    // ---- document caption
    docCaptionTitle: Object.freeze({
      selector: `[data-role="doc-caption-title"]`,
      type: "div",
    }),
    docCaptionBody: Object.freeze({
      selector: `[data-role="doc-caption-body"]`,
      type: "div",
    }),

    gizmoSlot: Object.freeze({
      selector: `[data-role="gizmo-slot"]`,
      type: "div",
    }),

    // ---- gizmo row containers (JS generates buttons inside)
    gizmoAxisRow: Object.freeze({
      selector: `[data-role="gizmo-axis-row"]`,
      type: "div",
    }),

    gizmoViewRow: Object.freeze({
      selector: `[data-role="gizmo-view-row"]`,
      type: "div",
    }),
 
    // ---- gizmo HUD / toggles (gizmo.js reads via getEl)
    gizmoPresetsToggle: Object.freeze({
      selector: `[data-role="gizmo-presets-toggle"]`,
      type: "button",
    }),
    gizmoModeLabel: Object.freeze({
      selector: `[data-role="gizmo-mode-label"]`,
      type: null,
    }),
    worldAxesToggle: Object.freeze({
      selector: `[data-role="world-axes-toggle"]`,
      type: "button",
      attrs: { "aria-pressed": null },
    }),

    autoOrbitToggle: Object.freeze({
      selector: `[data-role="auto-orbit-toggle"]`,
      type: "button",
    }),
    autoOrbitCW: Object.freeze({
      selector: `[data-role="auto-orbit-cw"]`,
      type: "button",
      attrs: { "data-dir": "cw" },
    }),
    autoOrbitCCW: Object.freeze({
      selector: `[data-role="auto-orbit-ccw"]`,
      type: "button",
      attrs: { "data-dir": "ccw" },
    }),

     // ---- filter controls
     filterLines: Object.freeze({
       selector: `[data-role="filter-lines"]`,
       type: "button",
     }),
     filterPoints: Object.freeze({
       selector: `[data-role="filter-points"]`,
       type: "button",
     }),
     filterAux: Object.freeze({
       selector: `[data-role="filter-aux"]`,
       type: "button",
     }),
 
     // ---- frame controls
     btnPlay: Object.freeze({
       selector: `[data-role="btn-play"]`,
       type: "button",
     }),
     btnRew: Object.freeze({
       selector: `[data-role="btn-rew"]`,
       type: "button",
     }),
     btnFf: Object.freeze({
       selector: `[data-role="btn-ff"]`,
       type: "button",
     }),
     btnStepBack: Object.freeze({
       selector: `[data-role="btn-step-back"]`,
       type: "button",
     }),
     btnStepForward: Object.freeze({
       selector: `[data-role="btn-step-forward"]`,
       type: "button",
     }),
 
    // ---- timeline widgets (timeline.js reads via getEl)
    frameBlock: Object.freeze({
      selector: `[data-role="frame-block"]`,
      type: "div",
    }),
    frameControls: Object.freeze({
      selector: `[data-role="frame-controls"]`,
      type: "div",
    }),
    frameSliderWrapper: Object.freeze({
      selector: `[data-role="frame-slider-wrapper"]`,
      type: "div",
    }),
     frameSlider: Object.freeze({
       selector: `[data-role="frame-slider"]`,
       type: "input:range",
     }),
     frameLabelMin: Object.freeze({
       selector: `[data-role="frame-label-min"]`,
       type: null,
     }),
     frameLabelMax: Object.freeze({
       selector: `[data-role="frame-label-max"]`,
       type: null,
     }),
     frameLabelCurrent: Object.freeze({
       selector: `[data-role="frame-label-current"]`,
       type: null,
     }),
    frameLabelZero: Object.freeze({
      selector: `[data-role="frame-label-zero"]`,
      type: null,
    }),
    frameZeroLine: Object.freeze({
      selector: `[data-role="frame-zero-line"]`,
      type: null,
    }),
 
    // ---- dev harness meta
    metaFile: Object.freeze({
      selector: `[data-role="meta-file"]`,
      type: null,
    }),
    metaModel: Object.freeze({
      selector: `[data-role="meta-model"]`,
      type: null,
    }),
    metaModelLog: Object.freeze({
      selector: `[data-role="meta-model-log"]`,
      type: null,
    }),

    // ---- viewer settings (optional / dev側に合わせて selector 調整)
    // NOTE: dev.astro 側の data-role 名に合わせること
    vsLineWidthMode: Object.freeze({
      selector: `[data-role="vs-line-width-mode"]`,
      type: "select",
    }),
    vsMicroProfile: Object.freeze({
      selector: `[data-role="vs-micro-profile"]`,
      type: "select",
    }),
  }),
});

// ------------------------------
// Role resolver (public)
// ------------------------------
export function getRoleSpec(roleName) {
  return DOM_CONTRACT.roles[roleName] || null;
}

export function getRoleEl(roleName, doc = document) {
  const spec = getRoleSpec(roleName);
  if (!spec) return null;
  return pickEl(doc, spec);
}

// ------------------------------
// Validation helper
// ------------------------------
export function validateDomContract(profile, doc = document) {
  const p = DOM_CONTRACT.profiles[profile] || DOM_CONTRACT.profiles.prod_minimal;

  const missing = [];
  const wrongType = [];
  const wrongAttrs = [];

  const check = (roleName, isRequired) => {
    const spec = DOM_CONTRACT.roles[roleName];
    if (!spec) {
      if (isRequired) missing.push({ role: roleName, reason: "role-not-defined" });
      return;
    }

    const el = pickEl(doc, spec);
    if (!el) {
      if (isRequired) missing.push({ role: roleName, selector: spec.selector });
      return;
    }

    if (!checkType(el, spec.type)) {
      wrongType.push({
        role: roleName,
        expected: spec.type,
        actual:
          el.tagName.toLowerCase() +
          (el.tagName.toLowerCase() === "input"
            ? ":" + (el.getAttribute("type") || "")
            : ""),
      });
    }
    if (!checkAttrs(el, spec.attrs)) {
      wrongAttrs.push({ role: roleName, expected: spec.attrs });
    }
  };

  for (const r of p.requires) check(r, true);

  return {
    ok: missing.length === 0 && wrongType.length === 0 && wrongAttrs.length === 0,
    profile,
    missing,
    wrongType,
    wrongAttrs,
  };
}

export function assertDomContract(profile, doc = document) {
  const report = validateDomContract(profile, doc);
  const mustStrict = (profile === "prod_full" || profile === "devHarness_full");

  if (!report.ok) {
    if (mustStrict) throw new Error(`[ui][dom-contract] invalid DOM for ${profile}`);
    console.warn("[ui][dom-contract]", report);
  }
  return report;
}

export function resolveRole(roleName, doc = document) {
  const spec = DOM_CONTRACT.roles[roleName];
  if (!spec) return null;
  return pickEl(doc, spec);
}

export function resolveProfileDom(profile, doc = document) {
  const p = DOM_CONTRACT.profiles[profile] || DOM_CONTRACT.profiles.prod_minimal;
  const out = {};
  for (const r of p.requires) out[r] = resolveRole(r, doc);
  return out;
}
