import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller, canHost } from "@/lib/live/auth";
import { startBroadcast } from "@/lib/live/lifecycle";
import { livekitConfigured } from "@/lib/livekit/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(req, "live-start", 10, 60))) return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  const p = z.object({ broadcastId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { supabase, user } = await getCaller();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  if (!(await canHost(supabase, p.data.broadcastId))) return NextResponse.json({ error: "You can't start this broadcast." }, { status: 403 });
  if (!livekitConfigured()) return NextResponse.json({ error: "Live audio isn't configured yet (LiveKit keys missing)." }, { status: 503 });
  const r = await startBroadcast(p.data.broadcastId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, recording: r.recording, message: r.message });
}
