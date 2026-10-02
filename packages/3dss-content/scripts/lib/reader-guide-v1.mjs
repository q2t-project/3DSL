const UUID_RE = /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;

function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
function nonempty(v) { return typeof v === "string" && v.trim().length > 0; }
function allowedKeys(obj, allowed, path, errs) {
  for (const k of Object.keys(obj)) if (!allowed.has(k)) errs.push(`${path}: unknown key ${k}`);
}

export function validateReaderGuideV1(guide) {
  const errs = [];
  if (!isObj(guide)) return { ok:false, errors:["guide must be an object"] };

  allowedKeys(guide, new Set(["version","orientation","routes"]), "$", errs);
  if (guide.version !== "1.0") errs.push('$.version: expected "1.0"');

  const o = guide.orientation;
  if (!isObj(o)) {
    errs.push("$.orientation: object required");
  } else {
    allowedKeys(o, new Set(["summary","placement","axes","frames","scope","viewpoint","cautions"]), "$.orientation", errs);
    if (!nonempty(o.summary)) errs.push("$.orientation.summary: non-empty string required");

    if (!isObj(o.placement)) errs.push("$.orientation.placement: object required");
    else {
      allowedKeys(o.placement, new Set(["meaning"]), "$.orientation.placement", errs);
      if (!nonempty(o.placement.meaning)) errs.push("$.orientation.placement.meaning: non-empty string required");
    }

    if (o.axes != null) {
      if (!Array.isArray(o.axes)) errs.push("$.orientation.axes: array required");
      else {
        const seen = new Set();
        for (let i=0;i<o.axes.length;i++) {
          const a=o.axes[i], p=`$.orientation.axes[${i}]`;
          if (!isObj(a)) { errs.push(`${p}: object required`); continue; }
          allowedKeys(a,new Set(["axis","label","meaning","unit"]),p,errs);
          if (!["x","y","z"].includes(a.axis)) errs.push(`${p}.axis: expected x|y|z`);
          else if (seen.has(a.axis)) errs.push(`${p}.axis: duplicate axis ${a.axis}`);
          else seen.add(a.axis);
          if (!nonempty(a.label)) errs.push(`${p}.label: non-empty string required`);
          if (!nonempty(a.meaning)) errs.push(`${p}.meaning: non-empty string required`);
          if (a.unit != null && !nonempty(a.unit)) errs.push(`${p}.unit: non-empty string when present`);
        }
      }
    }

    if (o.frames != null) {
      if (!isObj(o.frames)) errs.push("$.orientation.frames: object required");
      else {
        allowedKeys(o.frames,new Set(["meaning","target_time_mapping"]),"$.orientation.frames",errs);
        if (!nonempty(o.frames.meaning)) errs.push("$.orientation.frames.meaning: non-empty string required");
        const m=o.frames.target_time_mapping;
        if (!isObj(m)) errs.push("$.orientation.frames.target_time_mapping: object required");
        else {
          allowedKeys(m,new Set(["mapped","description"]),"$.orientation.frames.target_time_mapping",errs);
          if (typeof m.mapped !== "boolean") errs.push("$.orientation.frames.target_time_mapping.mapped: boolean required");
          if (m.mapped === true && !nonempty(m.description)) errs.push("$.orientation.frames.target_time_mapping.description: required when mapped=true");
          if (m.mapped === false && m.description != null && !nonempty(m.description)) errs.push("$.orientation.frames.target_time_mapping.description: non-empty when present");
        }
      }
    }
    for (const k of ["scope","viewpoint"]) if (o[k] != null && !nonempty(o[k])) errs.push(`$.orientation.${k}: non-empty string when present`);
    if (o.cautions != null && (!Array.isArray(o.cautions) || o.cautions.some(x=>!nonempty(x)))) errs.push("$.orientation.cautions: string[] with non-empty values required");
  }

  if (!Array.isArray(guide.routes) || guide.routes.length===0) {
    errs.push("$.routes: non-empty array required");
  } else {
    const routeIds=new Set();
    for(let i=0;i<guide.routes.length;i++){
      const r=guide.routes[i], rp=`$.routes[${i}]`;
      if(!isObj(r)){ errs.push(`${rp}: object required`); continue; }
      allowedKeys(r,new Set(["id","title","summary","order_semantics","order_note","steps"]),rp,errs);
      if(!nonempty(r.id)||!ID_RE.test(r.id)) errs.push(`${rp}.id: invalid id`);
      else if(routeIds.has(r.id)) errs.push(`${rp}.id: duplicate route id ${r.id}`);
      else routeIds.add(r.id);
      if(!nonempty(r.title)) errs.push(`${rp}.title: non-empty string required`);
      if(r.summary!=null&&!nonempty(r.summary)) errs.push(`${rp}.summary: non-empty string when present`);
      if(!["presentation","temporal","causal","other"].includes(r.order_semantics)) errs.push(`${rp}.order_semantics: invalid value`);
      if(["temporal","causal","other"].includes(r.order_semantics) && !nonempty(r.order_note)) errs.push(`${rp}.order_note: required for ${r.order_semantics}`);
      if(r.order_note!=null&&!nonempty(r.order_note)) errs.push(`${rp}.order_note: non-empty string when present`);
      if(!Array.isArray(r.steps)||r.steps.length===0){ errs.push(`${rp}.steps: non-empty array required`); continue; }
      const stepIds=new Set();
      for(let j=0;j<r.steps.length;j++){
        const s=r.steps[j], sp=`${rp}.steps[${j}]`;
        if(!isObj(s)){ errs.push(`${sp}: object required`); continue; }
        allowedKeys(s,new Set(["id","title","note","target","mode","frame","view_preset","scope"]),sp,errs);
        if(!nonempty(s.id)||!ID_RE.test(s.id)) errs.push(`${sp}.id: invalid id`);
        else if(stepIds.has(s.id)) errs.push(`${sp}.id: duplicate step id ${s.id}`);
        else stepIds.add(s.id);
        if(!nonempty(s.title)) errs.push(`${sp}.title: non-empty string required`);
        if(s.note!=null&&!nonempty(s.note)) errs.push(`${sp}.note: non-empty string when present`);
        if(!isObj(s.target)) errs.push(`${sp}.target: object required`);
        else if(s.target.kind==="whole"){
          allowedKeys(s.target,new Set(["kind"]),`${sp}.target`,errs);
          if(s.mode==="micro") errs.push(`${sp}.mode: micro requires element target`);
        } else if(s.target.kind==="element"){
          allowedKeys(s.target,new Set(["kind","uuid","element_kind"]),`${sp}.target`,errs);
          if(!UUID_RE.test(String(s.target.uuid??""))) errs.push(`${sp}.target.uuid: invalid 3DSS UUID syntax`);
          if(!["points","lines","aux"].includes(s.target.element_kind)) errs.push(`${sp}.target.element_kind: expected points|lines|aux`);
        } else {
          errs.push(`${sp}.target.kind: expected whole|element`);
        }
        if(s.mode!=null&&!["macro","micro"].includes(s.mode)) errs.push(`${sp}.mode: expected macro|micro`);
        if(s.frame!=null){
          if(!Number.isInteger(s.frame)||s.frame < -9999 || s.frame > 9999) errs.push(`${sp}.frame: integer[-9999,9999] required`);
          if(!isObj(o?.frames)) errs.push(`${sp}.frame: orientation.frames required when frame hint is used`);
        }
        if(s.view_preset!=null&&!nonempty(s.view_preset)) errs.push(`${sp}.view_preset: non-empty string when present`);
        if(s.scope!=null){
          if(!isObj(s.scope)) errs.push(`${sp}.scope: object required`);
          else {
            allowedKeys(s.scope,new Set(["include_uuids","highlight_uuids"]),`${sp}.scope`,errs);
            for(const key of ["include_uuids","highlight_uuids"]){
              if(s.scope[key]!=null && (!Array.isArray(s.scope[key]) || s.scope[key].some(x=>!UUID_RE.test(String(x??""))))){
                errs.push(`${sp}.scope.${key}: UUID[] required`);
              }
            }
          }
        }
      }
    }
  }
  return {ok:errs.length===0, errors:errs};
}

