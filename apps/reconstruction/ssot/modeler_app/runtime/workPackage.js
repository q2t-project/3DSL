// Local authoring envelope. This does not adopt edits into source semantics.
// Attachments and the baseline stay verbatim; only the current geometry changes.
export const WORK_PACKAGE_FORMAT = '3dsl-modeler-work/0.1';
export const WORK_PACKAGE_MAX_BYTES = 32 * 1024 * 1024;
const SOURCE_FORMAT = 'proj4-single-work-source-map/0.1';
const DISPLAY_FORMAT = 'this-work-display-map-v1';
const encoder = new TextEncoder();
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

function fail(message) { throw new Error(`作品一式: ${message}`); }
function bytes(text) {
  if (text.length > WORK_PACKAGE_MAX_BYTES || encoder.encode(text).byteLength > WORK_PACKAGE_MAX_BYTES) {
    fail('32 MiBを超えています。内容を切り捨てずに読込み・保存を中止しました。');
  }
}

// Reject data JSON.stringify would silently drop, coerce, or execute through toJSON.
function assertJSON(value, ancestors = new Set(), depth = 0) {
  if (depth > 128) fail('入れ子が深すぎます。');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if ((!Array.isArray(value) && !plain(value)) || ancestors.has(value)) fail('循環参照またはJSONで保持できない値があります。');
  ancestors.add(value);
  if (Object.getOwnPropertySymbols(value).length) fail('JSONで保持できないキーがあります。');
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) fail('配列に欠落または追加プロパティがあります。');
    for (let i = 0; i < value.length; i++) {
      if (!own(value, i)) fail('配列に欠落があります。');
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor.enumerable || !own(descriptor, 'value')) fail('JSONで保持できないプロパティがあります。');
      assertJSON(descriptor.value, ancestors, depth + 1);
    }
    if (Object.getOwnPropertyNames(value).length !== value.length + 1) fail('配列に追加プロパティがあります。');
  } else {
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!descriptor.enumerable || !own(descriptor, 'value')) fail('JSONで保持できないプロパティがあります。');
      assertJSON(descriptor.value, ancestors, depth + 1);
    }
  }
  ancestors.delete(value);
}

function cloneJSON(value) {
  assertJSON(value);
  const text = JSON.stringify(value);
  bytes(text);
  return JSON.parse(text);
}

// Shared with the recognized contract format before any JSON serialization.
export function assertLosslessWorkJSON(value) { cloneJSON(value); return true; }

function elementId(element) {
  const id = element?.meta?.uuid ?? element?.uuid;
  if (typeof id !== 'string' || !id.trim()) fail('図の要素にUUIDがありません。');
  if (element?.meta?.uuid && element?.uuid && element.meta.uuid !== element.uuid) fail('図のUUID表記が食い違っています。');
  return id;
}

// Geometric schema validation remains the normal Modeler/Viewer validator's job.
// This shape check prevents unrelated project wrappers becoming empty geometry.
function sceneIndex(scene) {
  if (!plain(scene) || !plain(scene.document_meta)) fail('対応する3DSSの図がありません。');
  for (const key of Object.keys(scene)) {
    if (!['document_meta', 'points', 'lines', 'aux'].includes(key)) fail(`図の未対応項目「${key}」を含みます。`);
  }
  const id = scene.document_meta.document_uuid;
  if (typeof id !== 'string' || !id.trim()) fail('図のdocument_uuidがありません。');
  const index = new Map();
  for (const kind of ['points', 'lines', 'aux']) {
    if (!own(scene, kind)) continue;
    if (!Array.isArray(scene[kind])) fail(`図の${kind}が配列ではありません。`);
    for (const element of scene[kind]) {
      if (!plain(element)) fail(`図の${kind}に不正な要素があります。`);
      const uuid = elementId(element);
      if (index.has(uuid)) fail(`図のUUIDが重複しています: ${uuid}`);
      index.set(uuid, { kind, element });
    }
  }
  return index;
}

