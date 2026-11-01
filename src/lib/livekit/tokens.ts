import "server-only";
import { createHmac } from "node:crypto";
import { signJwt } from "./jwt";
import { livekitEnv } from "./server";

export type JoinRole = "host" | "listener";

export function joinToken(o: { identity: string; name: string; room: string; role: JoinRole; ttlSeconds: number }) {
  const env = livekitEnv();
  if (!env) throw new Error("LiveKit is not configured");
  const publish = o.role === "host";
  return signJwt({
    iss: env.key, sub: o.identity, name: o.name, metadata: JSON.stringify({ role: o.role }),
    video: { room: o.room, roomJoin: true, canSubscribe: true, canPublish: publish, canPublishData: false, ...(publish ? { canPublishSources: ["microphone"] } : {}) },
  }, env.secret, o.ttlSeconds);
}

// Proves an identity was issued by us, so nobody can raise a hand "as" another listener.
export function identityProof(identity: string) {
  const env = livekitEnv();
  if (!env) throw new Error("LiveKit is not configured");
  return createHmac("sha256", env.secret).update(`live-proof:${identity}`).digest("hex");
}
