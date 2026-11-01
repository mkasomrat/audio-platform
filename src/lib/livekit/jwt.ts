import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const enc = (v: string | Buffer) => Buffer.from(v).toString("base64url");

export function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const head = enc(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = enc(JSON.stringify({ ...payload, nbf: now, exp: now + ttlSeconds }));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

export function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