function assertPath(path) {
  if (!path || /[\\:\u0000-\u001f\u007f]/u.test(path)
    || path.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(`添付の相対パスが不正です: ${path}`);
  }
}

function attachmentJSON(work, basename) {
  const entries = Object.entries(work.attachments).filter(([path]) => path.split('/').at(-1) === basename);
  if (entries.length > 1) fail(`添付の${basename}が複数あるため対応を特定できません。`);
  if (!entries.length) return null;
  try { return JSON.parse(entries[0][1]); } catch { fail(`添付の${basename}が有効なJSONではありません。`); }
}

function fixedMaps(work) {
  const source = attachmentJSON(work, 'source_map.json');
  const display = attachmentJSON(work, 'display_map.json');
  if (source?.format !== SOURCE_FORMAT || display?.format !== DISPLAY_FORMAT) return null;
  if (!Array.isArray(source.nodes) || !Array.isArray(source.relationships)
    || !Array.isArray(display.occurrences) || !Array.isArray(display.source_relationships)) {
    fail('既存作品の対応記録が不完全です。');
  }
  const nodes = new Map();
  const relations = new Map();
  for (const [records, target, label] of [[source.nodes, nodes, '出典要素'], [source.relationships, relations, '出典関係']]) {
    for (const record of records) {
      if (!plain(record) || typeof record.id !== 'string' || !record.id || target.has(record.id)) fail(`${label}のIDが不正または重複しています。`);
      target.set(record.id, record);
    }
  }
  const baseline = sceneIndex(work.baselineScene);
  const bindings = new Map();
  const addBinding = (uuid, sourceId, type) => {
    if (typeof uuid !== 'string' || !baseline.has(uuid)) fail(`対応記録のUUIDが編集前の図にありません: ${uuid}`);
    const binding = bindings.get(uuid) || [];
    if (!binding.some(x => x.id === sourceId && x.type === type)) binding.push({ id: sourceId, type });
    bindings.set(uuid, binding);
  };
  const mappedNodes = new Set();
  for (const occurrence of display.occurrences) {
    if (!plain(occurrence) || typeof occurrence.uuid !== 'string' || !baseline.has(occurrence.uuid)) fail('表示出現が編集前の図に対応していません。');
    if (own(occurrence, 'source_node_id')) {
      if (!nodes.has(occurrence.source_node_id)) fail(`出典要素への対応が不正です: ${occurrence.source_node_id}`);
      mappedNodes.add(occurrence.source_node_id);
      addBinding(occurrence.uuid, occurrence.source_node_id, 'node');
    }
  }
  for (const relation of display.source_relationships) {
    if (!plain(relation) || !relations.has(relation.source_relationship_id)) fail('出典関係への対応が不正です。');
    for (const key of ['line_uuid', 'part_label_uuid', 'edition_label_uuid']) {
      if (own(relation, key)) addBinding(relation[key], relation.source_relationship_id, 'relationship');
    }
    if (own(relation, 'uuid_values')) {
      if (!Array.isArray(relation.uuid_values)) fail('関係の表示UUIDが配列ではありません。');
      for (const uuid of relation.uuid_values) addBinding(uuid, relation.source_relationship_id, 'relationship');
    }
  }
  return { source, display, nodes, mappedNodes, bindings };
}

export function isWorkPackage(value) {
  return plain(value) && value.format === WORK_PACKAGE_FORMAT;
}

