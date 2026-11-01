import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { capacity, maxTotalParticipants, recording } from "@/config/quotas";
import { createRoom, deleteRoom, listEgress, pick, startAudioEgress, stopEgress } from "@/lib/livekit/server";
import { storageConfigured } from "@/lib/storage/s3";

export const roomName = (id: string) => `bc-${id}`;
export const broadcastIdFromRoom = (room: string) => (room.startsWith("bc-") ? room.slice(3) : null);

export async function startBroadcast(id: string) {
  const db = adminClient();
  const { data: b } = await db.from("broadcasts").select("id,status,recording_enabled").eq("id", id).maybeSingle();
  if (!b) return { ok: false as const, status: 404, error: "Broadcast not found." };
  if (!["draft", "scheduled"].includes(b.status)) return { ok: false as const, status: 409, error: `This broadcast is ${b.status} and can't be started.` };
  const room = roomName(id);
  try { await createRoom(room, maxTotalParticipants); }
  catch (e: any) { return { ok: false as const, status: 502, error: `Couldn't create the live room: ${e.message ?? "LiveKit unavailable"}` }; }
  const { data: upd } = await db.from("broadcasts").update({ status: "live", started_at: new Date().toISOString(), ended_at: null, livekit_room_name: room })
    .eq("id", id).in("status", ["draft", "scheduled"]).select("id");
  if (!upd?.length) return { ok: false as const, status: 409, error: "This broadcast was already started." };

  let rec: "recording" | "failed" | "disabled" = "disabled", message: string | null = null;
  if (b.recording_enabled) {
    const path = `recordings/${id}/${Date.now()}.ogg`;
    try {
      if (!storageConfigured()) throw new Error("Recording storage is not configured.");
      const { egressId, note } = await startAudioEgress(room, path, recording.targetKbps);
      await db.from("recordings").insert({ broadcast_id: id, status: "recording", egress_id: egressId, original_filename: path.split("/").pop(), temp_storage_path: path, audio_format: "ogg", codec: "opus", error_message: note });
      rec = "recording"; message = note;
    } catch (e: any) {
      rec = "failed"; message = e.message ?? "Recording could not start.";
      await db.from("recordings").insert({ broadcast_id: id, status: "failed", temp_storage_path: path, error_message: message });
    }
  }
  return { ok: true as const, room, recording: rec, message };
}

export async function endBroadcast(id: string) {
  const db = adminClient();
  const { data: b } = await db.from("broadcasts").select("id,status").eq("id", id).maybeSingle();
  if (!b) return { ok: false as const, status: 404, error: "Broadcast not found." };
  if (b.status !== "live") return { ok: true as const, already: true };
  const { data: recs } = await db.from("recordings").select("id,egress_id").eq("broadcast_id", id).eq("status", "recording");
  for (const r of recs ?? []) {
    try { if (r.egress_id) await stopEgress(r.egress_id); await db.from("recordings").update({ status: "finalizing" }).eq("id", r.id); }
    catch (e: any) { await db.from("recordings").update({ status: "finalizing", error_message: `Stop request failed: ${e.message}. Use "Refresh status".` }).eq("id", r.id); }
  }
  try { await deleteRoom(roomName(id)); } catch (e) { console.error("deleteRoom failed", e); }
  const now = new Date().toISOString();
  await db.from("broadcasts").update({ status: "ended", ended_at: now }).eq("id", id).eq("status", "live");
  await db.from("broadcast_participants").update({ left_at: now }).eq("broadcast_id", id).is("left_at", null);
  await db.from("speaker_requests").update({ status: "cancelled" }).eq("broadcast_id", id).in("status", ["pending", "approved"]);
  return { ok: true as const, already: false };
}

// Called by the webhook and by "Refresh status". info = LiveKit EgressInfo (snake or camel keys).
const DONE: Record<string, "ready" | "failed"> = { EGRESS_COMPLETE: "ready", "3": "ready", EGRESS_LIMIT_REACHED: "ready", "6": "ready", EGRESS_FAILED: "failed", "4": "failed", EGRESS_ABORTED: "failed", "5": "failed" };
export async function applyEgressResult(info: any) {
  const id = String(pick(info, "egressId", "egress_id") ?? "");
  const outcome = DONE[String(info?.status)];
  if (!id || !outcome) return { updated: false, status: String(info?.status ?? "unknown") };
  const file = (pick(info, "fileResults", "file_results") ?? [])[0] ?? pick(info, "file");
  const size = Number(pick(file, "size") ?? 0) || null;
  const durationSec = Math.round(Number(pick(file, "duration") ?? 0) / 1e9) || null;
  const kbps = size && durationSec ? Math.round((size * 8) / durationSec / 1000) : null;
  const err = String(pick(info, "error") ?? "");
  const limit = ["EGRESS_LIMIT_REACHED", "6"].includes(String(info.status));
  await adminClient().from("recordings").update({
    status: outcome, file_size_bytes: size, duration_seconds: durationSec, audio_bitrate_kbps: kbps,
    error_message: outcome === "failed" ? err || "Recording failed." : limit ? "LiveKit's time limit was reached; the recording was saved up to that point." : null,
  }).eq("egress_id", id);
  return { updated: true, status: outcome };
}

export async function syncRecording(recordingId: string) {
  const db = adminClient();
  const { data: r } = await db.from("recordings").select("egress_id").eq("id", recordingId).maybeSingle();
  if (!r?.egress_id) return { updated: false, status: "no-egress" };
  const [info] = await listEgress(r.egress_id);
  return info ? applyEgressResult(info) : { updated: false, status: "not-found" };
}
