// Cloudflare Pages Functions: premium gate (dynamic route)
//
// P2-4: Minimal token verification + cookie issuance (signed HMAC: slug + exp).
// - Token source of truth is server-side env only (no client embed).
// - Cookie name: premium_pass
// - Cookie: HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7d
//
// Response policy remains: ALWAYS 200 (see P2-2).

type Env = {
  // Required for issuing/verifying cookies (HMAC-SHA256)
  PREMIUM_COOKIE_SECRET?: string;

  // Token sources (server-side only):
  // 1) JSON map: {"<slug>":["tok1","tok2"],"*":["tokAny"]}
  PREMIUM_TOKENS_JSON?: string;

  // 2) Fallback list for any slug: "tok1,tok2"
  PREMIUM_TOKEN_ANY?: string;

  // 3) Per-slug override: PREMIUM_TOKEN_<slug> = "tok1,tok2"
  //    (Accessed dynamically via env["PREMIUM_TOKEN_" + slug.toUpperCase()])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export async function onRequest(context: { request: Request; params: { slug?: string }; env: Env }): Promise<Response> {
  const req = context.request;
  const slug = String(context?.params?.slug ?? "");
  const url = new URL(req.url);
  const token = (url.searchParams.get("t") ?? "").trim();

  const cookieSecret = String(context.env.PREMIUM_COOKIE_SECRET ?? "").trim();

  const cookie = parseCookie(req.headers.get("cookie") ?? "");
  const pass = cookie["premium_pass"] ?? "";

  const canonicalPath = `/premium/${encodeURIComponent(slug)}`;
  const canonicalAbs = `https://3dsl.jp${canonicalPath}`;

  const hasPass = await verifyPass(pass, slug, cookieSecret);
  const tokenOk = token ? verifyToken(token, slug, context.env) : false;

  const ray = req.headers.get("cf-ray") ?? "";

  if (token && tokenOk && cookieSecret) {
    console.log(`[premium] result=token_ok slug=${slug} ray=${ray}`);
  }

  // Branching (single layer)
  let mode: "overview" | "full" = "overview";
  let setCookie: string | null = null;

  if (!cookieSecret) {
    // Fail-closed: without cookie secret, we must never enter full mode.
    if (token && tokenOk) {
      console.log(`[premium] result=cookie_secret_missing slug=${slug} ray=${ray}`);
    }
    mode = "overview";
  } else if (hasPass) {
    mode = "full";
  } else if (token && tokenOk) {
    mode = "full";
    setCookie = await issuePass(slug, cookieSecret);
  } else {
    mode = "overview";
    if (token && !tokenOk) {
      // Log token NG (avoid logging token value)
      // eslint-disable-next-line no-console
      console.log(`[premium] result=token_ng slug=${slug} ray=${ray}`);
    }
  }

  const isTokenUrl = token.length > 0;

  const html = mode === "full"
    ? renderShell(slug, canonicalPath, isTokenUrl, true)
    : renderOverview(slug, canonicalPath, isTokenUrl);

  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");

  // SEO policy:
  // - canonical always points to token-less URL
  // - token URL must be noindex (to prevent index explosion)
  headers.set("link", `<${canonicalAbs}>; rel="canonical"`);
  if (isTokenUrl) {
    headers.set("x-robots-tag", "noindex");
  }

  if (setCookie) {
    headers.append("set-cookie", setCookie);
  }

  return new Response(html, { status: 200, headers });
}

