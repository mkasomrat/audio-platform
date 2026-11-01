import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { listParticipants, livekitConfigured } from "@/lib/livekit/server";
import { capacity } from "@/config/quotas";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("broadcastId") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!(await rateLimit(req, "status", 60, 60))) return NextResponse.json({ error: "Slow down." }, { status: 429 });
  const { data: b } = await adminClient().from("broadcasts").select("status,is_public,livekit_room_name").eq("id", id).maybeSingle();
  if (!b || (!b.is_public && b.status !== "live" && b.status !== "scheduled")) return NextResponse.json({ status: "unknown" });
  let listeners: number | null = null;
  if (b.status === "live" && b.livekit_room_name && livekitConfigured()) {
    try { listeners = (await listParticipants(b.livekit_room_name)).filter((p) => !p.canPublish).length; } catch { /* leave null = unavailable */ }
  }
  return NextResponse.json({ status: b.status, listeners, maxListeners: capacity.maxListeners });
}
