// A work page can attach its diagram position to the ordinary full-Viewer link.
// The fragment stays in the browser. No model contents or account state travel.
const prefix = '#atlas-v1=';
const maxLength = 4096;

export function captureAtlasView(model, { frame, camera }, selectedId) {
  if (!model?.sourceUrl || !camera) return '';
  const meta = model.scene.document_meta;
  const view = {
    work: model.sourceUrl, document: meta.document_uuid, revision: meta.revised_at,
    frame, selectedId, camera,
  };
  const hash = prefix + encodeURIComponent(JSON.stringify(view));
  return hash.length <= maxLength ? hash : '';
}

export function readAtlasView(hash, model, index, range) {
  if (!hash?.startsWith(prefix) || hash.length > maxLength || !model.sourceUrl) return null;
  let view;
  try { view = JSON.parse(decodeURIComponent(hash.slice(prefix.length))); }
  catch { return null; }
  const meta = model.scene.document_meta;
  if (view?.work !== model.sourceUrl || view.document !== meta.document_uuid || view.revision !== meta.revised_at) return null;
  if (!range || !Number.isSafeInteger(view.frame) || view.frame < range.min || view.frame > range.max) return null;
  const entry = typeof view.selectedId === 'string' ? index.get(view.selectedId) : null;
  if (view.selectedId !== null && !entry) return null;
  const { target, distance, theta, phi, fov } = view.camera ?? {};
  const { x, y, z } = target ?? {};
  if (![x, y, z, distance, theta, phi, fov].every(Number.isFinite)
      || distance <= 0 || phi < 0 || phi > Math.PI || fov < 1 || fov > 179) return null;
  return { frame: view.frame, selectedId: entry?.id ?? null, camera: { target: { x, y, z }, distance, theta, phi, fov } };
}
