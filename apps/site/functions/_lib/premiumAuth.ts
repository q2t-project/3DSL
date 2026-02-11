export type PremiumAuthEnv = {
  PREMIUM_COOKIE_SECRET?: string;
};

export function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  (header || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    out[k] = v;
  });
  return out;
}

export async function verifyPremiumPassFromRequest(req: Request, slug: string, env: PremiumAuthEnv): Promise<boolean> {
  const cookie = parseCookie(req.headers.get("cookie") || "");
  const pass = cookie["premium_pass"] || "";
  return verifyPass(pass, slug, env.PREMIUM_COOKIE_SECRET);
}

export async function verifyPass(pass: string, slug: string, secret?: string): Promise<boolean> {
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
