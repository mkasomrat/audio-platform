import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyJwt } from "@/lib/livekit/jwt";
import { livekitEnv, pick } from "@/lib/livekit/server";
import { applyEgressResult, broadcastIdFromRoom, endBroadcast } from "@/lib/live/lifecycle";

export async function POST(req: Request) {
  const env = livekitEnv();
  if (!env) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const raw = await req.text();
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const claims = verifyJwt(auth, env.secret);
  const digest = createHash("sha256").update(raw).digest();
  const claimed = String(claims?.sha256 ?? "");
  if (!claims || (claimed !== digest.toString("base64") && claimed !== digest.toString("hex")))
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const ev = JSON.parse(raw);
  try {
    if (ev.event === "egress_ended") await applyEgressResult(pick(ev, "egressInfo", "egress_info"));
    else if (ev.event === "room_finished") {
      const id = broadcastIdFromRoom(String(ev.room?.name ?? ""));
      if (id) await endBroadcast(id);
    } else if (ev.event === "participant_left") {
      const id = broadcastIdFromRoom(String(ev.room?.name ?? ""));
      if (id && ev.participant?.identity) await adminClient().from("broadcast_participants").update({ left_at: new Date().toISOString() })
        .eq("broadcast_id", id).eq("participant_identity", ev.participant.identity).is("left_at", null);
    }
  } catch (e) { console.error("webhook handling failed", e); return NextResponse.json({ error: "handler error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
