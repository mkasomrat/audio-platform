"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { adminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { syncRecording } from "@/lib/live/lifecycle";
import { inspectOgg } from "@/lib/storage/s3";

const back = (m: string, kind: "error" | "ok" = "error"): never => redirect(`/admin/recordings?${kind}=${encodeURIComponent(m)}`);

export async function refreshRecording(fd: FormData) {
  await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id"));
  let msg = "";
  try { const r = await syncRecording(id); msg = r.updated ? `Status updated: ${r.status}.` : `LiveKit reports: ${r.status} (nothing to update yet).`; }
  catch (e: any) { return back(`Couldn't reach LiveKit: ${String(e.message ?? e).slice(0, 120)}`); }
  revalidatePath("/admin/recordings"); back(msg, "ok");
}

export async function verifyFormat(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id")), db = adminClient();
  const { data: r } = await db.from("recordings").select("temp_storage_path,status").eq("id", id).maybeSingle();
  if (!r?.temp_storage_path || r.status !== "ready") return back("The recording isn't ready yet.");
  let result;
  try { result = await inspectOgg(r.temp_storage_path); } catch { return back("Couldn't read the file from storage. Check the storage settings and that the file exists."); }
  const ok = result.isOpus;
  await db.from("recordings").update({ format_verified: ok, format_checked_at: new Date().toISOString(), audio_channels: result.channels, ...(ok ? { audio_format: "ogg", codec: "opus" } : { audio_format: result.isOgg ? "ogg" : "unknown", codec: "unknown" }) }).eq("id", id);
  await logAudit(await createClient(), user.id, "recording.verify_format", "recording", id, { ok, channels: result.channels });
  revalidatePath("/admin/recordings");
  ok ? back(`Verified: real OGG container with Opus audio (${result.channels === 1 ? "mono" : `${result.channels} channels`}).`, "ok") : back("This file is NOT OGG/Opus. Do not archive it as such.");
}