export function parseWorkPackage(raw) {
  let value;
  if (typeof raw === 'string') {
    bytes(raw);
    try { value = JSON.parse(raw); } catch { fail('有効なJSONではありません。'); }
  } else value = raw;
  if (!isWorkPackage(value)) fail('この一式形式には未対応です。A1・D1等は専用の入口で開いてください。');
  const work = cloneJSON(value);
  for (const key of Object.keys(work)) {
    if (!['format', 'status', 'scene', 'baselineScene', 'attachments'].includes(key)) fail(`一式の未対応項目「${key}」を含みます。`);
  }
  if (work.status !== 'comparison-draft') fail('対応する比較用の編集状態ではありません。');
  sceneIndex(work.scene);
  sceneIndex(work.baselineScene);
  if (work.scene.document_meta.document_uuid !== work.baselineScene.document_meta.document_uuid) fail('現在の図と編集前の図が別作品です。');
  if (!plain(work.attachments)) fail('添付記録がありません。');
  for (const [path, text] of Object.entries(work.attachments)) {
    assertPath(path);
    if (typeof text !== 'string') fail(`添付はUTF-8の原文として保持してください: ${path}`);
    // UTF-8 has no representation for a lone UTF-16 surrogate. Do not replace it.
    if (new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(encoder.encode(text)) !== text) fail(`添付にUTF-8で保持できない文字があります: ${path}`);
  }
  fixedMaps(work);
  return work;
}

export function createWorkPackage({ scene, baselineScene = scene, attachments = {} }) {
  return parseWorkPackage({ format: WORK_PACKAGE_FORMAT, status: 'comparison-draft', scene, baselineScene, attachments });
}

export function serializeWorkPackage(work, currentDoc) {
  const snapshot = parseWorkPackage(work);
  snapshot.scene = currentDoc;
  return parseWorkPackage(snapshot);
}

function equal(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => equal(x, b[i]));
  if (plain(a) && plain(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => own(b, k) && equal(a[k], b[k]));
  }
  return false;
}

