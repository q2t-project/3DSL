import current from '../../library/26010501/model.3dss.json' with { type: 'json' };
import evidence from './evidence.json' with { type: 'json' };

export const rootUuid = evidence.concept_point.meta.uuid;
export const reviewPath = '/review/concept-repair/';
export { current, evidence };

// Restore only the one missing point. Existing points, lines and document
// metadata remain the current work; these are not whole historical rollbacks.
const conceptPoint = structuredClone(evidence.concept_point);
delete conceptPoint.appearance.marker.text.plane;
conceptPoint.appearance.marker.text.pose = { front: [0, 1, 0], up: [0, 0, 1] };
const restore = (point) => ({ ...structuredClone(current), points: [structuredClone(point), ...structuredClone(current.points)] });

export const cases = [
  { id: 'current', label: '現行・欠落あり', model: current },
  { id: 'concept', label: 'Concept を復元・推奨候補', model: restore(conceptPoint) },
  { id: 'tophello', label: 'topHello 3DSL を復元・比較用', model: restore(evidence.before_deletion_point) },
];

export function isReviewPreview(env = process.env) {
  // Local builds and identified Preview builds only. Even an accidentally
  // retained review route must not generate artifacts on main/production.
  if (env.CF_PAGES_ENV === 'production' || env.CF_PAGES_BRANCH === 'main') return false;
  return env.CF_PAGES_ENV === 'preview' || Boolean(env.CF_PAGES_BRANCH)
    || (!env.CF_PAGES && !env.CF_PAGES_URL);
}
