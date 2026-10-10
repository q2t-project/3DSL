// modeler/runtime/core/coreControllers.js
// Core layer: canonical state + edit rules + quickcheck + strict schema validator.
//
// IMPORTANT:
// - Do not touch DOM here (no window/document).
// - UI must not mutate this directly; via hub facade only.
import { createJournalEntry } from './workJournal.js';

// NOTE: Ajv browser import compatibility
//
// /vendor/ajv/dist/ajv.js may be CommonJS or have a different export shape
// depending on how vendor sync/bundling was done. A static named import would
// break the whole runtime at parse time, so we load it dynamically.
let Ajv = globalThis?.Ajv;
let AjvAddFormats = null;
if (!Ajv) {
  // IMPORTANT (policy alignment with viewer):
  // - Prefer a single canonical vendor location: /vendor/ajv/dist/ajv.js
  // - If it is missing (e.g. modeler-only deploy without vendor sync), we *must not*
  //   crash the runtime. We will run in "no validation" mode with a warning.
  try {
    const mod = await import("/vendor/ajv/dist/ajv.js");
    Ajv = mod?.default ?? mod?.Ajv ?? mod;
    AjvAddFormats = mod?.addFormats ?? mod?.default?.addFormats ?? null;
  } catch {
    Ajv = null;
  }
}