function changedFields(before, after, prefix = '') {
  if (equal(before, after)) return [];
  if (plain(before) && plain(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key =>
      changedFields(before[key], after[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function classify(fields) {
  const categories = [...new Set(fields.map(field => {
    if (field === 'appearance.position' || field === 'position') return 'coordinate';
    if (/(^|\.)(end_a|end_b)(\.|$)/u.test(field)) return 'endpoint';
    if (/(^|\.)frames$/u.test(field)) return 'frames';
    if (/^(signification\.name|appearance\.marker\.text\.content|appearance\.caption_text\.content)$/u.test(field)) return 'label';
    return 'other';
  }))];
  return { categories, classification: categories.length === 1 && categories[0] === 'coordinate' ? 'coordinate-only'
    : categories.length === 1 ? categories[0] : 'mixed' };
}

export function getUnplacedSourceRecords(work, currentDoc = work.scene) {
  const snapshot = serializeWorkPackage(work, currentDoc);
  const maps = fixedMaps(snapshot);
  const current = sceneIndex(snapshot.scene);
  return unplacedSourceRecords(maps, current);
}

function unplacedSourceRecords(maps, current) {
  if (!maps) return [];
  const liveNodes = new Set(maps.display.occurrences.filter(o => current.has(o.uuid)).map(o => o.source_node_id).filter(Boolean));
  return [...maps.nodes.values()].filter(node => !liveNodes.has(node.id)).map(node => ({
    ...node,
    reason: maps.mappedNodes.has(node.id) ? 'mapped-occurrence-removed' : 'no-source-node-occurrence',
  }));
}

// Navigation may join distinct labels, anchors and ports only when the received
// map explicitly assigns the same meaning_id. Names and coordinates are unused.
export function getOccurrenceGroups(work) {
  const snapshot = parseWorkPackage(work);
  const maps = fixedMaps(snapshot);
  return occurrenceGroups(maps);
}

function occurrenceGroups(maps) {
  if (!maps) return [];
  const groups = new Map();
  for (const occurrence of maps.display.occurrences) {
    if (typeof occurrence.meaning_id !== 'string' || !occurrence.meaning_id) continue;
    const uuids = groups.get(occurrence.meaning_id) || new Set();
    uuids.add(occurrence.uuid);
    groups.set(occurrence.meaning_id, uuids);
  }
  return [...groups].map(([meaningId, uuids]) => ({ meaningId, uuids: [...uuids] }));
}

export function getWorkComparison(work, currentDoc = work.scene) {
  const snapshot = serializeWorkPackage(work, currentDoc);
  const before = sceneIndex(snapshot.baselineScene);
  const after = sceneIndex(snapshot.scene);
  const maps = fixedMaps(snapshot);
  return workComparison(snapshot.baselineScene, snapshot.scene, before, after, maps);
}

function workComparison(baselineScene, currentScene, before, after, maps) {
  const added = [], removed = [], changed = [];
  const describe = (id, entry, fields = []) => ({
    id, kind: entry.kind, fields, ...classify(fields),
    mappedSourceIds: (maps?.bindings.get(id) || []).map(binding => binding.id),
    mappedSources: maps?.bindings.get(id) || [],
    sourceBound: !!maps?.bindings.has(id),
  });
  for (const [id, entry] of before) {
    const next = after.get(id);
    if (!next) removed.push(describe(id, entry));
    else {
      const fields = changedFields(entry.element, next.element);
      if (entry.kind !== next.kind) fields.unshift('element-kind');
      if (fields.length) changed.push(describe(id, next, fields));
    }
  }
  for (const [id, entry] of after) if (!before.has(id)) added.push(describe(id, entry));
  const metadataFields = changedFields(baselineScene.document_meta, currentScene.document_meta, 'document_meta');
  const counts = { added: added.length, removed: removed.length, changed: changed.length,
    coordinateOnly: changed.filter(item => item.classification === 'coordinate-only').length,
    sourceBoundChanged: [...removed, ...changed].filter(item => item.sourceBound).length,
    metadataChanged: metadataFields.length,
    before: { points: 0, lines: 0, aux: 0 }, after: { points: 0, lines: 0, aux: 0 } };
  for (const { kind } of before.values()) counts.before[kind]++;
  for (const { kind } of after.values()) counts.after[kind]++;
  return {
    status: 'comparison-draft', added, removed, changed, metadataFields, counts,
    hasChanges: !!(added.length || removed.length || changed.length || metadataFields.length),
    mappingStatus: maps ? 'baseline-correspondence' : 'opaque-attachments',
    notice: '比較用の編集。出典・対応記録は編集前の図に対する原記録です。配置・ラベル・端点・表示の変更から意味の変更を推定せず、原記録へ自動採用しません。',
  };
}

// An accepted work has immutable authoring context while core owns its changing
// scene. Keep one validated, isolated context for UI reads. Public parse/save
// functions above still validate complete envelopes on every call.
export function createWorkReadContext(raw) {
  const snapshot = parseWorkPackage(raw);
  const maps = fixedMaps(snapshot);
  const before = sceneIndex(snapshot.baselineScene);
  const groups = occurrenceGroups(maps);
  const copy = value => JSON.parse(JSON.stringify(value));
  const contextBytes = encoder.encode(JSON.stringify({ ...snapshot, scene: null })).byteLength - 4;
  const current = doc => {
    // Retain all current-scene JSON/shape/UUID checks, including caller mutation.
    const scene = cloneJSON(doc);
    if (contextBytes + encoder.encode(JSON.stringify(scene)).byteLength > WORK_PACKAGE_MAX_BYTES) {
      fail('32 MiBを超えています。内容を切り捨てずに読込み・保存を中止しました。');
    }
    const index = sceneIndex(scene);
    if (scene.document_meta.document_uuid !== snapshot.baselineScene.document_meta.document_uuid) {
      fail('現在の図と編集前の図が別作品です。');
    }
    return { scene, index };
  };
  return {
    // Save context is separate from the private snapshot: read callers cannot
    // alter the baseline, mappings, or node records retained by these closures.
    work: copy(snapshot),
    getOccurrenceGroups: () => copy(groups),
    getUnplacedSourceRecords(doc = snapshot.scene) {
      const { index } = current(doc);
      return copy(unplacedSourceRecords(maps, index));
    },
    getWorkComparison(doc = snapshot.scene) {
      const { scene, index } = current(doc);
      return copy(workComparison(snapshot.baselineScene, scene, before, index, maps));
    },
  };
}
