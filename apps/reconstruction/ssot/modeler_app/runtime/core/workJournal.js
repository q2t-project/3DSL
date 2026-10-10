// Local edit lineage: retained across Undo, without claiming source verification
// or tamper resistance. Store changed fields/entities rather than whole works.
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const escapePath = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');

function fields(changes, scope, id, before, after, path = '') {
  if (same(before, after)) return;
  const objects = before && after && typeof before === 'object' && typeof after === 'object';
  const arrays = Array.isArray(before) && Array.isArray(after);
  if (objects && ((!Array.isArray(before) && !Array.isArray(after)) || (arrays && before.length === after.length))) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      fields(changes, scope, id, before[key], after[key], `${path}/${escapePath(key)}`);
    }
    return;
  }
  const change = { scope, ...(id === undefined ? {} : { id }), path };
  if (before !== undefined) change.before = clone(before);
  if (after !== undefined) change.after = clone(after);
  changes.push(change);
}

function entities(changes, scope, before = [], after = [], idOf = item => item.id) {
  const a = new Map(before.map(item => [idOf(item), item]));
  const b = new Map(after.map(item => [idOf(item), item]));
  for (const id of new Set([...a.keys(), ...b.keys()])) fields(changes, scope, id, a.get(id), b.get(id));
}

export function createJournalEntry(before, after, journal, action, operation = 'work-edit') {
  if (!before?.workContext || !after?.workContext) return null;
  const a = before.workContext.contract, b = after.workContext.contract;
  const changes = [];
  for (const kind of ['points', 'lines', 'aux']) entities(changes, `scene.${kind}`, before.scene?.[kind], after.scene?.[kind], item => item.meta?.uuid || item.uuid);
  fields(changes, 'scene.document_meta', undefined, before.scene?.document_meta, after.scene?.document_meta);
  for (const kind of ['targets', 'occurrences', 'relations']) entities(changes, `contract.${kind}`, a?.[kind], b?.[kind]);
  // Raw input/pending connection typing stays in ordinary Undo/save state. Only
  // content-derived detached records are retained as protected draft lineage.
  entities(changes, 'contract.draft.detached', a?.draft?.detached, b?.draft?.detached);
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    if (['targets', 'occurrences', 'relations', 'draft', 'format', 'authority', 'fixture'].includes(key)) continue;
    fields(changes, `contract.${key}`, undefined, a?.[key], b?.[key]);
  }
  if (!changes.length) return null;
  const targets = new Set(), occurrences = new Set(), relations = new Set();
  for (const change of changes) {
    if (change.scope === 'contract.targets') targets.add(change.id);
    if (change.scope === 'contract.occurrences') occurrences.add(change.id);
    if (change.scope === 'contract.relations') relations.add(change.id);
    for (const contract of [a, b]) {
      for (const occurrence of contract?.occurrences || []) {
        if (occurrences.has(occurrence.id) || [occurrence.anchor, occurrence.label, occurrence.port].includes(change.id)) {
          occurrences.add(occurrence.id); targets.add(occurrence.target);
        }
      }
      for (const relation of contract?.relations || []) {
        if (relation.hub === change.id || [...(relation.participants || []), ...(relation.refs || [])].some(slot => slot.line === change.id)) relations.add(relation.id);
      }
    }
  }
  // Relation edits reference the involved targets/occurrences even when their
  // individual objects did not change (for example a participation role edit).
  for (const contract of [a, b]) for (const relation of contract?.relations || []) if (relations.has(relation.id)) {
    for (const slot of relation.participants || []) { if (slot.target) targets.add(slot.target); if (slot.occurrence) occurrences.add(slot.occurrence); }
  }
  const operationType = typeof operation === 'string' ? operation : operation?.type;
  const sequence = (journal?.at(-1)?.sequence || 0) + 1;
  if (!Number.isSafeInteger(sequence)) throw new Error('保護記録の通し番号が上限に達しています。内容は変更していません。');
  return {
    sequence,
    at: new Date().toISOString(), action,
    operation: typeof operationType === 'string' && operationType ? operationType : 'work-edit',
    affected: { targets: [...targets].filter(Boolean).sort(), occurrences: [...occurrences].filter(Boolean).sort(), relations: [...relations].filter(Boolean).sort() },
    changes,
  };
}
