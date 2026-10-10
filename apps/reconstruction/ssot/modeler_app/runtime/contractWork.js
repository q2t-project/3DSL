// Bounded, locally versioned authoring contract. Never accept it as opaque
// work/0.1: older editors cannot maintain its identity/occurrence invariants.
import { createWorkPackage, parseWorkPackage, getWorkComparison, assertLosslessWorkJSON } from './workPackage.js';

export const CONTRACT_WORK_FORMAT = '3dsl-contract-work/0.1';
export const CONTRACT_FORMAT = '3dsl-authoring-contract/0.1';
const clone = x => structuredClone(x);
const fail = message => { throw new Error(`作品契約: ${message}`); };
const check = (condition, message) => { if (!condition) fail(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const add = (a, b) => a.map((v, i) => v + b[i]);
const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const index = (items, key, label) => {
  check(Array.isArray(items), `${label}が配列ではありません`);
  const result = new Map();
  for (const item of items) {
    check(item && typeof item[key] === 'string' && item[key] && !result.has(item[key]), `${label}のIDが不正・重複しています`);
    result.set(item[key], item);
  }
  return result;
};
const frameValid = value => Array.isArray(value) && value.length > 0 && value.every(x => Number.isInteger(x) && x >= -64 && x <= 63);
const elementMap = scene => new Map([...scene.points, ...scene.lines, ...scene.aux].map(e => [e.meta.uuid, e]));
const textOf = point => point?.appearance?.marker?.text?.content;
function validateContract(c, scene) {
  check(c?.format === CONTRACT_FORMAT, 'この契約版には未対応です');
  check(c.authority === 'scene-anchor-and-boundary;contract-shared-values-and-offsets', '未対応の正本規則です');
  const allowed = ['format', 'authority', 'fixture', 'targets', 'occurrences', 'relations', 'axis', 'boundary', 'draft', 'sources'];
  for (const key of Object.keys(c)) check(allowed.includes(key), `未対応の契約項目: ${key}`);
  const ts = index(c.targets, 'id', '対象'), os = index(c.occurrences, 'id', '出現'), rs = index(c.relations, 'id', '関係');
  const es = elementMap(scene), claimed = new Set();
  const claim = (id, kind) => {
    check(es.has(id) && !claimed.has(id), `${kind}の表示要素がないか重複しています: ${id}`);
    const element = es.get(id);
    check(scene[kind].includes(element), `${id}の表示種別が違います`);
    claimed.add(id); return element;
  };
  for (const t of ts.values()) check(typeof t.name === 'string' && typeof t.epistemic === 'string', '対象の名前・認識状態がありません');
  for (const o of os.values()) {
    check(ts.has(o.target), `出現${o.id}の対象がありません`);
    check(vector(o.labelOffset) && vector(o.portOffset) && frameValid(o.frames), `出現${o.id}の座標差・表示が不正です`);
    const anchor = claim(o.anchor, 'points'), label = claim(o.label, 'points'), port = claim(o.port, 'points');
    const p = anchor.appearance?.position;
    check(vector(p), `出現${o.id}の位置が不正です`);
    check(same(label.appearance?.position, add(p, o.labelOffset)) && same(port.appearance?.position, add(p, o.portOffset)), `出現${o.id}の部品配置が契約と食い違っています`);
    check(textOf(label) === (o.labelOverride ?? ts.get(o.target).name), `出現${o.id}のラベルが契約と食い違っています`);
    for (const part of [anchor, label, port]) check(same(part.appearance.frames, o.frames), `出現${o.id}の部品の表示が一致しません`);
  }
  for (const r of rs.values()) {
    check(typeof r.name === 'string' && typeof r.condition === 'string', `関係${r.id}の内容がありません`);
    check(['ordered', 'role-defined'].includes(r.direction), `関係${r.id}の方向規則には未対応です`);
    check(textOf(claim(r.hub, 'points')) === r.name, `関係${r.id}のラベルが契約と食い違っています`);
    index([...r.participants, ...r.refs], 'id', `関係${r.id}の参与`);
    for (const p of r.participants) {
      check(ts.has(p.target) && os.get(p.occurrence)?.target === p.target, `関係${r.id}の参与先が一致しません`);
    }
    for (const p of r.refs) check(rs.has(p.relation), `関係${r.id}の参照関係がありません`);
    for (const p of [...r.participants, ...r.refs]) {
      check(typeof p.role === 'string' && p.role.trim(), `関係${r.id}の役割が空です`);
      const line = claim(p.line, 'lines');
      check(line.appearance?.end_a?.ref === r.hub && line.appearance?.end_b?.ref === (p.relation ? rs.get(p.relation)?.hub : os.get(p.occurrence)?.port), `関係${r.id}の接続先が契約と食い違っています`);
      check(line.signification?.caption === p.role, `関係${r.id}の役割ラベルが一致しません`);
    }
  }
  if (c.axis) {
    check(c.axis.rule === 'value=coordinate' && c.axis.authority === 'occurrence-position' && [0,1,2].includes(c.axis.dimension), '未対応の意味軸規則です');
    check(Array.isArray(c.axis.occurrences) && c.axis.occurrences.every(id => os.has(id)), '意味軸の出現がありません');
  }
  if (c.boundary) {
    check(c.boundary.rule === 'inside-or-on-edge' && c.boundary.authority === 'boundary-geometry' && c.boundary.plane === 'xy', '未対応の境界規則です');
    const aux = claim(c.boundary.aux, 'aux'), plate = aux.appearance?.module?.plate;
    check(plate?.plane === 'xy' && vector(plate.position) && plate.position[2] === 0 && Array.isArray(plate.size) && plate.size.length === 2 && plate.size.every(v => Number.isFinite(v) && v >= 0), '境界の形状が不正です');
    check(same(aux.appearance?.position,[0,0,0]) && same(aux.appearance?.orientation,[0,0,0]), '境界の外側変換には未対応です');
    check(Array.isArray(c.boundary.membersFrom) && c.boundary.membersFrom.every(id => os.has(id)), '境界の候補出現がありません');
  }
  check(c.draft && Array.isArray(c.draft.inputs) && Array.isArray(c.draft.pendingRelations), '草稿の保持領域がありません');
  if (c.draft.detached != null) {
    const records = index(c.draft.detached, 'id', '削除・接続修復の保持記録');
    const heldRelations = new Set();
    for (const record of records.values()) {
      check(['missing-display-occurrence','target-deleted','relation-deleted'].includes(record.reason), '未対応の削除理由です');
      const saved = record.content;
      check(saved && Array.isArray(saved.targets) && Array.isArray(saved.occurrences) && Array.isArray(saved.relations), '削除前の契約情報がありません');
      check(saved.scene && Array.isArray(saved.scene.points) && Array.isArray(saved.scene.lines), '削除前の表示情報がありません');
      const held = index(saved.relations,'id','保持関係');
      check(Array.isArray(record.unresolvedRelationIds) && Array.isArray(record.archivedRelationIds), '保持関係の状態がありません');
      const states = [...record.unresolvedRelationIds,...record.archivedRelationIds];
      check(states.length === held.size && new Set(states).size === held.size && states.every(id=>held.has(id)), '保持関係の状態と内容が一致しません');
      for (const id of held.keys()) { check(!rs.has(id) && !heldRelations.has(id), `保持関係が重複しています: ${id}`); heldRelations.add(id); }
      check(record.order && ['targets','occurrences','relations','points','lines'].every(key=>Array.isArray(record.order[key])), '復元順序がありません');
    }
  }
  check(Array.isArray(c.sources), '原資料の保持領域がありません');
  for (const source of c.sources) check(typeof source.utf8 === 'string' && typeof source.path === 'string' && typeof source.status === 'string', '原資料は原文と解釈状態を保持してください');
  return { ts, os, rs, es };
}

export const isContractWork = value => value?.format === CONTRACT_WORK_FORMAT;
export function parseContractWork(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  assertLosslessWorkJSON(value);
  check(isContractWork(value), '対応する作品形式ではありません');
  for (const key of Object.keys(value)) check(['format','status','scene','baselineScene','contract','baselineContract','attachments','journal'].includes(key), `未対応の作品項目: ${key}`);
  check(value.status === 'draft', '未対応の作品状態です');
  if(value.journal != null){
    check(Array.isArray(value.journal),'保護記録が配列ではありません');
    let last=0;
    for(const entry of value.journal){
      check(Number.isSafeInteger(entry.sequence)&&entry.sequence>last,'保護記録の通し番号が不正です');last=entry.sequence;
      check(typeof entry.at==='string'&&Number.isFinite(Date.parse(entry.at))&&['edit','undo','redo'].includes(entry.action)&&typeof entry.operation==='string','保護記録の操作情報が不正です');
      check(entry.affected&&['targets','occurrences','relations'].every(key=>Array.isArray(entry.affected[key])&&entry.affected[key].every(id=>typeof id==='string')),'保護記録の対象が不正です');
      check(Array.isArray(entry.changes)&&entry.changes.every(change=>typeof change.scope==='string'&&typeof change.path==='string'&&(Object.hasOwn(change,'before')||Object.hasOwn(change,'after'))),'保護記録の差分が不正です');
    }
  }
  // Existing lossless JSON checks cover scene, source strings and all contract
  // members too. The serialized contracts count toward the same 32 MiB budget.
  const envelope = createWorkPackage({ scene: value.scene, baselineScene: value.baselineScene, attachments: { ...value.attachments, 'contract-current.json': JSON.stringify(value.contract), 'contract-baseline.json': JSON.stringify(value.baselineContract), ...(value.journal!=null?{'work-journal.json':JSON.stringify(value.journal)}:{}) } });
  check(value.attachments && typeof value.attachments === 'object' && !Array.isArray(value.attachments), '添付領域がありません');
  for (const name of ['contract-current.json','contract-baseline.json','work-journal.json']) check(!Object.hasOwn(value.attachments,name), '予約された添付名です');
  const result = { format: CONTRACT_WORK_FORMAT, status: 'draft', scene: envelope.scene, baselineScene: envelope.baselineScene, contract: JSON.parse(envelope.attachments['contract-current.json']), baselineContract: JSON.parse(envelope.attachments['contract-baseline.json']), attachments: clone(value.attachments), ...(value.journal!=null?{journal:clone(value.journal)}:{}) };
  validateContract(result.contract, result.scene);
  validateContract(result.baselineContract, result.baselineScene);
  return result;
}

export function fromReferenceWork(raw) {
  const w = parseWorkPackage(raw), path = 'contracts/reconstruction-f1-f4.json';
  check(typeof w.attachments[path] === 'string', '明示された検証例の契約がありません。既存作品から意味を推測しません');
  const contract = JSON.parse(w.attachments[path]);
  check(contract.format === 'experimental-f1-f4-contract/A', '未対応の参照契約です');
  contract.format = CONTRACT_FORMAT;
  const attachments = clone(w.attachments); delete attachments[path];
  return parseContractWork({ format: CONTRACT_WORK_FORMAT, status: 'draft', scene: w.scene, baselineScene: w.baselineScene, contract, baselineContract: clone(contract), attachments });
}

export function contractContext(work) { const { scene, ...context } = parseContractWork(work); return context; }
export function assembleContractWork(scene, context) { return parseContractWork({ ...context, scene }); }
const get = (items, id, label) => { const found = items.find(x => x.id === id); check(found, `${label}がありません: ${id}`); return found; };
const setLabel = (e, text) => { e.signification ||= {}; e.signification.name = text; e.appearance.marker.text.content = text; };
const makeUuid = () => crypto.randomUUID();
const makePoint = (id, position, name = '', primitive = 'sphere') => ({meta:{uuid:id},signification:{name},appearance:{position,frames:[0],marker:{primitive,...(primitive==='sphere'?{radius:0.3}:{}),text:{content:name,size:1,pose:{front:[0,0,1],up:[0,1,0]}}}}});
export function createEmptyContractWork() {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const scene = {lines:[],points:[],aux:[],document_meta:{document_title:'新しい作品',document_uuid:makeUuid(),schema_uri:'https://3dsl.jp/schemas/release/v1.1.4/3DSS.schema.json#v1.1.4',version:'1.1.4',author:'q2t',created_at:now,revised_at:now,units:'non_si:px',coordinate_system:'Z+up/freeXY'}};
  const contract = {format:CONTRACT_FORMAT,authority:'scene-anchor-and-boundary;contract-shared-values-and-offsets',fixture:'authored',targets:[],occurrences:[],relations:[],axis:null,boundary:null,draft:{inputs:[],pendingRelations:[]},sources:[]};
  return parseContractWork({format:CONTRACT_WORK_FORMAT,status:'draft',scene,baselineScene:clone(scene),contract,baselineContract:clone(contract),attachments:{}});
}

// Deletion is an explicit, reviewable operation. An occurrence is a display
// reference: removing it must never withdraw the retained relationship content.
export function planContractDeletion(raw, op) {
  const work = parseContractWork(raw), c = work.contract;
  const types = ['delete-occurrence','delete-target','delete-relation'];
  check(types.includes(op.type),'未対応の削除操作です');
  const targets = op.type === 'delete-target' ? [get(c.targets,op.target,'対象')] : [];
  const occurrences = op.type === 'delete-occurrence' ? [get(c.occurrences,op.occurrence,'出現')]
    : op.type === 'delete-target' ? c.occurrences.filter(o=>o.target===op.target) : [];
  const occurrenceIds = new Set(occurrences.map(o=>o.id));
  const relationIds = new Set(op.type === 'delete-relation' ? [get(c.relations,op.relation,'関係').id] : []);
  for (const r of c.relations) if(r.participants.some(p=>occurrenceIds.has(p.occurrence))) relationIds.add(r.id);
  let changed = true;
  while(changed){ changed=false; for(const r of c.relations) if(!relationIds.has(r.id)&&r.refs.some(p=>relationIds.has(p.relation))){relationIds.add(r.id);changed=true;} }
  const relations = c.relations.filter(r=>relationIds.has(r.id));
  const pointIds = new Set([...occurrences.flatMap(o=>[o.anchor,o.label,o.port]),...relations.map(r=>r.hub)]);
  const lineIds = new Set(relations.flatMap(r=>[...r.participants,...r.refs].map(p=>p.line)));
  const blockers = work.scene.lines.filter(l=>!lineIds.has(l.meta.uuid)&&[l.appearance?.end_a?.ref,l.appearance?.end_b?.ref].some(id=>pointIds.has(id))).map(l=>`契約外の線 ${l.meta.uuid} が参照中`);
  if(op.type === 'delete-target') for(const record of c.draft.detached || []) for(const r of record.content.relations){
    if(record.unresolvedRelationIds.includes(r.id)&&r.participants.some(p=>p.target===op.target)) blockers.push(`表示接続の要修復関係 ${r.name || r.id} が対象を参照中。先に保持記録を復元してな`);
  }
  const archivedRelationIds = op.type === 'delete-target' ? [...relationIds] : op.type === 'delete-relation' ? [op.relation] : [];
  const unresolvedRelationIds = [...relationIds].filter(id=>!archivedRelationIds.includes(id));
  return {type:op.type,targets:clone(targets),occurrences:clone(occurrences),relations:clone(relations),
    archivedRelationIds,unresolvedRelationIds,sceneIds:[...pointIds,...lineIds],blockers,
    reason:op.type==='delete-occurrence'?'missing-display-occurrence':op.type==='delete-target'?'target-deleted':'relation-deleted'};
}

function detachForDeletion(work, op) {
  const plan = planContractDeletion(work,op), c=work.contract;
  check(!plan.blockers.length,plan.blockers.join('／'));
  const ids=new Set(plan.sceneIds), occurrenceIds=new Set(plan.occurrences.map(o=>o.id)), relationIds=new Set(plan.relations.map(r=>r.id)), targetIds=new Set(plan.targets.map(t=>t.id));
  const record={id:makeUuid(),reason:plan.reason,unresolvedRelationIds:plan.unresolvedRelationIds,archivedRelationIds:plan.archivedRelationIds,
    content:{targets:plan.targets,occurrences:plan.occurrences,relations:plan.relations,scene:{points:clone(work.scene.points.filter(p=>ids.has(p.meta.uuid))),lines:clone(work.scene.lines.filter(l=>ids.has(l.meta.uuid)))},
      axis:c.axis?{id:c.axis.id,occurrences:c.axis.occurrences.filter(id=>occurrenceIds.has(id))}:null,
      boundary:c.boundary?{id:c.boundary.id,membersFrom:c.boundary.membersFrom.filter(id=>occurrenceIds.has(id))}:null},
    order:{targets:c.targets.map(t=>t.id),occurrences:c.occurrences.map(o=>o.id),relations:c.relations.map(r=>r.id),points:work.scene.points.map(p=>p.meta.uuid),lines:work.scene.lines.map(l=>l.meta.uuid),axisOccurrences:clone(c.axis?.occurrences || []),boundaryMembers:clone(c.boundary?.membersFrom || [])}};
  c.targets=c.targets.filter(t=>!targetIds.has(t.id));c.occurrences=c.occurrences.filter(o=>!occurrenceIds.has(o.id));c.relations=c.relations.filter(r=>!relationIds.has(r.id));
  work.scene.points=work.scene.points.filter(p=>!ids.has(p.meta.uuid));work.scene.lines=work.scene.lines.filter(l=>!ids.has(l.meta.uuid));
  if(c.axis)c.axis.occurrences=c.axis.occurrences.filter(id=>!occurrenceIds.has(id));
  if(c.boundary)c.boundary.membersFrom=c.boundary.membersFrom.filter(id=>!occurrenceIds.has(id));
  (c.draft.detached ||= []).push(record);
}

function restoreDetached(work, id) {
  const c=work.contract,record=get(c.draft.detached || [],id,'保持記録'),saved=record.content;
  const existingSceneIds=new Set([...work.scene.points,...work.scene.lines,...work.scene.aux].map(e=>e.meta.uuid));
  for(const element of [...saved.scene.points,...saved.scene.lines])check(!existingSceneIds.has(element.meta.uuid),`復元する表示IDが既に存在します: ${element.meta.uuid}`);
  const merge=(current,previous,key,order)=>{
    const existing=new Set(current.map(x=>x[key]));
    for(const item of previous)check(!existing.has(item[key]),`復元先のIDが既に存在します: ${item[key]}`);
    const ranks=new Map(order.map((key,i)=>[key,i]));
    return [...current,...clone(previous)].sort((a,b)=>(ranks.get(a[key])??Infinity)-(ranks.get(b[key])??Infinity));
  };
  for(const key of ['targets','occurrences','relations'])c[key]=merge(c[key],saved[key],'id',record.order[key]);
  for(const key of ['points','lines']){
    const oldIds=new Set(work.scene[key].map(e=>e.meta.uuid));for(const e of saved.scene[key])check(!oldIds.has(e.meta.uuid),`復元する表示IDが既に存在します: ${e.meta.uuid}`);
    const ranks=new Map(record.order[key].map((id,i)=>[id,i]));work.scene[key]=[...work.scene[key],...clone(saved.scene[key])].sort((a,b)=>(ranks.get(a.meta.uuid)??Infinity)-(ranks.get(b.meta.uuid)??Infinity));
  }
  if(saved.axis?.occurrences.length){check(c.axis?.id===saved.axis.id,'意味軸が変更されています。復元先を確認してください');const ranks=new Map((record.order.axisOccurrences || []).map((id,i)=>[id,i]));c.axis.occurrences=[...new Set([...c.axis.occurrences,...saved.axis.occurrences])].sort((a,b)=>(ranks.get(a)??Infinity)-(ranks.get(b)??Infinity));}
  if(saved.boundary?.membersFrom.length){check(c.boundary?.id===saved.boundary.id,'境界が変更されています。復元先を確認してください');const ranks=new Map((record.order.boundaryMembers || []).map((id,i)=>[id,i]));c.boundary.membersFrom=[...new Set([...c.boundary.membersFrom,...saved.boundary.membersFrom])].sort((a,b)=>(ranks.get(a)??Infinity)-(ranks.get(b)??Infinity));}
  const es=elementMap(work.scene);
  for(const o of saved.occurrences){const t=get(c.targets,o.target,'復元する出現の対象');if(o.labelOverride==null)setLabel(es.get(o.label),t.name);}
  c.draft.detached=c.draft.detached.filter(r=>r.id!==id);if(!c.draft.detached.length)delete c.draft.detached;
}
export function operateContractWork(raw, op) {
  if(op.type==='batch') {
    check(Array.isArray(op.operations),'一括操作が配列ではありません');
    let result=parseContractWork(raw);
    for(const child of op.operations) result=operateContractWork(result,child);
    if(Array.isArray(op.clearDraftKeys)) result.contract.draft.inputs=result.contract.draft.inputs.filter(x=>!op.clearDraftKeys.includes(x.key));
    return parseContractWork(result);
  }
  const work = parseContractWork(raw), c = work.contract, es = elementMap(work.scene);
  const occurrence = () => get(c.occurrences, op.occurrence, '出現');
  const syncOccurrence = o => {
    const p = es.get(o.anchor).appearance.position;
    es.get(o.label).appearance.position = add(p, o.labelOffset);
    es.get(o.port).appearance.position = add(p, o.portOffset);
    setLabel(es.get(o.label), o.labelOverride ?? get(c.targets, o.target, '対象').name);
    for (const id of [o.anchor,o.label,o.port]) es.get(id).appearance.frames = clone(o.frames);
  };
  if (['delete-occurrence','delete-target','delete-relation'].includes(op.type)) {
    detachForDeletion(work,op);
  } else if (op.type === 'restore-detached') {
    restoreDetached(work,op.record);
  } else if (op.type === 'create-point') {
    const target = {id:makeUuid(),name:typeof op.name==='string'?op.name:'新しい対象',epistemic:'undetermined'};
    const position = op.position ?? [c.occurrences.length*6,0,0]; check(vector(position),'位置が不正です');
    const o = {id:makeUuid(),target:target.id,anchor:makeUuid(),label:makeUuid(),port:makeUuid(),labelOffset:[0,1,0],portOffset:[1,0,0],frames:[0]};
    c.targets.push(target);c.occurrences.push(o);
    work.scene.points.push(makePoint(o.anchor,clone(position)),makePoint(o.label,add(position,o.labelOffset),target.name,'none'),makePoint(o.port,add(position,o.portOffset),'','none'));
  } else if (op.type === 'create-relation') {
    if(op.occurrence) get(c.occurrences,op.occurrence,'出現');
    c.draft.pendingRelations.push({id:makeUuid(),participantA:op.occurrence??null,participantB:null,status:'incomplete-connection',name:typeof op.name==='string'?op.name:'新しい関係'});
  } else if (op.type === 'complete-relation') {
    const draft = get(c.draft.pendingRelations,op.pending,'未完成関係');
    const a = get(c.occurrences,op.source??draft.participantA,'始点出現'), b = get(c.occurrences,op.destination,'終点出現');
    const r = {id:draft.id,name:op.name??draft.name??'新しい関係',direction:'ordered',condition:op.condition??'',hub:makeUuid(),participants:[{id:makeUuid(),role:op.sourceRole??'起点',target:a.target,occurrence:a.id,line:makeUuid()},{id:makeUuid(),role:op.destinationRole??'接続先',target:b.target,occurrence:b.id,line:makeUuid()}],refs:[]};
    const pa=es.get(a.anchor).appearance.position,pb=es.get(b.anchor).appearance.position;
    work.scene.points.push(makePoint(r.hub,pa.map((v,i)=>(v+pb[i])/2+(i===1?3:0)),r.name));
    for(const p of r.participants) work.scene.lines.push({meta:{uuid:p.line},signification:{caption:p.role,sense:'a_to_b'},appearance:{end_a:{ref:r.hub},end_b:{ref:get(c.occurrences,p.occurrence,'出現').port},line_type:'straight',line_style:'solid',frames:[0],arrow:{primitive:'none'},caption_text:{font_size:1,pose:{front:[0,0,1],up:[0,1,0]}}}});
    c.relations.push(r);c.draft.pendingRelations=c.draft.pendingRelations.filter(x=>x.id!==draft.id);
  } else if (op.type === 'label-text') {
    const o=occurrence();
    if(op.value===null) delete o.labelOverride;
    else {check(typeof op.value==='string','出現ラベルは文字列です');o.labelOverride=op.value;}
    syncOccurrence(o);
  } else if (op.type === 'rename') {
    check(typeof op.name === 'string', '名前を文字列で入力してください');
    get(c.targets,op.target,'対象').name = op.name;
    c.occurrences.filter(o => o.target === op.target).forEach(syncOccurrence);
  } else if (op.type === 'move') {
    check(vector(op.position), '位置は有限の3数値が必要です'); const o = occurrence();
    es.get(o.anchor).appearance.position = clone(op.position); syncOccurrence(o);
  } else if (op.type === 'label-offset') {
    check(vector(op.offset), 'ラベル位置差は有限の3数値が必要です'); const o = occurrence();
    o.labelOffset = clone(op.offset); syncOccurrence(o);
  } else if (op.type === 'relation-meta') {
    const r=get(c.relations,op.relation,'関係');
    if(Object.hasOwn(op,'name')){check(typeof op.name==='string','関係名は文字列です');r.name=op.name;setLabel(es.get(r.hub),r.name);}
    if(Object.hasOwn(op,'condition')){check(typeof op.condition==='string','条件は文字列です');r.condition=op.condition;}
    if(Object.hasOwn(op,'direction')){check(['ordered','role-defined'].includes(op.direction),'未対応の方向です');r.direction=op.direction;}
  } else if (op.type === 'participant' || op.type === 'role') {
    const r = get(c.relations,op.relation,'関係'), p = get([...r.participants,...r.refs],op.slot,'参与');
    if (op.type === 'participant') {
      check(!Object.hasOwn(p,'relation'), '関係への参照先変更はこの操作では未対応です');
      const o = get(c.occurrences,op.occurrence,'出現'); check(o.target === op.target, '対象と出現が一致しません');
      p.target = op.target; p.occurrence = op.occurrence; es.get(p.line).appearance.end_b = { ref: o.port };
    } else {
      check(typeof op.role === 'string' && op.role.trim(), '役割を空にできません'); p.role = op.role; es.get(p.line).signification.caption = op.role;
    }
  } else if (op.type === 'boundary') {
    check(c.boundary, '境界がありません'); const b = op.bounds;
    check(Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[0] <= b[2] && b[1] <= b[3], '境界の範囲が不正です');
    const plate = es.get(c.boundary.aux).appearance.module.plate;
    plate.position = [(b[0]+b[2])/2,(b[1]+b[3])/2,0]; plate.size = [b[2]-b[0],b[3]-b[1]];
  } else if (op.type === 'frames') {
    const o = occurrence(), rawText = String(op.value ?? '');
    const values = rawText.split(',').map(s=>s.trim());
    const parsed = values.every(s=>/^-?\d+$/.test(s)) ? values.map(Number) : [];
    c.draft.inputs = c.draft.inputs.filter(x => !(x.occurrence === o.id && x.field === 'frames'));
    if (frameValid(parsed)) { o.frames = [...new Set(parsed)]; syncOccurrence(o); }
    else c.draft.inputs.push({ occurrence:o.id,field:'frames',raw:rawText,diagnostic:'integer--64-to-63-required',lastValid:clone(o.frames) });
  } else if (op.type === 'draft-input') {
    const rawText=op.value??op.raw;
    check(typeof op.key === 'string' && typeof rawText === 'string', '草稿入力のキーと値が必要です');
    c.draft.inputs = c.draft.inputs.filter(x=>x.key !== op.key);
    c.draft.inputs.push({ key:op.key,raw:rawText,diagnostic:'uncommitted',...(typeof op.field==='string'?{field:op.field}:{}),...(typeof op.owner==='string'?{owner:op.owner}:{}) });
  } else if (op.type === 'draft-remove' || op.type === 'discard-draft') {
    check(typeof op.key==='string','草稿のキーが必要です');c.draft.inputs=c.draft.inputs.filter(x=>x.key!==op.key);
  } else fail(`未対応の操作: ${op.type}`);
  if(Array.isArray(op.clearDraftKeys)) c.draft.inputs=c.draft.inputs.filter(x=>!op.clearDraftKeys.includes(x.key));
  return parseContractWork(work);
}

export function readContractMeaning(raw) {
  const w = parseContractWork(raw), c = w.contract, es = elementMap(w.scene);
  const os = new Map(c.occurrences.map(o=>[o.id,o]));
  const position = id => es.get(os.get(id).anchor).appearance.position;
  const boundary = c.boundary ? es.get(c.boundary.aux).appearance.module.plate : null;
  const bounds = boundary ? [boundary.position[0]-boundary.size[0]/2,boundary.position[1]-boundary.size[1]/2,boundary.position[0]+boundary.size[0]/2,boundary.position[1]+boundary.size[1]/2] : null;
  const unresolvedRelations=(c.draft.detached || []).flatMap(record=>record.content.relations.filter(r=>record.unresolvedRelationIds.includes(r.id)).map(relation=>({record:record.id,reason:record.reason,relation:clone(relation)})));
  return { targets: clone(c.targets), relations: [...clone(c.relations),...unresolvedRelations.map(x=>clone(x.relation))], unresolvedRelations, priorities: c.axis ? Object.fromEntries(c.axis.occurrences.map(id=>[id,position(id)[c.axis.dimension]])) : {}, bounds, members: c.boundary ? c.boundary.membersFrom.filter(id=>{ const [x,y] = position(id); return x>=bounds[0]&&x<=bounds[2]&&y>=bounds[1]&&y<=bounds[3]; }) : [], draft: clone(c.draft), uninterpretedSources: c.sources.filter(s=>s.status === 'uninterpreted').length };
}
export function inspectContractWork(raw, uuid) {
  const w = parseContractWork(raw), c = w.contract;
  const o = c.occurrences.find(o=>[o.id,o.anchor,o.label,o.port].includes(uuid));
  if (o) return { kind:'occurrence',occurrence:clone(o),target:clone(get(c.targets,o.target,'対象')),position:clone(elementMap(w.scene).get(o.anchor).appearance.position),semanticPosition:!!c.axis?.occurrences.includes(o.id),boundaryParticipant:!!c.boundary?.membersFrom.includes(o.id) };
  const r = c.relations.find(r=>[r.id,r.hub,...r.participants.map(p=>p.line),...r.refs.map(p=>p.line)].includes(uuid));
  if (r) return { kind:'relation',relation:clone(r) };
  if (c.boundary?.aux === uuid) return { kind:'boundary',boundary:clone(c.boundary),bounds:readContractMeaning(w).bounds };
  return null;
}
export function compareContractWork(raw) {
  const w = parseContractWork(raw);
  const comparison = getWorkComparison(createWorkPackage({scene:w.scene,baselineScene:w.baselineScene,attachments:{}}));
  comparison.contractChanged = !same(w.contract,w.baselineContract);
  comparison.hasChanges ||= comparison.contractChanged;
  comparison.notice = `対象・出現・役割・草稿を図と一緒に比較・保存します。契約変更: ${comparison.contractChanged ? 'あり' : 'なし'}。未解釈の原資料は原文保持です。`;
  comparison.mappingStatus = 'recognized-contract';
  return comparison;
}
