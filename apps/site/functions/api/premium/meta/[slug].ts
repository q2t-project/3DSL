import { verifyPremiumPassFromRequest } from "../../../_lib/premiumAuth";

type Env = { PREMIUM_COOKIE_SECRET?: string };

export async function onRequest(context: {
  request: Request;
  params: { slug?: string };
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  const slug = String(context.params?.slug ?? "");
  const ray = context.request.headers.get("cf-ray") ?? "";

  const secret = String(context.env.PREMIUM_COOKIE_SECRET ?? "").trim();
  if (!secret) {
    // Fail-closed when cookie secret is missing.
    console.log(`[premium] result=cookie_secret_missing slug=${slug} ray=${ray}`);
    return new Response(JSON.stringify({ ok: false, code: "COOKIE_SECRET_MISSING" }), {
      status: 401,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const ok = await verifyPremiumPassFromRequest(context.request, slug, context.env);
  if (!ok) {
    console.log(`[premium] result=api_401 slug=${slug} ray=${ray}`);
    return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED" }), {
      status: 401,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return context.next();
}
