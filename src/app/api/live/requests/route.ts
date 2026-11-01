import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCaller, canModerate } from "@/lib/live/auth";
import { listParticipants } from "@/lib/livekit/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("broadcastId") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { supabase, user } = await getCaller();
  if (!user || !(await canModerate(supabase, id))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!(await rateLimit(req, "requests", 90, 60))) return NextResponse.json({ error: "Slow down." }, { status: 429 });
  const db = adminClient();
  const { data: b } = await db.from("broadcasts").select("status,livekit_room_name").eq("id", id).maybeSingle();
  const { data: rows } = await db.from("speaker_requests").select("id,participant_identity,display_name,status,created_at").eq("broadcast_id", id).in("status", ["pending", "approved"]).order("created_at");
  let listeners: { identity: string; name: string }[] = [], total = 0, error: string | null = null;
  if (b?.status === "live" && b.livekit_room_name) {
    try {
      const ps = await listParticipants(b.livekit_room_name);
      total = ps.length;
      listeners = ps.filter((x) => !x.canPublish).slice(0, 100).map((x) => ({ identity: x.identity, name: x.name || "Listener" }));
    } catch { error = "Couldn't read the live room."; }
  }
  return NextResponse.json({ status: b?.status ?? "unknown", pending: (rows ?? []).filter((r) => r.status === "pending"), speakers: (rows ?? []).filter((r) => r.status === "approved"), listeners, total, error });
}
