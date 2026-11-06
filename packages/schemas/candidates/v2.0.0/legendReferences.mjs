// HG-V1 candidate-only structural check; not installed in the production validator.
// Run JSON Schema validation first. This checks declared references, not whether
// an authored semantic interpretation is correct or visually understandable.
export function checkLegendReferences(document) {
  const errors = [];
  const entries = Array.isArray(document?.visual_legend) ? document.visual_legend : [];
  const byId = new Map();
  const issue = (instancePath, message) => errors.push({ instancePath, keyword: 'visualLegend', message });
  const readable = value => typeof value === 'string'
    ? value.trim().length > 0
    : value && typeof value === 'object' && Object.values(value).some(text => typeof text === 'string' && text.trim().length > 0);
  entries.forEach((entry, index) => {
    if (byId.has(entry.id)) issue(`/visual_legend/${index}/id`, `duplicate legend ID '${entry.id}'`);
    else byId.set(entry.id, entry);
    for (const field of ['label', 'description']) {
      if (!readable(entry[field])) issue(`/visual_legend/${index}/${field}`, 'at least one nonblank reader-facing text is required');
    }
  });
  for (const [kind, supported] of [
    ['points', new Set(['point_text', 'point_marker'])],
    ['lines', new Set(['line_caption', 'line'])],
  ]) {
    const elements = Array.isArray(document?.[kind]) ? document[kind] : [];
    elements.forEach((element, elementIndex) => {
      const refs = Array.isArray(element?.meta?.legend_refs) ? element.meta.legend_refs : [];
      refs.forEach((ref, refIndex) => {
        const pointer = `/${kind}/${elementIndex}/meta/legend_refs/${refIndex}`;
        const entry = byId.get(ref);
        if (!entry) issue(pointer, `unknown legend ID '${ref}'`);
        else if (!entry.applies_to?.some(target => supported.has(target))) {
          issue(pointer, `legend '${ref}' does not apply to ${kind}`);
        }
      });
    });
  }
  return errors;
}
