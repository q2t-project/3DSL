// Display-group movement for the one inspected, generated knowledge/questions
// work. Equal meaning IDs, equal labels and proximity are never group evidence.
import { parseWorkPackage } from './workPackage.js';

const expected = {
  'authoring/build_model.py': '30fec6cc69bfd5677a62cbbbc18c229c8bdbe2990ce560523a44fb3cb612dd99',
  'authoring/display_map.json': 'aef1e44d819823916d3e62a42e5dd00bfae2f20cb6b42199cf94f606a3faaf4f',
  'authoring/source_map.json': 'cd2efe610310dd60d5fb7fa49bda6bcba8b6cf3737467a66238eed69e558aac6',
};
const documentUuid = 'd2263bd7-22a0-5bed-9fab-697ea789f543';
const registeredGroups = new WeakSet();
const finiteVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const fail = message => { throw new Error('表示まとまり: ' + message); };

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const unsupported = diagnostic => ({ supported: false, groups: [], diagnostics: [diagnostic] });

export async function inspectLegacyDisplayGroups(rawWork) {
  // Feature eligibility only: unrecognized documents have no card contract.
  // The caller's normal work/scene validation remains mandatory. Do not clone
  // and scan an entire unrelated work merely to return "unsupported".
  if (typeof rawWork !== 'string' && rawWork?.baselineScene?.document_meta?.document_uuid !== documentUuid) {
    return unsupported('この作品の表示まとまりは未定義です。単独要素の編集を続けられます。');
  }
  let work;
  try { work = parseWorkPackage(rawWork); }
  catch (error) { return unsupported(error.message); }
  if (work.baselineScene.document_meta.document_uuid !== documentUuid) {
    return unsupported('この作品の表示まとまりは未定義です。単独要素の編集を続けられます。');
  }
  for (const [path, digest] of Object.entries(expected)) {
    if (typeof work.attachments[path] !== 'string' || await sha256(work.attachments[path]) !== digest) {
      return unsupported('生成器または対応原文が検査済みの版と異なります: ' + path);
    }
  }
  const display = JSON.parse(work.attachments['authoring/display_map.json']);
  const anchors = new Map(display.occurrences.filter(x => x.kind === 'semantic-anchor').map(x => [x.occurrence, x]));
  const groups = new Map([...anchors].map(([id, anchor]) => [id, { id, anchor: anchor.uuid, members: [] }]));
  for (const item of display.occurrences) {
    const suffix = /^(.*):(?:text\d+|port:(?:left|right|top|bottom))$/.exec(item.occurrence);
    const group = groups.get(item.occurrence) || (suffix && groups.get(suffix[1]));
    if (group) group.members.push(item);
    else if (item.kind !== 'reading-guide') return unsupported('未分類の表示部品があります: ' + item.occurrence);
  }
  const baselinePoints = new Map(work.baselineScene.points.map(p => [p.meta.uuid, p]));
  const claimed = new Set();
  const result = [];
  for (const group of groups.values()) {
    const uuids = group.members.map(x => x.uuid);
    if (uuids.some(id => claimed.has(id) || !baselinePoints.has(id))) return unsupported('表示部品が重複するか、元の図にありません。');
    uuids.forEach(id => claimed.add(id));
    const sourceIds = [...new Set(group.members.map(x => x.source_node_id).filter(Boolean))];
    const labels = group.members.filter(x => x.kind === 'label').map(x => x.label).filter(Boolean);
    const item = Object.freeze({ id: group.id, anchor: group.anchor, uuids: Object.freeze(uuids),
      sourceIds: Object.freeze(sourceIds), label: labels[0] || group.id,
      mixedSourceReferences: sourceIds.length > 1, documentUuid,
      basis: 'verified-generator-card-members', scope: 'display-group-only',
      sharedNameBinding: false });
    registeredGroups.add(item);
    result.push(item);
  }
  return Object.freeze({ supported: true, groups: Object.freeze(result), diagnostics: Object.freeze([]) });
}

export function resolveLegacyDisplayGroup(inspection, uuid) {
  return inspection?.supported ? inspection.groups.find(group => group.uuids.includes(uuid)) || null : null;
}

export function translateLegacyDisplayGroup(scene, group, delta) {
  if (!registeredGroups.has(group)) fail('検査済みの表示まとまりではありません。');
  if (!finiteVector(delta)) fail('移動量は有限の3数値が必要です。');
  if (scene?.document_meta?.document_uuid !== group.documentUuid) fail('検査した作品と別の図です。');
  const points = new Map();
  for (const point of scene.points) {
    const id = point?.meta?.uuid;
    if (points.has(id)) fail('点のUUIDが重複しています。');
    points.set(id, point);
  }
  for (const uuid of group.uuids) {
    if (!finiteVector(points.get(uuid)?.appearance?.position)) fail('まとまりの一部がないか、位置が不正です。');
    if (!finiteVector(points.get(uuid).appearance.position.map((v, i) => v + delta[i]))) fail('移動後の位置が有限ではありません。');
  }
  const output = structuredClone(scene);
  const moving = new Set(group.uuids);
  for (const point of output.points) if (moving.has(point.meta.uuid)) {
    point.appearance.position = point.appearance.position.map((v, i) => v + delta[i]);
  }
  // Referenced endpoints follow moved ports. Line records, other cards, source
  // texts and any undeclared field stay byte/value-equivalent to the input.
  return output;
}
