import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/live/auth";
import { identityProof } from "@/lib/livekit/tokens";
import { rateLimit } from "@/lib/rate-limit";

const body = z.object({ broadcastId: z.string().uuid(), action: z.enum(["raise", "cancel", "status"]), identity: z.string().max(100), proof: z.string().max(100), name: z.string().trim().max(40).optional() });
const MAX_PENDING = 20;

export async function POST(req: Request) {
  if (!(await rateLimit(req, "speaker", 30, 60))) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { broadcastId, action, identity, proof, name } = p.data;
  const expected = Buffer.from(identityProof(identity)), given = Buffer.from(proof);
  if (expected.length !== given.length || !timingSafeEqual(expected, given) || identity.startsWith("host-")) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const db = adminClient();
  const { data: b } = await db.from("broadcasts").select("status").eq("id", broadcastId).maybeSingle();
  if (!b || b.status !== "live") return NextResponse.json({ error: "This broadcast isn't live." }, { status: 409 });
  const { data: cur } = await db.from("speaker_requests").select("id,status").eq("broadcast_id", broadcastId).eq("participant_identity", identity)
    .in("status", ["pending", "approved"]).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (action === "status") return NextResponse.json({ status: cur?.status ?? "none" });
  if (action === "cancel") {
    if (cur?.status === "pending") await db.from("speaker_requests").update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("id", cur.id);
    return NextResponse.json({ status: "none" });
  }
  if (cur) return NextResponse.json({ status: cur.status });
  const { count } = await db.from("speaker_requests").select("*", { count: "exact", head: true }).eq("broadcast_id", broadcastId).eq("status", "pending");
  if ((count ?? 0) >= MAX_PENDING) return NextResponse.json({ error: "Too many requests are waiting. Try again soon." }, { status: 429 });
  const { user } = await getCaller();
  const { error } = await db.from("speaker_requests").insert({ broadcast_id: broadcastId, participant_identity: identity, display_name: name || "Listener", user_id: user?.id ?? null });
  if (error) return NextResponse.json({ error: "Couldn't send your request." }, { status: 500 });
  return NextResponse.json({ status: "pending" });
}
