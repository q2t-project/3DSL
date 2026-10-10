// Read-only navigation index. The graph is made from declared participation or
// explicit point references. Coordinates, labels and baseline maps never add
// graph edges. Typed IDs keep equal target/occurrence/slot names distinct.
const copy = value => structuredClone(value);
const unique = values => [...new Set(values)];
const frameValues = element => {
  const f = element?.appearance?.frames ?? element?.frames;
  return Array.isArray(f) ? [...f] : Number.isInteger(f) ? [f] : [];
};
const labelOf = (element, kind) => element?.appearance?.marker?.text?.content
  || element?.signification?.name || element?.signification?.caption
  || element?.appearance?.caption_text?.content || `${kind} ${element?.meta?.uuid ?? ''}`;
const stable = (kind, ...ids) => `${kind}:${ids.map(encodeURIComponent).join(':')}`;
const point3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

export function createReadingIndex(model) {
  const scene = model.work?.scene ?? model.rawSnapshot ?? model.scene;
  const elements = new Map(), elementKinds = new Map();
  for (const [key,kind] of [['points','point'],['lines','line'],['aux','aux']]) for (const e of scene[key] || []) {
    elements.set(e.meta.uuid,e); elementKinds.set(e.meta.uuid,kind);
  }
  const entries = new Map(), aliases = new Map(), ambiguousAliases = new Set(), graph = new Map();
  const hidden = new Set(), heldByElement = new Map(), baselineByElement = new Map(), baselineGroups = new Map();
  const allFrames = unique([0,...[...elements.values()].flatMap(frameValues)]).sort((a,b)=>a-b);
  const pointsFor = ids => ids.flatMap(id => {
    const e = elements.get(id); if (!e) return [];
    const app = e.appearance || {};
    if (elementKinds.get(id) === 'line') {
      return ['end_a','end_b'].flatMap(side => { const end=app[side]; const point=end?.ref ? elements.get(end.ref)?.appearance?.position : end?.coord; return point3(point)?[point]:[]; });
    }
    const plate = app.module?.plate;
    if (plate?.plane === 'xy' && point3(plate.position) && Array.isArray(plate.size)) {
      const [x,y,z]=plate.position,[w,h]=plate.size;
      return [[x-w/2,y-h/2,z],[x+w/2,y+h/2,z]];
    }
    return point3(app.position)?[app.position]:[];
  });
  const alias = (name,id) => {
    if (!name || ambiguousAliases.has(name)) return;
    if (aliases.has(name) && aliases.get(name)!==id) {aliases.delete(name);ambiguousAliases.add(name);}
    else aliases.set(name,id);
  };
  const add = (entry,{isHidden=false,aliasIds=[]}={}) => {
    if(entries.has(entry.id)) throw new Error(`Viewer読取IDが重複しています: ${entry.id}`);
    const sceneIds = unique(entry.sceneIds || []).filter(id=>elements.has(id));
    const points = pointsFor(sceneIds), bounds = points.length ? {
      min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),
      max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))),
    } : null;
    const sceneFrames = sceneIds.map(id=>frameValues(elements.get(id)));
    const frames = entry.frames ?? (sceneFrames.some(f=>!f.length) ? [] : unique(sceneFrames.flat()).sort((a,b)=>a-b));
    const result = {uuid:sceneIds[0] ?? null, sceneIds, frames, placed:sceneIds.length>0,
      warnings:[], details:{}, bounds, position:bounds ? bounds.min.map((n,i)=>(n+bounds.max[i])/2) : null,
      ...entry, sceneIds, frames};
    result.sceneIds=sceneIds; result.placed=sceneIds.length>0;
    if (result.uuid && !elements.has(result.uuid)) result.uuid=null;
    entries.set(result.id,result); graph.set(result.id,[]);
    if(isHidden)hidden.add(result.id);
    for(const id of aliasIds)alias(id,result.id);
    return result;
  };
  const link = (fromId,toId,data) => {
    const target=entries.get(toId);
    const edge={id:`${fromId}>${toId}:${data.slotId??data.side??data.lineUuid??''}:${data.direction??''}`,
      toId, uuid:target?.uuid??null, label:target?.label??data.targetLabel??toId,
      frames:target?.frames??[], missing:!target || !target.placed, kind:'connection',...data};
    graph.get(fromId)?.push(edge);
  };
  const contract=model.work?.contract;
  if(contract) {
    const targets=new Map(contract.targets.map(t=>[t.id,t]));
    const occIds=new Map(),relIds=new Map(),slotIds=new Map();
    const relationRecords=[...contract.relations.map(relation=>({relation,state:'current',record:null})),
      ...(contract.draft.detached||[]).flatMap(record=>record.content.relations.map(relation=>({relation,record:record.id,
        state:record.unresolvedRelationIds.includes(relation.id)?'unresolved':'archived'})))];
    for(const t of contract.targets) {
      const occurrences=contract.occurrences.filter(o=>o.target===t.id);
      add({id:stable('target',t.id),kind:'target',label:t.name||'（無名の対象）',targetId:t.id,
        sceneIds:occurrences.flatMap(o=>[o.anchor,o.label,o.port]),
        warnings:occurrences.length?[]:['対象は記録されていますが、現在の図には出現がありません。'],
        details:{target:copy(t),occurrenceIds:occurrences.map(o=>o.id)}},{isHidden:occurrences.length>0});
    }
    for(const o of contract.occurrences) {
      const t=targets.get(o.target),id=stable('occurrence',o.id);occIds.set(o.id,id);
      const semanticAxis=contract.axis?.occurrences.includes(o.id) ? {declaration:copy(contract.axis),value:model.meaning?.priorities[o.id]} : null;
      add({id,uuid:o.anchor,kind:'occurrence',label:o.labelOverride??t.name??'（無名の出現）',
        sceneIds:[o.anchor,o.label,o.port],frames:copy(o.frames),targetId:o.target,occurrenceId:o.id,
        details:{target:copy(t),occurrence:copy(o),position:copy(elements.get(o.anchor).appearance.position),axis:semanticAxis,
          boundary:contract.boundary?.membersFrom.includes(o.id)?{declaration:copy(contract.boundary),inside:model.meaning?.members.includes(o.id)}:null}},
        {aliasIds:[o.id,o.anchor,o.label,o.port]});
    }
    for(const {relation:r,state,record} of relationRecords) {
      const id=stable(state==='archived'?'archived-relation':'relation',r.id);relIds.set(r.id,id);
      add({id,uuid:state==='current'?r.hub:null,kind:state==='archived'?'archived-relation':'relation',label:r.name||'（無名の関係）',
        sceneIds:state==='current'?[r.hub,...r.participants.map(p=>p.line),...r.refs.map(p=>p.line)]:[],relationId:r.id,state,
        warnings:state==='unresolved'?['関係内容は保持されていますが、表示接続が要修復です。']:state==='archived'?['明示削除済みの保存記録です。現在の関係ではありません。']:[],
        details:{relation:copy(r),record,state}}, {aliasIds:state==='current'?[r.id,r.hub]:[r.id]});
      for(const p of [...r.participants,...r.refs]) {
        const slotId=stable(state==='archived'?'archived-slot':'slot',r.id,p.id);slotIds.set(`${r.id}\0${p.id}`,slotId);
        add({id:slotId,uuid:state==='current'?p.line:null,kind:'participation',label:`${r.name||r.id} / ${p.role}`,
          sceneIds:state==='current'?[p.line]:[],relationId:r.id,slotId:p.id,state,
          warnings:state==='current'?[]:[state==='archived'?'明示削除済み関係の保存記録です。':'表示接続が要修復の関係の参加枠です。'],
          details:{relation:copy(r),slot:copy(p),record,state}}, {isHidden:true,aliasIds:state==='current'?[p.line]:[]});
      }
    }
    for(const {relation:r,state} of relationRecords) {
      if(state==='archived')continue;
      const rid=relIds.get(r.id);
      for(const p of [...r.participants,...r.refs]) {
        const sid=slotIds.get(`${r.id}\0${p.id}`);
        const toId=p.relation ? relIds.get(p.relation)??stable('relation',p.relation) : occIds.get(p.occurrence)??stable('occurrence',p.occurrence);
        const data={kind:p.relation?'relation-reference':'participation',role:p.role,relationId:r.id,slotId:p.id,lineUuid:state==='current'?p.line:null,
          condition:r.condition,direction:r.direction,state};
        link(rid,toId,data); link(sid,rid,{...data,kind:'owning-relation'}); link(sid,toId,data);
        // Distinct participation IDs remain distinct edges, even for the same
        // target and occurrence (e.g. lender and borrower of the same person).
        if(entries.has(toId) && entries.get(toId).state!=='archived')link(toId,rid,{...data,kind:p.relation?'referenced-by':'participates-in'});
      }
    }
    for(const t of contract.targets)for(const o of contract.occurrences.filter(o=>o.target===t.id)) {
      link(stable('target',t.id),occIds.get(o.id),{kind:'occurrence',role:'この対象の出現'});
    }
    if(contract.boundary) {
      const b=contract.boundary,id=stable('boundary',b.id);
      add({id,uuid:b.aux,kind:'boundary',label:`境界 ${b.id}`,sceneIds:[b.aux],details:{boundary:copy(b),bounds:copy(model.meaning.bounds),members:copy(model.meaning.members)}},{aliasIds:[b.aux]});
    }
    for(const p of contract.draft.pendingRelations) {
      add({id:stable('draft',p.id),kind:'draft-relation',label:p.name||'未完成の関係',sceneIds:[],warnings:['未接続・未完成の関係です。確定した接続として探索しません。'],details:{draft:copy(p)}});
    }
  }
  // Non-contract scene elements keep their native identities. No mapping record
  // is allowed to turn these points into inferred semantic targets.
  for(const [uuid,element] of elements) {
    if(aliases.has(uuid))continue;
    const kind=elementKinds.get(uuid),warnings=[];
    if(kind==='line')for(const side of ['end_a','end_b'])if(element.appearance?.[side]?.coord)warnings.push(`${side} は座標端点です。同じ位置の点を接続先と推測しません。`);
    add({id:uuid,uuid,kind,label:labelOf(element,kind),sceneIds:[uuid],warnings,details:{element:copy(element)}},{aliasIds:[uuid]});
  }
  if(!contract)for(const line of scene.lines||[]) {
    const lid=line.meta.uuid;
    for(const side of ['end_a','end_b']) {
      const end=line.appearance?.[side];
      if(typeof end?.ref!=='string')continue;
      const data={kind:'scene-reference',role:side,side,lineUuid:lid,direction:line.signification?.sense??null};
      link(lid,end.ref,data);link(end.ref,lid,data);
    }
  }
  const legacy=model.legacyInfo;
  if(legacy?.display) {
    const nodes=new Map((legacy.source?.nodes||[]).map(n=>[n.id,n]));
    const relations=new Map((legacy.source?.relationships||[]).map(r=>[r.id,r]));
    const addBaseline=(uuid,record,key)=>{
      const own=baselineByElement.get(uuid)||[];own.push(record);baselineByElement.set(uuid,own);
      if(key){const ids=baselineGroups.get(key)||new Set();ids.add(uuid);baselineGroups.set(key,ids);const keys=heldByElement.get(uuid)||new Set();keys.add(key);heldByElement.set(uuid,keys);}
    };
    for(const o of legacy.display.occurrences||[])addBaseline(o.uuid,{kind:'occurrence',record:copy(o),source:o.source_node_id?copy(nodes.get(o.source_node_id)):null},
      typeof o.meaning_id==='string'?`meaning:${o.meaning_id}`:null);
    for(const r of legacy.display.source_relationships||[]) {
      const ids=unique([r.line_uuid,r.part_label_uuid,r.edition_label_uuid,...(r.uuid_values||[])].filter(Boolean));
      for(const uuid of ids)addBaseline(uuid,{kind:'relationship',record:copy(r),source:copy(relations.get(r.source_relationship_id))},`relationship:${r.source_relationship_id}`);
    }
    for(const [uuid,records] of baselineByElement) {
      const item=entries.get(aliases.get(uuid)||uuid);if(item)item.details.baselineCorrespondence={status:'baseline-only',notice:legacy.notice,records};
    }
    for(const record of legacy.unplaced||[])add({id:stable('unplaced-source',record.id),kind:'unplaced-source',label:record.name||record.label||record.id,sceneIds:[],
      warnings:['編集前の原記録にある対象です。現在の意味として採用されていることは示しません。',record.reason==='mapped-occurrence-removed'?'対応していた図形が現在の図にありません。':'対応する図形の配置記録がありません。'],
      details:{baselineSource:copy(record)}});
  }
  const resolve = id => entries.get(id) || entries.get(aliases.get(id)) || null;
  const searchText = new Map([...entries].map(([id,e])=>[id,[e.id,e.uuid,e.label,e.targetId,e.occurrenceId,e.relationId,e.slotId,
    e.details.target?.name,e.details.occurrence?.labelOverride,e.details.relation?.name,e.details.slot?.role,
    e.details.element?.signification?.name,e.details.element?.signification?.caption,
    e.details.element?.appearance?.marker?.text?.content,e.details.element?.appearance?.caption_text?.content,
    ...e.sceneIds].filter(v=>v!=null).join('\n').toLocaleLowerCase()]));
  const matching=({query='',frame=null,includeHidden=false,kind=null}={})=>{
    const q=String(query).trim().toLocaleLowerCase(),items=[];
    for(const [id,e] of entries) {
      if(!includeHidden&&hidden.has(id))continue;
      if(q&&!searchText.get(id).includes(q))continue;
      if(kind&&e.kind!==kind)continue;
      if(frame!=null&&e.frames.length&&!e.frames.includes(Number(frame)))continue;
      items.push(e);
    }
    return items;
  };
  const list=(options={})=>{const {limit=Infinity,offset=0}=options;return copy(matching(options).slice(Math.max(0,offset),Number.isFinite(limit)?Math.max(0,offset)+Math.max(0,limit):undefined));};
  return {
    allFrames, count:[...entries.keys()].filter(id=>!hidden.has(id)).length,
    list, countResults:options=>matching(options).length, searchCount:(query,options={})=>matching({...options,query}).length, search:(query,options={})=>list({...options,query}), get:id=>{const e=resolve(id);return e?copy(e):null;},
    neighbors:id=>copy(graph.get(resolve(id)?.id)||[]),
    relatedParts(id) {
      const e=resolve(id),ids=new Set();
      for(const uuid of e?.sceneIds||[])for(const key of heldByElement.get(uuid)||[])for(const related of baselineGroups.get(key)||[])ids.add(related);
      const own=new Set(e?.sceneIds||[]),items=[],missingIds=[];
      for(const uuid of ids) {if(own.has(uuid))continue;const item=resolve(uuid);if(item)items.push(copy(item));else missingIds.push(uuid);}
      return {reason:'編集前の同じ原記録に対応する図形',notice:'現在の同一対象・接続を示すものではありません。',items,missingIds};
    },
    visibility(id,{frame=null,scopeIds=null,filteredIds=null}={}) {
      const e=resolve(id);if(!e)return {visible:false,reason:'not-recorded'};
      if(!e.placed)return {visible:false,reason:e.state==='archived'?'archived':e.kind==='draft-relation'?'draft':e.state==='unresolved'?'unresolved':'unplaced'};
      if(frame!=null&&e.frames.length&&!e.frames.includes(Number(frame)))return {visible:false,reason:'frame'};
      if(scopeIds&&!e.sceneIds.some(uuid=>scopeIds.includes(uuid)))return {visible:false,reason:'scope'};
      if(filteredIds&&!e.sceneIds.some(uuid=>filteredIds.includes(uuid)))return {visible:false,reason:'filter'};
      return {visible:true,reason:null};
    },
  };
}
