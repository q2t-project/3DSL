import type { APIRoute } from 'astro';
import { cases, isReviewPreview } from '../../../lib/conceptRepair.mjs';

export const prerender = true;
export function getStaticPaths() {
  return isReviewPreview() ? cases.map((entry) => ({ params: { case: entry.id }, props: { model: entry.model } })) : [];
}
export const GET: APIRoute = ({ props }) => new Response(`${JSON.stringify(props.model, null, 2)}\n`, {
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' },
});