function modelReferenceIndex(model) {
  const byUuid = new Map();
  const frameValues = [];
  for (const kind of ["points", "lines", "aux"]) {
    const items = Array.isArray(model?.[kind]) ? model[kind] : [];
    for (const item of items) {
      const uuid = item?.meta?.uuid;
      if (typeof uuid === "string" && uuid) byUuid.set(uuid, kind);
      const frames = item?.appearance?.frames;
      if (Number.isInteger(frames)) frameValues.push(frames);
      else if (Array.isArray(frames)) {
        for (const v of frames) if (Number.isInteger(v)) frameValues.push(v);
      }
    }
  }
  const frameRange = frameValues.length
    ? { min: Math.min(...frameValues), max: Math.max(...frameValues) }
    : { min: 0, max: 0 };
  return { byUuid, frameRange };
}

export function validateReaderGuideReferencesV1(guide, model) {
  const errs = [];
  const index = modelReferenceIndex(model);

  const checkUuid = (uuid, expectedKind, path) => {
    const actual = index.byUuid.get(uuid);
    if (!actual) {
      errs.push(`${path}: stale/unknown model UUID ${uuid}`);
      return;
    }
    if (expectedKind && actual !== expectedKind) {
      errs.push(`${path}: kind mismatch; guide=${expectedKind} model=${actual}`);
    }
  };

  const routes = Array.isArray(guide?.routes) ? guide.routes : [];
  for (let i = 0; i < routes.length; i++) {
    const steps = Array.isArray(routes[i]?.steps) ? routes[i].steps : [];
    for (let j = 0; j < steps.length; j++) {
      const s = steps[j];
      const sp = `$.routes[${i}].steps[${j}]`;
      if (s?.target?.kind === "element") {
        checkUuid(s.target.uuid, s.target.element_kind, `${sp}.target`);
      }
      if (Number.isInteger(s?.frame)) {
        if (s.frame < index.frameRange.min || s.frame > index.frameRange.max) {
          errs.push(`${sp}.frame: ${s.frame} outside model frame range ${index.frameRange.min}..${index.frameRange.max}`);
        }
      }
      const scope = isObj(s?.scope) ? s.scope : null;
      if (scope) {
        for (const key of ["include_uuids", "highlight_uuids"]) {
          const xs = Array.isArray(scope[key]) ? scope[key] : [];
          for (let k = 0; k < xs.length; k++) checkUuid(xs[k], null, `${sp}.scope.${key}[${k}]`);
        }
      }
    }
  }
  return { ok: errs.length === 0, errors: errs, frameRange: index.frameRange };
}

export function validateReaderBundleV1(guide, model) {
  const structural = validateReaderGuideV1(guide);
  if (!structural.ok) return { ok: false, errors: structural.errors, frameRange: null };
  const refs = validateReaderGuideReferencesV1(guide, model);
  return { ok: refs.ok, errors: refs.errors, frameRange: refs.frameRange };
}

export function assertReaderBundleV1(guide, model, label = "reader guide") {
  const result = validateReaderBundleV1(guide, model);
  if (!result.ok) throw new Error(`${label} invalid:\n- ${result.errors.join("\n- ")}`);
  return result;
}
