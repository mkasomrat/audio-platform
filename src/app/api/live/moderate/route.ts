import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { getCaller, canModerate } from "@/lib/live/auth";
import { muteAudio, removeParticipant, setCanPublish } from "@/lib/livekit/server";
import { capacity } from "@/config/quotas";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const body = z.object({ broadcastId: z.string().uuid(), action: z.enum(["approve", "reject", "revoke", "mute", "kick", "promote"]), requestId: z.string().uuid().optional(), identity: z.string().max(100).optional(), name: z.string().max(40).optional() });

export async function POST(req: Request) {
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { broadcastId, action, requestId } = p.data;
  const { supabase, user } = await getCaller();
  if (!user || !(await canModerate(supabase, broadcastId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!(await rateLimit(req, "moderate", 120, 60))) return NextResponse.json({ error: "Slow down." }, { status: 429 });

  const db = adminClient();
  const { data: b } = await db.from("broadcasts").select("status,livekit_room_name").eq("id", broadcastId).maybeSingle();
  if (!b || b.status !== "live" || !b.livekit_room_name) return NextResponse.json({ error: "This broadcast isn't live." }, { status: 409 });
  const room = b.livekit_room_name, now = new Date().toISOString();
  let identity = p.data.identity ?? "";
  const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
  const speakerCount = async () => (await db.from("speaker_requests").select("*", { count: "exact", head: true }).eq("broadcast_id", broadcastId).eq("status", "approved")).count ?? 0;

  try {
    if (action === "approve" || action === "reject") {
      if (!requestId) return fail("Missing request.");
      const { data: r } = await db.from("speaker_requests").select("id,participant_identity,status").eq("id", requestId).eq("broadcast_id", broadcastId).maybeSingle();
      if (!r || r.status !== "pending") return fail("That request is no longer pending.", 409);
      if (action === "reject") { await db.from("speaker_requests").update({ status: "rejected", decided_by: user.id, decided_at: now }).eq("id", r.id); return NextResponse.json({ ok: true }); }
      if ((await speakerCount()) >= capacity.maxSpeakers) return fail(`The speaker limit (${capacity.maxSpeakers}) is reached. Remove a speaker first.`, 409);
      try { await setCanPublish(room, r.participant_identity, true); }
      catch { await db.from("speaker_requests").update({ status: "cancelled", decided_at: now }).eq("id", r.id); return fail("That listener has left.", 404); }
      await db.from("speaker_requests").update({ status: "approved", decided_by: user.id, decided_at: now }).eq("id", r.id);
    } else if (action === "promote") {
      if (!identity) return fail("Missing listener.");
      if ((await speakerCount()) >= capacity.maxSpeakers) return fail(`The speaker limit (${capacity.maxSpeakers}) is reached.`, 409);
      await setCanPublish(room, identity, true);
      await db.from("speaker_requests").update({ status: "cancelled", decided_at: now }).eq("broadcast_id", broadcastId).eq("participant_identity", identity).eq("status", "pending");
      await db.from("speaker_requests").insert({ broadcast_id: broadcastId, participant_identity: identity, display_name: p.data.name || "Listener", status: "approved", decided_by: user.id, decided_at: now });
    } else {
      if (!identity && requestId) identity = (await db.from("speaker_requests").select("participant_identity").eq("id", requestId).maybeSingle()).data?.participant_identity ?? "";
      if (!identity) return fail("Missing participant.");
      if (identity.startsWith("host-")) return fail("The host can't be changed here.", 403);
      if (action === "mute") { const n = await muteAudio(room, identity); return NextResponse.json({ ok: true, muted: n }); }
      if (action === "revoke") await setCanPublish(room, identity, false).catch(() => {});
      if (action === "kick") await removeParticipant(room, identity).catch(() => {});
      await db.from("speaker_requests").update({ status: "revoked", decided_by: user.id, decided_at: now }).eq("broadcast_id", broadcastId).eq("participant_identity", identity).in("status", ["approved", "pending"]);
      if (action === "kick") await logAudit(supabase, user.id, "live.kick", "broadcast", broadcastId, { identity });
    }
  } catch (e: any) { return fail(`The live service rejected the change: ${String(e.message ?? e).slice(0, 120)}`, 502); }
  return NextResponse.json({ ok: true });
}