function renderOverview(slug: string, canonicalPath: string, isTokenUrl: boolean): string {
  const noteUrl = "https://note.com/";
  const payload = {
    slug,
    mode: "overview",
    apiBase: "/api/premium",
    viewerPeek: "/viewer/peek.html",
  };
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Premium（概要）: ${escapeHtml(slug || "overview")}</title>
  <link rel="canonical" href="https://3dsl.jp${canonicalPath}" />
  ${isTokenUrl ? `<meta name="robots" content="noindex" />` : ""}
  <link rel="stylesheet" href="/premium_app/app.css" />
</head>
<body>
  <main style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;">
    <h1>Premium（概要）</h1>
    <p>対象: <code>${escapeHtml(slug || "(empty)")}</code></p>
    <p>
      ここは premium コンテンツの<strong>概要</strong>ページや。token 無しでも到達できる正規URLとして固定する。
    </p>
    <p>
      完全版（購入者向け・拡張機能あり）は、note 有料記事内の入場リンク（token 付きURL）から入る前提。
    </p>
    <p>
      note（仮）: <a href="${noteUrl}" rel="noopener">${noteUrl}</a>
    </p>

    <hr style="margin:2rem 0;" />
    <p style="color:#444;font-size:0.95rem;">
      すでに購入済みで Cookie がある場合は、このページを再読み込みすると完全版が表示される。
    </p>
  </main>

  <div id="premium-app" data-role="premium-app"></div>
  <script>
    window.__PREMIUM__ = ${JSON.stringify(payload)};
  </script>
  <script type="module" src="/premium_app/app.js"></script>
</body>
</html>`;
}

function renderShell(slug: string, canonicalPath: string, isTokenUrl: boolean, canFetch: boolean): string {
  // NOTE: Full UI is rendered by /premium_app/app.js
  // - SEO: canonical always points to token-less URL
  // - Token URL is noindex (handled in headers + meta tag)
  const payload = {
    slug,
    mode: canFetch ? "full" : "overview",
    apiBase: "/api/premium",
    // Full mode uses the premium viewer entry (capabilities/addon injection).
    viewerPeek: "/viewer_app_premium/index.html",
  };

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Premium（完全版）: ${escapeHtml(slug || "overview")}</title>
  <link rel="canonical" href="https://3dsl.jp${canonicalPath}" />
  ${isTokenUrl ? `<meta name="robots" content="noindex" />` : ""}
  <link rel="stylesheet" href="/premium_app/app.css" />
</head>
<body>
  <div id="premium-app" data-role="premium-app"></div>
  <script>
    // minimal boot payload (no token in client)
    window.__PREMIUM__ = ${JSON.stringify(payload)};
  </script>
  <script type="module" src="/premium_app/app.js"></script>
</body>
</html>`;
}

function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    out[k] = v;
  });
  return out;
}

function verifyToken(token: string, slug: string, env: Env): boolean {
  // 1) Per-slug env: PREMIUM_TOKEN_<SLUG> = "tok1,tok2"
  const key = `PREMIUM_TOKEN_${slug.toUpperCase().replaceAll(/[^A-Z0-9_]/g, "_")}`;
  const per = String(env[key] ?? "").trim();
  if (per) {
    const list = per.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.includes(token)) return true;
  }

  // 2) JSON map: {"<slug>":[...], "*":[...]}
  const raw = env.PREMIUM_TOKENS_JSON;
  if (raw && raw.trim()) {
    try {
      const m = JSON.parse(raw) as Record<string, string[]>;
      const list = (m[slug] ?? []).concat(m["*"] ?? []);
      if (list.includes(token)) return true;
    } catch {
      // ignore parse error; fall through
    }
  }

  // 3) Any-slug fallback list
  const any = env.PREMIUM_TOKEN_ANY ?? "";
  const list = String(any)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length > 0) return list.includes(token);

  // No configured tokens => treat as NG (safe default)
  return false;
}

async function issuePass(slug: string, secret?: string): Promise<string | null> {
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 7; // 7 days
  const payload = `${slug}.${exp}`;
  const sig = await hmacSha256Hex(secret, payload);
  const value = `${payload}.${sig}`;
  // Path=/ so that /api/premium/* can also receive the pass cookie.
  return `premium_pass=${value}; Max-Age=${60 * 60 * 24 * 7}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

async function verifyPass(pass: string, slug: string, secret?: string): Promise<boolean> {
  if (!pass || !secret) return false;
  const parts = pass.split(".");
  if (parts.length !== 3) return false;

  const pSlug = parts[0];
  const expStr = parts[1];
  const sig = parts[2];

  if (pSlug !== slug) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) return false;

  const payload = `${pSlug}.${expStr}`;
  const expect = await hmacSha256Hex(secret, payload);
  return timingSafeEqual(sig, expect);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toHex(new Uint8Array(sig));
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
