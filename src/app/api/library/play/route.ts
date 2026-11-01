import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

// Counts a play only after the client reports 30+ seconds of real listening; max one count per person per item per hour.
export async function POST(req: Request) {
  const p = z.object({ audioId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await rateLimit(req, `play-${p.data.audioId}`, 1, 3600))) return NextResponse.json({ ok: true, counted: false });
  const { error } = await adminClient().rpc("increment_play_count", { _audio: p.data.audioId });
  return NextResponse.json({ ok: !error, counted: !error });
}
