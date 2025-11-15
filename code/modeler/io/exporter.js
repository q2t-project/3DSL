export function exportModelToJSON(model, { space = 2 } = {}) {
  return JSON.stringify(model, null, space);
}
