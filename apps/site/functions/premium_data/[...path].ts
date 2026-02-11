// Cloudflare Pages Functions: protect /premium_data/* from direct access (P3-1)
//
// premium_data is the raw storage for premium contents. It MUST NOT be publicly readable.
// Access should go through protected APIs, but this function also blocks direct URL access.
//
// Policy:
// - Unauthorized: return 404 (avoid oracle / enumeration).
// - Authorized (cookie pass for the slug): proxy to static asset via env.ASSETS.

import { parseCookie, verifyPass } from "../_lib/premiumAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Env = { PREMIUM_COOKIE_SECRET?: string; ASSETS?: any };

export async function onRequest(context: { request: Request; params: { path?: string[] }; env: Env }): Promise<Response> {
  const req = context.request;
  const parts = context.params?.path ?? [];
  const slug = String(parts[0] ?? "");
  if (!slug) return notFound();

  const cookie = parseCookie(req.headers.get("cookie") ?? "");
  const pass = cookie["premium_pass"] ?? "";
  const ok = await verifyPass(pass, slug, context.env.PREMIUM_COOKIE_SECRET);

  if (!ok) return notFound();

  if (!context.env.ASSETS?.fetch) {
    return new Response("ASSETS binding missing", { status: 500 });
  }
  // Proxy through to static asset
  return context.env.ASSETS.fetch(req);
}

function notFound(): Response {
  return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
}