// strict validator helpers (copied/simplified from viewer runtime)
// ------------------------------------------------------------
function parseSemverMajor(v) {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

function normalizeSchemaBase(uri) {
  if (typeof uri !== "string") return null;
  const s = uri.trim();
  if (!s) return null;
  const base = s.split("#")[0];
  return base || null;
}

function extractVersionFromFragment(uri) {
  if (typeof uri !== "string") return { version: null, major: null };
  const i = uri.indexOf("#v");
  if (i < 0) return { version: null, major: null };
  const version = uri.slice(i + 2);
  return { version, major: parseSemverMajor(version) };
}

function extractVersionFromAnchor(anchor) {
  if (typeof anchor !== "string") return null;
  const a = anchor.trim();
  const m = a.match(/^v?(\d+\.\d+\.\d+)$/);
  return m ? m[1] : null;
}

function extractSchemaInfo(schemaJson) {
  const $id = schemaJson?.$id || "";
  const baseUri = normalizeSchemaBase($id);

  let version = extractVersionFromFragment($id).version;
  if (!version) version = extractVersionFromAnchor(schemaJson?.$anchor);

  const major = parseSemverMajor(version);
  return { $id: $id || null, baseUri, version: version || null, major };
}

function checkVersionAndSchemaUri(doc, schemaInfo) {
  const errors = [];
  const dm = doc && doc.document_meta;
  if (!dm) {
    errors.push({
      instancePath: "",
      keyword: "required",
      message: "document_meta is required"
    });
    return { ok: false, errors };
  }

  if (schemaInfo?.baseUri) {
    const gotBase = normalizeSchemaBase(dm.schema_uri || "");
    const uriV = extractVersionFromFragment(dm.schema_uri || "");

    if (gotBase && gotBase !== schemaInfo.baseUri) {
      errors.push({
        instancePath: "/document_meta/schema_uri",
        keyword: "schema_uri",
        message: `schema_uri base mismatch: expected '${schemaInfo.baseUri}', got '${gotBase}'`
      });
    }
    if (schemaInfo.major != null) {
      if (!uriV.version) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: "schema_uri must include '#v<major.minor.patch>' (e.g. ...#v1.0.2)"
        });
      } else if (uriV.major == null) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: `invalid schema_uri version '${uriV.version}'`
        });
      } else if (uriV.major !== schemaInfo.major) {
        errors.push({
          instancePath: "/document_meta/schema_uri",
          keyword: "schema_uri",
          message: `schema_uri major mismatch: expected ${schemaInfo.major}, got ${uriV.major}`
        });
      }
    }
  }

  if (schemaInfo?.major != null) {
    if (typeof dm.version !== "string") {
      errors.push({
        instancePath: "/document_meta/version",
        keyword: "type",
        message: "document_meta.version must be a string"
      });
    } else {
      const docMajor = parseSemverMajor(dm.version);
      if (docMajor == null) {
        errors.push({
          instancePath: "/document_meta/version",
          keyword: "format",
          message: `invalid semver version '${dm.version}'`
        });
      } else if (docMajor !== schemaInfo.major) {
        errors.push({
          instancePath: "/document_meta/version",
          keyword: "version",
          message: `major version mismatch: expected ${schemaInfo.major}, got ${docMajor}`
        });
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function safePos(node) {
  const p = node?.appearance?.position || node?.position;
  if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  return [0, 0, 0];
}

function uuidOf(node) {
  return node?.meta?.uuid || node?.uuid || null;
}

function normalizeEndpoint(value) {
  return typeof value === "string" ? { ref: value } : value;
}

function sameEndpoint(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a).sort();
  return JSON.stringify(keys) === JSON.stringify(Object.keys(b).sort()) &&
    keys.every((key) => JSON.stringify(a[key]) === JSON.stringify(b[key]));
}

function endpointConflicts(doc) {
  const issues = [];
  for (const [index, line] of (Array.isArray(doc?.lines) ? doc.lines : []).entries()) {
    for (const key of ["end_a", "end_b"]) {
      if (!line || !Object.prototype.hasOwnProperty.call(line, key) ||
          !line.appearance || !Object.prototype.hasOwnProperty.call(line.appearance, key)) continue;
      if (sameEndpoint(normalizeEndpoint(line[key]), normalizeEndpoint(line.appearance[key]))) continue;
      issues.push({
        instancePath: `/lines/${index}/appearance/${key}`,
        keyword: "endpoint_conflict", uuid: uuidOf(line),
        expected: "one unambiguous endpoint", actual: { canonical: line.appearance[key], legacy: line[key] },
        message: `Conflicting appearance.${key} and legacy ${key}; resolve explicitly before saving`,
      });
    }
  }
  return issues;
}

// Identity and reference integrity are strict output requirements beyond JSON Schema.
function structuralErrors(doc) {
  const errors = [];
  const seen = new Set();
  const pointIds = new Set((Array.isArray(doc?.points) ? doc.points : []).map(uuidOf).filter(Boolean));
  for (const kind of ["points", "lines", "aux"]) {
    const nodes = Array.isArray(doc?.[kind]) ? doc[kind] : [];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const uuid = uuidOf(node);
      if (uuid && seen.has(uuid)) errors.push({ instancePath: `/${kind}/${index}/meta/uuid`, keyword: "duplicate_uuid", uuid, expected: "unique uuid", actual: uuid, message: "Duplicate uuid; assign a distinct ID before saving" });
      if (uuid) seen.add(uuid);
      if (kind !== "lines") continue;
      for (const end of ["end_a", "end_b"]) {
        const endpoint = node?.appearance?.[end] ?? node?.[end];
        if (typeof endpoint?.ref === "string" && !pointIds.has(endpoint.ref)) errors.push({ instancePath: `/lines/${index}/appearance/${end}/ref`, keyword: "unresolved_ref", uuid, expected: "existing point uuid", actual: endpoint.ref, message: "Endpoint ref does not resolve to a point" });
      }
    }
  }
  return errors;
}

// Normalize older/loose docs into current schema expectations (best-effort).
function normalizeDocInPlace(doc) {
  if (!doc || typeof doc !== "object") return;

  // ---- Lines (migrate legacy signification fields + endpoints) ----
  if (Array.isArray(doc.lines)) {
    for (const l of doc.lines) {
      if (!l || typeof l !== "object") continue;
      // Canonical endpoints live in appearance and may be ref OR coord.
      // Migrate only unambiguous legacy values. Conflicting values stay visible
      // in the editing document and are rejected by the strict exit gate.
      for (const key of ["end_a", "end_b"]) {
        const hasLegacy = Object.prototype.hasOwnProperty.call(l, key);
        const hasCanonical = l.appearance && Object.prototype.hasOwnProperty.call(l.appearance, key);
        if (hasCanonical) l.appearance[key] = normalizeEndpoint(l.appearance[key]);
        if (!hasLegacy) continue;
        const legacy = normalizeEndpoint(l[key]);
        if (!hasCanonical) {
          l.appearance = l.appearance && typeof l.appearance === "object" ? l.appearance : {};
          l.appearance[key] = legacy;
          delete l[key];
        } else if (sameEndpoint(l.appearance[key], legacy)) {
          delete l[key];
        } else {
          l[key] = legacy;
        }
      }

      // signification: current schema uses signification.caption (localized_string)
      const sig = l.signification;
      if (sig && typeof sig === "object") {
        // legacy: signification.name -> signification.caption
        if (sig.caption == null && typeof sig.name === "string") {
          sig.caption = sig.name;
        }

        // Legacy default text is migrated only when no canonical locale exists.
        // Retain valid empty locale strings and invalid values for diagnostics.
        if (sig.caption && typeof sig.caption === "object") {
          const cap = sig.caption;
          if (!("ja" in cap) && !("en" in cap) && typeof cap.default === "string") {
            sig.caption = cap.default;
          }
        }

        // schema does not allow "name" in line.signification
        if ("name" in sig) delete sig.name;
      } else if (typeof sig === "string") {
        l.signification = { caption: sig };
      }
    }
  }

  // ---- Aux (migrate legacy module field + ensure appearance) ----
  if (Array.isArray(doc.aux)) {
    for (const a of doc.aux) {
      if (!a || typeof a !== "object") continue;

      // aux schema has no signification
      if (a.signification) delete a.signification;

      // legacy: top-level module (string or object)
      let legacyModuleKey = null;
      if (typeof a.module === "string") legacyModuleKey = a.module;
      else if (a.module && typeof a.module === "object") {
        const k = Object.keys(a.module)[0];
        if (k) legacyModuleKey = k;
      }
      if ("module" in a) delete a.module;

      if (!a.appearance || typeof a.appearance !== "object") a.appearance = {};
      const ap = a.appearance;

      if (!Array.isArray(ap.position) || ap.position.length < 3) ap.position = [0, 0, 0];
      if (!Array.isArray(ap.orientation) || ap.orientation.length < 3) ap.orientation = [0, 0, 0];
      if (typeof ap.opacity !== "number") ap.opacity = 0.4;
      if (typeof ap.visible !== "boolean") ap.visible = true;

      // legacy: appearance.module as string
      if (typeof ap.module === "string") ap.module = { [ap.module]: {} };

      // Preserve declared module fields. The current schema permits several
      // module keys; normalization must not silently choose one of them.
      if (ap.module == null && legacyModuleKey) ap.module = { [legacyModuleKey]: {} };
    }
  }
}
// Tolerant import removes only keys unknown to every declared alternative.
// This is deliberately NOT validation: ambiguous/invalid branch values survive
// for strict diagnostics. Conditional subschemas are not closed owner schemas.
function pruneUnknownFields(value, schemas, root) {
  const expanded = [];
  const seen = new Set();
  function visit(schema) {
    if (!schema || typeof schema !== "object" || seen.has(schema)) return;
    seen.add(schema);
    if (typeof schema.$ref === "string" && schema.$ref.startsWith("#/")) {
      let target = root;
      for (const part of schema.$ref.slice(2).split("/")) target = target?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
      visit(target);
    }
    expanded.push(schema);
    for (const keyword of ["allOf", "anyOf", "oneOf"]) for (const branch of schema[keyword] || []) visit(branch);
    // then/else may declare fields but if only tests them; none are executed.
    visit(schema.then); visit(schema.else);
  }
  schemas.forEach(visit);
  if (Array.isArray(value)) {
    const items = expanded.flatMap((schema) => schema.items && !Array.isArray(schema.items) ? [schema.items] : []);
    if (items.length) for (const item of value) pruneUnknownFields(item, items, root);
    return;
  }
  if (!value || typeof value !== "object") return;
  const properties = new Map();
  for (const schema of expanded) for (const [key, sub] of Object.entries(schema.properties || {})) {
    if (!properties.has(key)) properties.set(key, []);
    properties.get(key).push(sub);
  }
  const additional = expanded.map((schema) => schema.additionalProperties).filter((schema) => schema && typeof schema === "object");
  const closed = expanded.some((schema) => schema.additionalProperties === false);
  for (const key of Object.keys(value)) {
    if (properties.has(key)) pruneUnknownFields(value[key], properties.get(key), root);
    else if (additional.length) pruneUnknownFields(value[key], additional, root);
    else if (closed) delete value[key];
  }
}

// Import extras helpers (collect unknown fields stripped during prune)
function jsonPtrEscape(s) {
  return String(s).replace(/~/g, "~0").replace(/\//g, "~1");
}

function summarizeValue(v, maxLen = 2000) {
  // Keep small primitives/objects as-is; cap large objects to avoid memory blowups.
  if (v == null) return v;
  const t = typeof v;
  if (t === "string") {
    if (v.length <= maxLen) return v;
    return { __truncated: true, type: "string", length: v.length, prefix: v.slice(0, maxLen) };
  }
  if (t === "number" || t === "boolean") return v;
  try {
    const s = JSON.stringify(v);
    if (typeof s === "string" && s.length <= maxLen) return v;
    return { __truncated: true, type: Array.isArray(v) ? "array" : "object", length: (s && s.length) || null, prefix: (s || "").slice(0, maxLen) };
  } catch {
    return { __truncated: true, type: Array.isArray(v) ? "array" : "object", note: "unserializable" };
  }
}

function collectRemovedExtras(original, pruned, path, out, limit, stats) {
  if (!stats) stats = { total: 0 };
  if (!out) return stats;

  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

  if (isObj(original) && isObj(pruned)) {
    for (const k of Object.keys(original)) {
      const nextPath = `${path}/${jsonPtrEscape(k)}`;
      if (!Object.prototype.hasOwnProperty.call(pruned, k)) {
        stats.total += 1;
        if (out.length < limit) out.push({ path: nextPath || "/", value: summarizeValue(original[k]) });
      } else {
        collectRemovedExtras(original[k], pruned[k], nextPath, out, limit, stats);
      }
    }
    return stats;
  }

  if (Array.isArray(original) && Array.isArray(pruned)) {
    const n = Math.min(original.length, pruned.length);
    for (let i = 0; i < n; i++) {
      collectRemovedExtras(original[i], pruned[i], `${path}/${i}`, out, limit, stats);
    }
    // If elements were dropped (rare), record them.
    if (original.length > pruned.length) {
      for (let i = pruned.length; i < original.length; i++) {
        stats.total += 1;
        if (out.length < limit) out.push({ path: `${path}/${i}`, value: summarizeValue(original[i]) });
      }
    }
    return stats;
  }

  return stats;
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

export function createCoreControllers(emitter) {
  let document3dss = null;
  // The recognized work contract and scene are one transaction/history unit.
  let workContext = null;
  // Append-only for this editing session. Undo restores content, never lineage.
  // This is a local authoring record, not a tamper-proof fact verification log.
  let workJournal = [];
  let documentEpoch = 0;
  let docLabel = "(no file)";
  // Save destination SSOT.
  // - null => no destination (Save behaves like Save As)
  // - string => current destination label (filename / handle label)
  let saveLabel = null;
  let saveHandle = null;
  let isDirty = false;
  // History SSOT (for undo/redo + clean/dirty computation)
  const cloneDoc = (v) => {
    try {
      if (typeof structuredClone === "function") return structuredClone(v);
    } catch {}
    return JSON.parse(JSON.stringify(v));
  };
  const contentContext = (context) => {
    const next = cloneDoc(context);
    if (next) delete next.journal;
    return next;
  };
  const captureState = () => ({ scene: cloneDoc(document3dss), workContext: contentContext(workContext) });
  const exportedContext = () => workContext ? { ...cloneDoc(workContext), journal: cloneDoc(workJournal) } : null;
  const exportedState = () => ({ scene: cloneDoc(document3dss), workContext: exportedContext() });
  const stateText = () => JSON.stringify({ scene: document3dss, workContext: exportedContext() });
  const restoreState = (snapshot) => {
    document3dss = cloneDoc(snapshot.scene);
    workContext = contentContext(snapshot.workContext);
  };
  const appendJournal = (entry) => {
    if (entry) { workJournal.push(entry); emitter.emit('work-journal', cloneDoc(entry)); }
  };
  let history = [];
  let historyIndex = -1; // points to current snapshot
  let savedDocumentText = null; // contents at last successful Save/Save As; survives history branching
  const APP_TITLE = "3DSD Modeler";

  // ---- strict validator (schema-based; Export/Save are strict) ----
  let schemaInfo = { $id: null, baseUri: null, version: null, major: null };
  let ajv = null;
  let validateFn = null;
  let lastStrictErrors = null;
  let validatorInitPromise = null;
  let schemaJsonCache = null;
  let workValidateFn = null;
  let workValidatorPromise = null;
  let workValidationErrors = null;

  async function ensureWorkValidatorInitialized() {
    if (workValidateFn) return;
    if (!workValidatorPromise) workValidatorPromise = (async () => {
      await ensureValidatorInitialized();
      if (!ajv) throw new Error('作品の形式検査を初期化できません。');
      const response = await fetch('/schemas/3DSL.contract-work.schema.json');
      if (!response.ok) throw new Error('作品の形式定義を読み込めません。');
      workValidateFn = ajv.compile(await response.json());
    })().catch(error => { workValidatorPromise = null; throw error; });
    return workValidatorPromise;
  }

  function validateWorkShape(work) {
    if (!workValidateFn) {
      workValidationErrors = [{instancePath:'/',message:'作品の形式検査が準備できていません。'}];
      return false;
    }
    const valid = workValidateFn(work);
    workValidationErrors = workValidateFn.errors || [];
    return valid;
  }

  // Import extras: unknown fields stripped during importNormalize()
  let importExtras = null;

  function isValidatorReady() {
    return !!validateFn;
  }

  function ensureValidatorInitialized(schemaUrl = "/schemas/3DSS.schema.json") {
    if (validateFn) return;
    if (!validatorInitPromise) {
      validatorInitPromise = fetch(schemaUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`validator.init: failed to load schema JSON (${schemaUrl} ${res.status})`);
          }
          return res.json();
        })
        .then((schemaJson) => {
          schemaJsonCache = schemaJson;
          // Always extract schema info so we can at least verify version/schema_uri,
          // even when Ajv isn't available (standalone hosting, vendor missing, etc.).
          schemaInfo = extractSchemaInfo(schemaJson);

          if (!Ajv) {
            // No Ajv -> validation is disabled. Keep runtime usable and let UI show warnings.
            // Import remains usable; strict Save/Export must wait for a validator.
            console.warn("Ajv is unavailable; skipping JSON Schema validation.");
            ajv = null;
            validateFn = null;
            lastStrictErrors = null;
            return;
          }

          ajv = new Ajv({
            allErrors: true,
            strict: true,
            strictSchema: false,
            strictTypes: true,
            strictRequired: false,
            validateSchema: false,
            removeAdditional: false,
            useDefaults: false,
            coerceTypes: false,
          });

          // Optional: enable JSON Schema "format" when available (ajv-formats).
          if (typeof AjvAddFormats === "function") {
            try { AjvAddFormats(ajv); } catch {}
          }
          validateFn = ajv.compile(schemaJson);

          lastStrictErrors = null;
        });
    }
    return validatorInitPromise;
  }

  function validateStrict(doc) {
    lastStrictErrors = null;
    const ver = checkVersionAndSchemaUri(doc, schemaInfo);

    if (!validateFn) {
      lastStrictErrors = [{ instancePath: "", keyword: "validator_unavailable", message: "Strict validation is unavailable" }, ...ver.errors];
      return false;
    }

    const conflicts = [...endpointConflicts(doc), ...structuralErrors(doc)];
    const ok = validateFn(doc);
    const ajvErrors = validateFn.errors || [];
    if (!ok || !ver.ok || conflicts.length) {
      lastStrictErrors = [...ajvErrors, ...ver.errors, ...conflicts];
      return false;
    }
    return true;
  }

  function getStrictErrors() {
    return lastStrictErrors;
  }

  function getSchemaInfo() {
    return { ...schemaInfo };
  }


function getImportExtras() {
  return importExtras ? cloneDoc(importExtras) : null;
}

function clearImportExtras() {
  importExtras = null;
  emitter.emit("extras", importExtras);
}

function ensureDocBase(doc) {
  if (!doc || typeof doc !== "object") doc = {};
  if (!doc.document_meta || typeof doc.document_meta !== "object") doc.document_meta = {};
  // Legacy tolerance: some exports used object-maps for points/lines (uuid -> object).
  if (doc.points && typeof doc.points === "object" && !Array.isArray(doc.points)) doc.points = Object.values(doc.points);
  if (doc.lines && typeof doc.lines === "object" && !Array.isArray(doc.lines)) doc.lines = Object.values(doc.lines);
  if (doc.aux && typeof doc.aux === "object" && !Array.isArray(doc.aux)) doc.aux = Object.values(doc.aux);
  if (!Array.isArray(doc.points)) doc.points = [];
  if (!Array.isArray(doc.lines)) doc.lines = [];
  if (!Array.isArray(doc.aux)) doc.aux = [];
  return doc;
}

async function importNormalize(raw) {
  // raw -> { strictDoc, extras }
  // - strictDoc: pruned + normalized + base-invariants ensured
  // - extras: unknown fields stripped during pruning
  const limit = 500;
  const removed = [];

  // NOTE: core is DOM-free; schema is loaded via fetch in ensureValidatorInitialized.
  try { await ensureValidatorInitialized(); } catch {}

  let candidate = (raw && typeof raw === "object") ? cloneDoc(raw) : {};

  // Migrate legacy values before looking for unknown fields. Pruning uses
  // property declarations, never a mutating AJV traversal of oneOf/allOf.
  try { normalizeDocInPlace(candidate); } catch {}
  const normalized = cloneDoc(candidate);
  if (schemaJsonCache) pruneUnknownFields(candidate, [schemaJsonCache], schemaJsonCache);

  // Compute extras (unknown fields removed by pruning)
  let stats = { total: 0 };
  try {
    if (normalized && typeof normalized === "object" && candidate && typeof candidate === "object") {
      stats = collectRemovedExtras(normalized, candidate, "", removed, limit, stats);
    }
  } catch {}

  // Normalize + base invariants
  try { normalizeDocInPlace(candidate); } catch {}
  candidate = ensureDocBase(candidate);

  const extras = (stats.total > 0 || removed.length > 0) ? {
    kind: "import_extras/v1",
    removed,
    removedCount: stats.total,
    truncated: removed.length < stats.total,
  } : null;

  return { strictDoc: candidate, extras };
}

  function baseLabel() {
    if (!document3dss) return "(no file)";
    // Prefer the current save destination label when available.
    const s = typeof saveLabel === "string" ? saveLabel.trim() : "";
    if (s) return s;
    const t = typeof docLabel === "string" ? docLabel.trim() : "";
    if (!t || t === "(no file)") return "(unsaved)";
    return t;
  }

  function displayLabel() {
    const base = baseLabel();
    if (!document3dss) return base;
    if (!isDirty) return base;
    if (base === "(unsaved)") return base;
    return `${base} (unsaved)`;
  }

  function windowTitle() {
    const d = displayLabel();
    if (!document3dss) return APP_TITLE;
    return `${APP_TITLE} — ${d}`;
  }

  function emitTitle() {
    emitter.emit("title", { label: displayLabel(), windowTitle: windowTitle(), dirty: isDirty });
  }

  function setDirty(next) {
    const v = !!next;
    if (isDirty === v) return;
    isDirty = v;
    emitter.emit("dirty", isDirty);
    emitTitle();
  }

  function markClean() {
    // Save/Save As succeeded => current snapshot becomes the clean baseline.
    savedDocumentText = stateText();
    setDirty(false);
  }

  function markDirty() {
    // Force dirty even if user returns to previously saved snapshot.
    if (savedDocumentText === stateText()) savedDocumentText = null;
    setDirty(true);
  }

  function setLabel(label) {
    if (typeof label !== "string") return;
    const t = label.trim();
    if (!t) return;
    docLabel = t;
    emitTitle();
  }

  function getSaveLabel() {
    return typeof saveLabel === "string" ? saveLabel : null;
  }

  function setSaveLabel(label) {
    if (typeof label !== "string") return;
    const t = label.trim();
    if (!t) return;
    saveLabel = t;
    emitTitle();
  }

  function clearSaveLabel() {
    if (saveLabel === null) return;
    saveLabel = null;
    emitTitle();
  }

  function getSaveHandle() {
    return saveHandle || null;
  }

  function setSaveHandle(handle, label) {
    // handle is a FileSystemFileHandle (or compatible object). Keep it opaque to core.
    if (!handle) return;
    saveHandle = handle;
    if (typeof label === "string") {
      const t = label.trim();
      if (t) saveLabel = t;
    }
    emitTitle();
  }

  function clearSaveHandle() {
    if (!saveHandle) return;
    saveHandle = null;
    emitTitle();
  }

  let selection = [];
  const locked = new Set();
  // UI-only visibility state (does not affect document/dirty)
  const hidden = new Set();
  let soloUuid = null;

  // UI-only outliner grouping state (does not affect document/dirty)
  // groups: {id, name, parentId}
  /** @type {Map<string, {id:string, name:string, parentId: (string|null)}>} */
  const groups = new Map();
  /** @type {Map<string, string>} */
  const itemToGroup = new Map();
  /** @type {Set<string>} */
  const collapsedGroups = new Set();
  let groupSeq = 1;
  let uiState = {
    activeTab: "points",
    activeTool: "select",
    frameIndex: 0,
    // UI-only playback state (does not affect export/dirty)
    framePlaying: false,
    frameFps: 24,
    // Viewer-aligned world axis mode
    worldAxisMode: "fixed", // "off" | "fixed" | "full_view"
    // Orbit controls (UI-only)
    // Preview-out chrome
    focusMode: false,
    previewOutMirror: false,
  };

  function emitVisibility() {
    emitter.emit("visibility", { hidden: [...hidden], solo: soloUuid });
  }

  function resetVisibilityState() {
    hidden.clear();
    soloUuid = null;
    emitVisibility();
  }

  function toggleHidden(uuid) {
    if (!uuid) return;
    const u = String(uuid);
    if (hidden.has(u)) hidden.delete(u);
    else hidden.add(u);
    emitVisibility();
  }

  function isHidden(uuid) {
    if (!uuid) return false;
    return hidden.has(String(uuid));
  }

  function listHidden() {
    return [...hidden];
  }

  function setSolo(uuid) {
    const u = uuid ? String(uuid) : "";
    soloUuid = u || null;
    emitVisibility();
  }

  function clearSolo() {
    if (soloUuid === null) return;
    soloUuid = null;
    emitVisibility();
  }

  function getSolo() {
    return soloUuid;
  }

  function emitOutliner() {
    const payload = {
      groups: [...groups.values()],
      itemToGroup: Object.fromEntries(itemToGroup.entries()),
      collapsed: [...collapsedGroups],
    };
    emitter.emit("outliner", payload);
  }

  function resetOutlinerState() {
    groups.clear();
    itemToGroup.clear();
    collapsedGroups.clear();
    groupSeq = 1;
    emitOutliner();
  }

  function createGroup(name = "Group", parentId = null) {
    const id = `g${groupSeq++}`;
    const safeName = String(name ?? "Group").trim() || "Group";
    const pid = parentId ? String(parentId) : null;
    groups.set(id, { id, name: safeName, parentId: pid });
    emitOutliner();
    return id;
  }

  function renameGroup(id, name) {
    const gid = id ? String(id) : "";
    if (!gid || !groups.has(gid)) return;
    const safeName = String(name ?? "").trim() || "Group";
    const g = groups.get(gid);
    groups.set(gid, { ...g, name: safeName });
    emitOutliner();
  }

  function toggleGroupCollapsed(id) {
    const gid = id ? String(id) : "";
    if (!gid) return;
    if (collapsedGroups.has(gid)) collapsedGroups.delete(gid);
    else collapsedGroups.add(gid);
    emitOutliner();
  }

  function assignItemsToGroup(uuids, groupId) {
    const gid = groupId ? String(groupId) : "";
    if (!gid || !groups.has(gid)) return;
    const list = Array.isArray(uuids) ? uuids.filter(Boolean).map(String) : [];
    for (const u of list) itemToGroup.set(u, gid);
    emitOutliner();
  }

  function ungroupItems(uuids) {
    const list = Array.isArray(uuids) ? uuids.filter(Boolean).map(String) : [];
    for (const u of list) itemToGroup.delete(u);
    emitOutliner();
  }

  function getOutlinerState() {
    return {
      groups: [...groups.values()],
      itemToGroup: Object.fromEntries(itemToGroup.entries()),
      collapsed: [...collapsedGroups],
    };
  }

  function setDocument(doc, meta = {}) {
    documentEpoch += 1;
    const hadPrev = !!document3dss;

    // Import extras are UI-visible via QuickCheck only (not exported).
    if (meta && Object.prototype.hasOwnProperty.call(meta, "extras")) {
      importExtras = meta.extras || null;
    } else {
      importExtras = null;
    }
    emitter.emit("extras", importExtras);
    workJournal = cloneDoc(meta.workContext?.journal || []);
    workContext = meta.workContext ? contentContext(meta.workContext) : null;
    // Contract parsing already validated the untouched scene. Legacy normalize
    // is intentionally bypassed so a draft is never silently pruned/coerced.
    if (!workContext) normalizeDocInPlace(doc);
    document3dss = cloneDoc(doc);
    if (meta && typeof meta.label === "string") docLabel = meta.label;

    // Save destination policy:
// - meta.saveLabel explicitly sets the current destination label.
// - meta.saveHandle explicitly sets the current save handle (and optionally label).
// - Open/load from file/url: default destination is meta.label (and meta.saveHandle when provided).
// - New: clear destination.
// - Otherwise: keep the previous destination.
    if (meta && typeof meta.saveLabel === "string") {
      saveLabel = meta.saveLabel.trim() || null;
    }
    if (meta && meta.saveHandle) {
      saveHandle = meta.saveHandle;
      if (typeof meta.label === "string") {
        const t = meta.label.trim();
        if (t) saveLabel = t;
      }
    } else if (meta && (meta.intent === "open" || meta.intent === "load" || meta.source === "file" || meta.source === "url")) {
      const candidate = typeof meta.label === "string" ? meta.label.trim() : "";
      saveLabel = candidate || null;
      // A newly opened file/url must never inherit the previous document's destination.
      saveHandle = null;
    } else if (meta && meta.intent === "new") {
      saveLabel = null;
      saveHandle = null;
    }
    // Dirty-state policy:
    // - Any explicit meta.dirty wins.
    // - New or edit intent => dirty.
    // - Open/load from file/url => clean.
    // - Otherwise, replacing an existing doc is treated as an edit => dirty.
    let reqDirty = false;
    if (meta && typeof meta.dirty === "boolean") reqDirty = meta.dirty;
    else if (meta && (meta.intent === "edit" || meta.source === "edit")) reqDirty = true;
    else if (meta && meta.intent === "new") reqDirty = true;
    else if (meta && (meta.intent === "open" || meta.intent === "load" || meta.source === "file" || meta.source === "url")) reqDirty = false;
    else if (hadPrev) reqDirty = true;
    setDirty(reqDirty);

    // Reset history to the loaded/created document.
    if (document3dss && typeof document3dss === "object") {
      history = [captureState()];
      historyIndex = 0;
      savedDocumentText = reqDirty ? null : stateText();
    } else {
      history = [];
      historyIndex = -1;
      savedDocumentText = null;
    }

    // Reset any in-flight history grouping on document replace.
    historyGroupDepth = 0;
    historyGroupDirty = false;
    historyGroupLast = null;
    historyGroupBefore = null;
    historyGroupOperations.clear();

    emitter.emit("document", document3dss);
    emitTitle();

    // UI-only state should not leak across documents.
    selection = [];
    locked.clear();
    emitter.emit("selection", []);
    emitter.emit("lock", []);
    resetVisibilityState();
    resetOutlinerState();
    emitter.emit("document-replaced", { doc: document3dss, meta });
  }

  function updateDocument(mutator) {
    if (!document3dss) return;
    if (typeof mutator !== "function") return;
    if (workContext) throw new Error("この作品は対象・出現の契約を持ちます。専用の作品編集を使ってください。");

    const beforeText = JSON.stringify(document3dss);
    // Existing editors use both return-a-document and mutate-in-place styles.
    // Run either style on an isolated copy so a throw cannot corrupt live state.
    const draft = cloneDoc(document3dss);
    const result = mutator(draft);
    const next = result === undefined ? draft : result;
    if (!next || typeof next !== "object") return;
    normalizeDocInPlace(next);
    if (JSON.stringify(next) === beforeText) return;

    document3dss = next;

    // Record history.
    // When a history group is active, we defer pushing snapshots until the group ends.
    if (historyGroupDepth > 0) {
      historyGroupDirty = true;
      historyGroupLast = captureState();
    } else {
      if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
      history.push(captureState());
      historyIndex = history.length - 1;
    }

    emitter.emit("document", document3dss);
    // While grouping, historyIndex is not advanced yet. Treat as dirty when group has changes.
    if (historyGroupDepth > 0) setDirty(true);
    else setDirty(savedDocumentText === null || stateText() !== savedDocumentText);
    emitTitle();
  }

  function updateWorkState(mutator, meta = {}) {
    if (!workContext || typeof mutator !== "function") throw new Error("認識可能な作品契約がありません。");
    const before = stateText();
    const beforeState = captureState();
    const draft = exportedState();
    const result = mutator(draft) ?? draft;
    if (!result || !result.scene || !result.workContext) throw new Error("作品編集の結果が不完全です。");
    if (JSON.stringify({ scene: result.scene, workContext: contentContext(result.workContext) }) === JSON.stringify(beforeState)) return false;
    // A shared edit can touch a different occurrence or a label/port that is
    // locked. Check both the rendered element and its declared owner before
    // committing. Input buffers remain saveable while a content edit is blocked.
    const lockedContent = (state, uuid) => {
      const scene = state.scene;
      const contract = state.workContext?.contract;
      const element = [...scene.points, ...scene.lines, ...scene.aux].find(e => e.meta?.uuid === uuid);
      const occurrence = contract?.occurrences?.find(o => [o.anchor,o.label,o.port].includes(uuid));
      const target = occurrence ? contract.targets.find(t => t.id === occurrence.target) : null;
      const relation = contract?.relations?.find(r => r.hub === uuid || [...r.participants,...r.refs].some(p => p.line === uuid));
      const boundary = contract?.boundary?.aux === uuid ? contract.boundary : null;
      // A line's ref stays identical when its referenced point moves. Lock its
      // effective endpoints as well, so numeric editing and dragging agree.
      const effectiveEndpoints = scene.lines.includes(element)
        ? ['end_a', 'end_b'].map(key => {
          const endpoint = element.appearance?.[key];
          if (endpoint?.coord) return endpoint.coord;
          return scene.points.find(point => uuidOf(point) === endpoint?.ref)?.appearance?.position ?? null;
        }) : null;
      return JSON.stringify({element,occurrence,target,relation,boundary,effectiveEndpoints});
    };
    const previous = locked.size ? JSON.parse(before) : null;
    for (const uuid of locked) {
      if (lockedContent(previous, uuid) !== lockedContent(result, uuid)) {
        throw new Error(`変更先にロックされた要素があります: ${uuid}。入力は保持しています。`);
      }
    }
    // Prepare the lineage before committing too; an exhausted sequence cannot
    // leave successfully edited content with an unreadable journal.
    let entry = null;
    if (!historyGroupDepth) entry = createJournalEntry(beforeState, result, workJournal, 'edit', meta.operation);
    else if (workJournal.at(-1)?.sequence === Number.MAX_SAFE_INTEGER) createJournalEntry(historyGroupBefore, result, workJournal, 'edit', meta.operation);
    // Commit only after the mutator has validated the entire result. Throws are
    // atomic: neither scene nor context was touched while drafting.
    restoreState(result);
    if (historyGroupDepth > 0) {
      historyGroupDirty = true;
      historyGroupLast = captureState();
      const operation = typeof meta.operation === 'string' ? meta.operation : meta.operation?.type;
      if (operation && !['draft-input', 'discard-draft', 'draft-remove'].includes(operation)) historyGroupOperations.add(operation);
    } else {
      appendJournal(entry);
      if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
      history.push(captureState());
      historyIndex = history.length - 1;
    }
    emitter.emit("document", document3dss);
    setDirty(savedDocumentText === null || stateText() !== savedDocumentText);
    emitTitle();
    return true;
  }

  // History grouping: coalesce multiple updateDocument() calls into a single undo step.
  let historyGroupDepth = 0;
  let historyGroupDirty = false;
  let historyGroupLast = null;
  let historyGroupBefore = null;
  let historyGroupOperations = new Set();

  function beginHistoryGroup() {
    if (!historyGroupDepth) {
      historyGroupBefore = captureState();
      historyGroupOperations.clear();
    }
    historyGroupDepth += 1;
  }

  function endHistoryGroup() {
    if (historyGroupDepth <= 0) return false;
    historyGroupDepth -= 1;
    if (historyGroupDepth > 0) return true;

    if (!historyGroupDirty || !historyGroupLast) {
      historyGroupDirty = false;
      historyGroupLast = null;
      historyGroupBefore = null;
      historyGroupOperations.clear();
      // No document mutation happened while grouped.
      setDirty(savedDocumentText === null || stateText() !== savedDocumentText);
      emitTitle();
      return true;
    }

    // One content change record per group; raw input keystrokes make no record.
    appendJournal(createJournalEntry(historyGroupBefore, historyGroupLast, workJournal, 'edit', [...historyGroupOperations].join('+') || 'history-group'));
    // Commit a single history entry for the group.
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push(cloneDoc(historyGroupLast));
    historyIndex = history.length - 1;

    historyGroupDirty = false;
    historyGroupLast = null;
    historyGroupBefore = null;
    historyGroupOperations.clear();

    setDirty(savedDocumentText === null || stateText() !== savedDocumentText);
    emitTitle();
    return true;
  }

  function undo() {
    flushHistoryGroup();
    if (historyIndex <= 0) return false;
    const before = captureState();
    const entry = createJournalEntry(before, history[historyIndex - 1], workJournal, 'undo', 'undo');
    historyIndex -= 1;
    restoreState(history[historyIndex]);
    appendJournal(entry);
    emitter.emit("document", document3dss);
    setDirty(savedDocumentText === null || stateText() !== savedDocumentText);
    emitTitle();
    return true;
  }

  function redo() {
    flushHistoryGroup();
    if (historyIndex < 0 || historyIndex >= history.length - 1) return false;
    const before = captureState();
    const entry = createJournalEntry(before, history[historyIndex + 1], workJournal, 'redo', 'redo');
    historyIndex += 1;
    restoreState(history[historyIndex]);
    appendJournal(entry);
    emitter.emit("document", document3dss);
    setDirty(savedDocumentText === null || stateText() !== savedDocumentText);
    emitTitle();
    return true;
  }

  function canUndo() {
    return historyIndex > 0;
  }

  function flushHistoryGroup() {
    while (historyGroupDepth > 0) endHistoryGroup();
  }

  function canRedo() {
    return historyIndex >= 0 && historyIndex < history.length - 1;
  }

  function getDocument() {
    return document3dss;
  }

  function setSelection(uuids) {
    const next = Array.isArray(uuids) ? uuids.filter(Boolean).map(String) : [];

    // Prevent redundant emits (important for UI re-entrancy guards).
    if (next.length === selection.length) {
      let same = true;
      for (let i = 0; i < next.length; i++) {
        if (String(next[i]) !== String(selection[i])) { same = false; break; }
      }
      if (same) return;
    }

    selection = next;
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

  function setLocks(uuids) {
    locked.clear();
    const list = Array.isArray(uuids) ? uuids.filter(Boolean).map(String) : [];
    for (const u of list) locked.add(u);
    emitter.emit("lock", [...locked]);
  }

  function setVisibilityState(payload) {
    hidden.clear();
    const h = payload && Array.isArray(payload.hidden) ? payload.hidden : [];
    for (const u of h.filter(Boolean)) hidden.add(String(u));
    const s = payload && payload.solo ? String(payload.solo) : "";
    soloUuid = s || null;
    emitVisibility();
  }

  function setOutlinerState(payload) {
    groups.clear();
    itemToGroup.clear();
    collapsedGroups.clear();

    // groups
    const gs = payload && Array.isArray(payload.groups) ? payload.groups : [];
    let maxN = 0;
    for (const g of gs) {
      if (!g || typeof g !== "object") continue;
      const id = String(g.id || "").trim();
      if (!id) continue;
      const name = String(g.name || "Group").trim() || "Group";
      const parentId = (g.parentId == null) ? null : String(g.parentId);
      groups.set(id, { id, name, parentId });
      const m = id.match(/^g(\d+)$/);
      if (m) maxN = Math.max(maxN, Number(m[1]) || 0);
    }
    groupSeq = Math.max(1, maxN + 1);

    // item -> group mapping
    const map = payload && payload.itemToGroup && typeof payload.itemToGroup === "object" ? payload.itemToGroup : {};
    for (const [u, gid] of Object.entries(map)) {
      const uu = String(u || "").trim();
      const gg = String(gid || "").trim();
      if (!uu || !gg || !groups.has(gg)) continue;
      itemToGroup.set(uu, gg);
    }

    // collapsed groups
    const cs = payload && Array.isArray(payload.collapsed) ? payload.collapsed : [];
    for (const gid of cs.filter(Boolean).map(String)) {
      if (groups.has(gid)) collapsedGroups.add(gid);
    }

    emitOutliner();
  }

  function getUiSidecar() {
    return {
      v: 1,
      locks: listLocks(),
      visibility: { hidden: listHidden(), solo: getSolo() },
      outliner: getOutlinerState(),
      uiState: getUiState(),
    };
  }

  function applyUiSidecar(sidecar) {
    if (!sidecar || typeof sidecar !== "object") return;
    if (sidecar.locks) setLocks(sidecar.locks);
    if (sidecar.visibility) setVisibilityState(sidecar.visibility);
    if (sidecar.outliner) setOutlinerState(sidecar.outliner);
    if (sidecar.uiState) setUiState(sidecar.uiState);
  }

  function setUiState(partial) {
    const next = { ...uiState, ...(partial || {}) };

    // Normalize UI-only state.
    const tab = String(next.activeTab || "points");
    next.activeTab = (tab === "points" || tab === "lines" || tab === "aux") ? tab : "points";

    const tool = String(next.activeTool || "select");
    next.activeTool = (tool === "move" || tool === "select") ? tool : "select";

    const fiRaw = next.frameIndex;
    let fi = 0;
    if (typeof fiRaw === "number" && Number.isFinite(fiRaw)) fi = Math.trunc(fiRaw);
    else if (typeof fiRaw === "string" && fiRaw.trim() && Number.isFinite(Number(fiRaw))) fi = Math.trunc(Number(fiRaw));
    if (fi < -64) fi = -64;
    if (fi > 63) fi = 63;
    next.frameIndex = fi;

    // playback
    next.framePlaying = !!next.framePlaying;
    let fps = 24;
    const fpsRaw = next.frameFps;
    if (typeof fpsRaw === "number" && Number.isFinite(fpsRaw)) fps = fpsRaw;
    else if (typeof fpsRaw === "string" && fpsRaw.trim() && Number.isFinite(Number(fpsRaw))) fps = Number(fpsRaw);
    fps = Math.max(1, Math.min(120, Math.round(fps)));
    next.frameFps = fps;

    // world axis
    const ax = String(next.worldAxisMode || "fixed");
    next.worldAxisMode = (ax === "off" || ax === "fixed" || ax === "full_view") ? ax : "fixed";

    // orbit

    // preview-out
    next.focusMode = !!next.focusMode;
    next.previewOutMirror = !!next.previewOutMirror;

    uiState = next;
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
    const push = ({ severity, uuid, kind, path, expected, actual, message }) => {
      issues.push({ severity, uuid: uuid ?? null, kind: kind ?? null, path, expected, actual, message });
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


// Import extras (info): unknown fields stripped during importNormalize()
if (importExtras && typeof importExtras === "object") {
  const total = Number(importExtras.removedCount || 0) || 0;
  const list = Array.isArray(importExtras.removed) ? importExtras.removed : [];
  if (total > 0 || list.length > 0) {
    push({
      severity: "info",
      uuid: null,
      kind: "import",
      path: "/__import_extras",
      expected: "no unknown fields",
      actual: `${total} unknown fields stored in extras`,
      message: "Unknown fields were stripped on import and stored as extras (not exported)"
    });

    const cap = 50;
    for (let i = 0; i < Math.min(list.length, cap); i++) {
      const it = list[i];
      push({
        severity: "info",
        uuid: null,
        kind: "import",
        path: it?.path || "/",
        expected: "(known schema field)",
        actual: it?.value,
        message: "Stored in import extras"
      });
    }
    if (total > cap) {
      push({
        severity: "info",
        uuid: null,
        kind: "import",
        path: "/__import_extras",
        expected: `show first ${cap}`,
        actual: `${total - cap} more`,
        message: "Extras list truncated in QuickCheck"
      });
    }
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

    for (const conflict of endpointConflicts(doc)) {
      push({ ...conflict, severity: "error", kind: "line", path: conflict.instancePath });
    }

    // line endpoints ref integrity (canonical appearance first)
    const pointUuids = new Set((Array.isArray(doc.points) ? doc.points : []).map((p) => uuidOf(p)).filter(Boolean));

    const getRef = (line, key) => {
      const primary = line?.appearance?.[key]?.ref;
      if (typeof primary === "string" && primary) return { ref: primary, path: `/appearance/${key}/ref` };
      const legacy = line?.[key]?.ref;
      if (typeof legacy === "string" && legacy) return { ref: legacy, path: `/${key}/ref` };
      if (primary != null) return { ref: primary, path: `/appearance/${key}/ref` };
      if (legacy != null) return { ref: legacy, path: `/${key}/ref` };
      return { ref: null, path: `/${key}/ref` };
    };

    let brokenLineCount = 0;

    if (Array.isArray(doc.lines)) {
      for (let i = 0; i < doc.lines.length; i++) {
        const l = doc.lines[i];
        const lUuid = uuidOf(l) ?? null;
        const basePath = `/lines/${i}`;
        let broken = false;

        for (const endKey of ["end_a", "end_b"]) {
          const { ref, path } = getRef(l, endKey);
          if (ref == null) continue;
          if (typeof ref !== "string") {
            push({
              severity: "warn",
              uuid: lUuid,
              kind: "line",
              path: `${basePath}${path}`,
              expected: "string uuid",
              actual: ref,
              message: "ref should be a uuid string"
            });
            broken = true;
            continue;
          }
          if (!pointUuids.has(ref)) {
            push({
              severity: "warn",
              uuid: lUuid,
              kind: "line",
              path: `${basePath}${path}`,
              expected: "existing point uuid",
              actual: ref,
              message: "ref points to missing/non-point uuid"
            });
            broken = true;
          }
        }

        if (broken) brokenLineCount += 1;
      }
    }

    if (brokenLineCount) {
      push({
        severity: "info",
        uuid: null,
        kind: "doc",
        path: "/lines",
        expected: "all endpoints resolve",
        actual: `${brokenLineCount} broken lines`,
        message: "Some lines have broken endpoints (you can auto-remove them)"
      });
    }


    return issues;
  }

  function fixBrokenLineEndpoints() {
    const doc = document3dss;
    if (!doc || typeof doc !== "object") return { removed: 0 };

    const pointUuids = new Set((Array.isArray(doc.points) ? doc.points : []).map((p) => uuidOf(p)).filter(Boolean));
    let removed = 0;

    updateDocument((cur) => {
      if (!cur || typeof cur !== "object" || !Array.isArray(cur.lines)) return cur;
      const next = { ...cur };
      next.lines = cur.lines.filter((ln) => {
        const a = ln?.end_a?.ref;
        const b = ln?.end_b?.ref;
        const okA = (typeof a === "string" && a) ? pointUuids.has(a) : (a == null);
        const okB = (typeof b === "string" && b) ? pointUuids.has(b) : (b == null);
        const keep = okA && okB;
        if (!keep) removed += 1;
        return keep;
      });
      return next;
    });

    return { removed };
  }


function _findPathByUuidInDoc(doc, uuid, kindHint) {
  if (!doc || !uuid) return null;
  const u = String(uuid);
  const kind = kindHint ? String(kindHint).toLowerCase() : "";
  const tryList = (arr, base) => {
    if (!Array.isArray(arr)) return null;
    for (let i = 0; i < arr.length; i += 1) {
      const it = arr[i];
      const id = it?.meta?.uuid || it?.uuid;
      if (id === u) return `${base}/${i}`;
    }
    return null;
  };
  if (kind === "point") return tryList(doc.points, "/points");
  if (kind === "line") return tryList(doc.lines, "/lines");
  if (kind === "aux") return tryList(doc.aux, "/aux");
  return tryList(doc.points, "/points") || tryList(doc.lines, "/lines") || tryList(doc.aux, "/aux") || null;
}

function _resolveIssueLike(issue) {
  if (!issue || typeof issue !== "object") return null;
  const rawUuid = issue.uuid ? String(issue.uuid) : "";
  const rawKind = issue.kind ? String(issue.kind).toLowerCase() : "";
  const rawPath = issue.path ? String(issue.path) : "";

  let uuid = rawUuid;
  let kind = rawKind;
  let path = rawPath;

  const doc = getDocument();
  const hasDoc = !!(doc && typeof doc === "object");

  // Infer kind from path prefix.
  if (!kind && path) {
    const pm = path.match(/^\/(points|lines|aux)(?:\/|$)/);
    if (pm) kind = pm[1] === "points" ? "point" : pm[1] === "lines" ? "line" : "aux";
  }

  // Resolve uuid from QuickCheck-like path (index-based).
  if (!uuid && path && hasDoc) {
    const m = path.match(/^\/(points|lines|aux)\/(\d+)(?:\/.*)?$/);
    if (m) {
      const tab = m[1];
      const idx = Number(m[2]);
      if (Number.isFinite(idx) && idx >= 0) {
        const arr = tab === "points" ? doc.points : tab === "lines" ? doc.lines : doc.aux;
        if (Array.isArray(arr) && idx < arr.length) {
          const node = arr[idx];
          const u = node?.meta?.uuid || node?.uuid;
          if (u) {
            uuid = String(u);
            if (!kind) kind = tab === "points" ? "point" : tab === "lines" ? "line" : "aux";
          }
        }
      }
    }
  }

  // Infer kind from uuid by scanning doc.
  if (uuid && hasDoc && (!kind || (kind !== "point" && kind !== "line" && kind !== "aux"))) {
    try {
      const u = String(uuid);
      const hitPoint = Array.isArray(doc.points) && doc.points.some((n) => String(n?.meta?.uuid || n?.uuid || "") === u);
      const hitLine = Array.isArray(doc.lines) && doc.lines.some((n) => String(n?.meta?.uuid || n?.uuid || "") === u);
      const hitAux = Array.isArray(doc.aux) && doc.aux.some((n) => String(n?.meta?.uuid || n?.uuid || "") === u);
      kind = hitPoint ? "point" : hitLine ? "line" : hitAux ? "aux" : "";
    } catch {}
  }

  // Fill path if missing.
  if (uuid && hasDoc && !path) {
    try { path = _findPathByUuidInDoc(doc, uuid, kind) || ""; } catch {}
  }

  if (!uuid) return null;
  return { uuid: String(uuid), kind: kind || null, path: path || null };
}


function focusByIssue(issue) {
  // Stable focus: accept issueLike by uuid and/or path.
  // Ensures: selection + tab switch + focus event (even if selection is unchanged).
  const resolved = _resolveIssueLike(issue);

  if (resolved?.uuid) {
    try { setSelection([resolved.uuid]); } catch {}
    try {
      const k = String(resolved.kind || "").toLowerCase();
      const activeTab = k === "point" ? "points" : k === "line" ? "lines" : k === "aux" ? "aux" : null;
      if (activeTab) setUiState({ activeTab });
    } catch {}
    emitter.emit("focus", resolved);
    return;
  }

  // Fallback: still emit focus for UI hooks.
  emitter.emit("focus", issue);
}


  return {
    work: { getContext: exportedContext, getState: exportedState, getJournal: () => cloneDoc(workJournal), update: updateWorkState },
    document: { get: getDocument, getEpoch: () => documentEpoch, set: setDocument, update: updateDocument, getLabel: () => docLabel, setLabel },
    file: {
      getBaseLabel: baseLabel,
      getDisplayLabel: displayLabel,
      getWindowTitle: windowTitle,
      getSaveLabel,
      getSaveHandle,
      setSaveLabel,
      setSaveHandle,
      clearSaveLabel,
      clearSaveHandle
    },
    dirty: { get: () => isDirty, markDirty, markClean, set: setDirty },
    edit: {
      updateDocument,
      beginHistoryGroup,
      endHistoryGroup,
      flushHistoryGroup,
      undo,
      redo,
      canUndo,
      canRedo
    },
    selection: { get: () => [...selection], set: setSelection },
    lock: { toggle: toggleLock, list: listLocks, set: setLocks },
    visibility: {
      toggleHidden,
      isHidden,
      listHidden,
      setState: setVisibilityState,
      setSolo,
      clearSolo,
      getSolo,
      reset: resetVisibilityState,
    },
    outliner: {
      getState: getOutlinerState,
      setState: setOutlinerState,
      reset: resetOutlinerState,
      createGroup,
      renameGroup,
      toggleGroupCollapsed,
      assignItemsToGroup,
      ungroupItems,
    },
    uiState: { get: getUiState, set: setUiState },
    uiSidecar: { get: getUiSidecar, apply: applyUiSidecar },
    quickcheck: { run: runQuickCheck, fixBrokenLineEndpoints },
    import: { normalize: importNormalize, getExtras: getImportExtras, clearExtras: clearImportExtras },
    validator: { ensureInitialized: ensureValidatorInitialized, validate: validateStrict, getErrors: getStrictErrors, getSchemaInfo, isReady: isValidatorReady,
      ensureWorkInitialized: ensureWorkValidatorInitialized, validateWork: validateWorkShape, getWorkErrors: () => workValidationErrors },
    focusByIssue
  };
}

