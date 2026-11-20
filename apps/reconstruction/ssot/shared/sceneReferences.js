// Scene references are checked after JSON Schema has checked field shapes.
const list = value => Array.isArray(value) ? value : [];
const elementId = value => value?.meta?.uuid ?? value?.uuid;
export const sceneElementKinds = Object.freeze(['points', 'lines', 'aux', 'surfaces']);
const recordKinds = ['coordinate_contexts', 'comparisons', 'quantities'];
export const sceneRootKeys = Object.freeze(['document_meta', ...sceneElementKinds, ...recordKinds, 'visual_legend']);

export function validateSceneReferences(scene) {
  const issues = [];
  const ids = new Set();
  const indexes = new Map();
  const add = (instancePath, keyword, uuid, expected, actual, message) => {
    issues.push({ instancePath, keyword, uuid, expected, actual, message });
  };
  for (const kind of [...sceneElementKinds, ...recordKinds]) {
    const index = new Map();
    indexes.set(kind, index);
    const isElement = sceneElementKinds.includes(kind);
    if (scene?.[kind] !== undefined && !Array.isArray(scene[kind])) {
      add(`/${kind}`, 'type', null, 'array', scene[kind], `${kind} must be an array`);
    }
    list(scene?.[kind]).forEach((item, position) => {
      const id = isElement ? elementId(item) : item?.id;
      const path = `/${kind}/${position}/${isElement ? 'meta/uuid' : 'id'}`;
      if (typeof id !== 'string' || !id.trim()) {
        add(path, 'required', null, 'UUID', id, 'The scene entry must have a UUID');
        return;
      }
      if (ids.has(id)) {
        add(path, 'duplicate_uuid', id, 'unique UUID', id, 'Duplicate UUID in the scene');
      }
      ids.add(id);
      index.set(id, item);
    });
  }
  const refersTo = (path, ownerId, value, kinds, expected) => {
    if (typeof value === 'string' && !kinds.some(kind => indexes.get(kind).has(value))) {
      add(path, 'unresolved_ref', ownerId, expected, value, `Reference does not resolve to an ${expected}`);
    }
  };
  const checkElementRefs = (refs, path, owner) => {
    list(refs).forEach((ref, i) => refersTo(`${path}/${i}`, owner, ref, sceneElementKinds, 'existing scene element'));
  };

  const legend = new Map();
  list(scene?.visual_legend).forEach((entry, i) => {
    if (typeof entry?.id !== 'string') return;
    if (legend.has(entry.id)) {
      add(`/visual_legend/${i}/id`, 'duplicate_legend', null, 'unique legend ID', entry.id, 'Duplicate visual legend ID');
    }
    legend.set(entry.id, entry);
  });
  for (const [kind, supported] of [
    ['points', ['point_text', 'point_marker']], ['lines', ['line_caption', 'line']], ['surfaces', ['surface']],
  ]) {
    list(scene?.[kind]).forEach((element, i) => {
      list(element?.meta?.legend_refs).forEach((ref, j) => {
        const path = `/${kind}/${i}/meta/legend_refs/${j}`;
        const entry = legend.get(ref);
        if (!entry) {
          add(path, 'unresolved_ref', elementId(element), 'existing legend ID', ref, 'Unknown visual legend ID');
        } else if (!list(entry.applies_to).some(target => supported.includes(target))) {
          add(path, 'legend_target', elementId(element), supported.join(' or '), entry.applies_to,
            'The visual legend does not apply to this element kind');
        }
      });
    });
  }

  list(scene?.lines).forEach((line, i) => {
    for (const end of ['end_a', 'end_b']) {
      const endpoint = line?.appearance?.[end] ?? line?.[end];
      const path = `/lines/${i}/appearance/${end}`;
      refersTo(`${path}/ref`, elementId(line), endpoint?.ref, ['points'], 'existing point UUID');
      refersTo(`${path}/surface_ref`, elementId(line), endpoint?.surface_ref, ['surfaces'], 'existing surface UUID');
    }
  });
  list(scene?.coordinate_contexts).forEach((context, i) => {
    checkElementRefs(context?.element_refs, `/coordinate_contexts/${i}/element_refs`, context?.id);
    const axes = new Set();
    list(context?.axes).forEach((axis, j) => {
      const direction = axis?.direction;
      if (typeof direction !== 'string') return;
      const axisName = direction.slice(1);
      if (axes.has(axisName)) {
        add(`/coordinate_contexts/${i}/axes/${j}/direction`, 'duplicate_axis', context?.id,
          'one direction per geometric axis', direction, 'The context already defines this geometric axis');
      }
      axes.add(axisName);
    });
  });
  list(scene?.comparisons).forEach((comparison, i) => {
    list(comparison?.cases).forEach((item, j) => {
      checkElementRefs(item?.element_refs, `/comparisons/${i}/cases/${j}/element_refs`, comparison?.id);
    });
  });
  list(scene?.quantities).forEach((quantity, i) => {
    const path = `/quantities/${i}`;
    refersTo(`${path}/element_ref`, quantity?.id, quantity?.element_ref, sceneElementKinds, 'existing scene element');
    refersTo(`${path}/context_ref`, quantity?.id, quantity?.context_ref, ['coordinate_contexts'], 'existing coordinate context UUID');
    const basis = quantity?.basis;
    const context = indexes.get('coordinate_contexts').get(quantity?.context_ref);
    if (context && typeof basis?.axis === 'string' && !list(context.axes).some(axis => axis?.direction === basis.axis)) {
      add(`${path}/basis/axis`, 'unresolved_ref', quantity.id, 'axis direction defined by the coordinate context',
        basis.axis, 'The quantity axis is missing from its coordinate context');
    }
    if (basis?.kind === 'event') {
      refersTo(`${path}/basis/event_ref`, quantity.id, basis.event_ref, ['points'], 'existing event point UUID');
    }
    if (basis?.kind === 'interval' && Number.isFinite(basis.start) && Number.isFinite(basis.end) && basis.end <= basis.start) {
      add(`${path}/basis/end`, 'interval_order', quantity.id, 'end after start in signed axis coordinates',
        basis.end, 'The interval must have positive length along the declared direction');
    }
  });
  return issues;
}
