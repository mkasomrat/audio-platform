import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { getCaller, canHost } from "@/lib/live/auth";
import { endBroadcast } from "@/lib/live/lifecycle";
import { listParticipants, livekitConfigured, livekitEnv } from "@/lib/livekit/server";
import { identityProof, joinToken } from "@/lib/livekit/tokens";
import { capacity, maxTotalParticipants } from "@/config/quotas";
import { rateLimit } from "@/lib/rate-limit";

const body = z.object({ broadcastId: z.string().uuid(), mode: z.enum(["listen", "host"]).default("listen"), name: z.string().trim().max(40).optional() });

export async function POST(req: Request) {
  if (!(await rateLimit(req, "live-token", 30, 60))) return NextResponse.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!livekitConfigured()) return NextResponse.json({ error: "Live audio isn't available right now." }, { status: 503 });

  const db = adminClient();
  const { data: b } = await db.from("broadcasts").select("id,status,is_public,started_at,livekit_room_name").eq("id", p.data.broadcastId).maybeSingle();
  if (!b || b.status !== "live" || !b.livekit_room_name) return NextResponse.json({ error: "This broadcast isn't live." }, { status: 409 });
  if (b.started_at && Date.now() - new Date(b.started_at).getTime() > capacity.maxBroadcastDurationMin * 60_000) {
    await endBroadcast(b.id);
    return NextResponse.json({ error: "This broadcast reached its maximum length and has ended." }, { status: 410 });
  }

  const { supabase, user } = await getCaller();
  let identity: string, name: string, role: "host" | "listener" = "listener";
  if (p.data.mode === "host") {
    if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
    if (!(await canHost(supabase, b.id))) return NextResponse.json({ error: "You can't host this broadcast." }, { status: 403 });
    const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    identity = `host-${user.id}`; name = prof?.display_name ?? "Host"; role = "host";
  } else {
    if (!b.is_public && !user) return NextResponse.json({ error: "Log in to join this broadcast." }, { status: 401 });
    let participants;
    try { participants = await listParticipants(b.livekit_room_name); } catch { return NextResponse.json({ error: "Live audio is temporarily unavailable." }, { status: 503 }); }
    const listeners = participants.filter((x) => !x.canPublish).length;
    if (listeners >= capacity.maxListeners || participants.length >= maxTotalParticipants)
      return NextResponse.json({ code: "capacity", error: "This broadcast is full right now. Please try again in a few minutes." }, { status: 409 });
    identity = user ? `user-${user.id}` : `guest-${randomUUID()}`;
    name = p.data.name || (user ? (await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()).data?.display_name : null) || "Listener";
  }
  const ttl = (capacity.maxBroadcastDurationMin + 30) * 60;
  await db.from("broadcast_participants").insert({ broadcast_id: b.id, user_id: user?.id ?? null, participant_identity: identity, role });
  return NextResponse.json({ token: joinToken({ identity, name, room: b.livekit_room_name, role, ttlSeconds: ttl }), url: livekitEnv()!.wsUrl, identity, proof: identityProof(identity), role });
}
