import { NextResponse } from "next/server";
import { z } from "zod";
import { getCaller, canHost } from "@/lib/live/auth";
import { endBroadcast } from "@/lib/live/lifecycle";

export async function POST(req: Request) {
  const p = z.object({ broadcastId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { supabase, user } = await getCaller();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  if (!(await canHost(supabase, p.data.broadcastId))) return NextResponse.json({ error: "You can't end this broadcast." }, { status: 403 });
  const r = await endBroadcast(p.data.broadcastId);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
