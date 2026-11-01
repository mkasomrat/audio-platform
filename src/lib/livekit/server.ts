import "server-only";
import { signJwt } from "./jwt";
import { storageEgressConfig } from "@/lib/storage/s3";

// Talks to LiveKit's documented Twirp HTTP API directly (no SDK version drift).
// Request keys use snake_case; LiveKit documents that it accepts snake_case or camelCase.
export class LiveKitError extends Error { constructor(public status: number, message: string) { super(message); } }

export function livekitEnv() {
  const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  return { wsUrl: url, host: url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), key, secret };
}
export const livekitConfigured = () => livekitEnv() !== null;

async function twirp<T = any>(service: "RoomService" | "Egress", method: string, body: object, room?: string): Promise<T> {
  const env = livekitEnv();
  if (!env) throw new LiveKitError(503, "LiveKit is not configured");
  const token = signJwt({ iss: env.key, sub: "server", video: { roomCreate: true, roomList: true, roomAdmin: true, roomRecord: true, ...(room ? { room } : {}) } }, env.secret, 60);
  const res = await fetch(`${env.host}/twirp/livekit.${service}/${method}`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
  });
  if (!res.ok) throw new LiveKitError(res.status, (await res.text().catch(() => "")).slice(0, 300));
  return res.json() as Promise<T>;
}

export const pick = (o: any, ...keys: string[]) => { for (const k of keys) if (o && o[k] !== undefined) return o[k]; return undefined; };

export async function createRoom(name: string, maxParticipants: number, emptyTimeoutSec = 600) {
  return twirp("RoomService", "CreateRoom", { name, max_participants: maxParticipants, empty_timeout: emptyTimeoutSec }, name);
}
export async function deleteRoom(name: string) {
  try { await twirp("RoomService", "DeleteRoom", { room: name }, name); } catch (e) { if (!(e instanceof LiveKitError && e.status === 404)) throw e; }
}
export type LkParticipant = { identity: string; name: string; canPublish: boolean };
export async function listParticipants(room: string): Promise<LkParticipant[]> {
  try {
    const r = await twirp("RoomService", "ListParticipants", { room }, room);
    return (r.participants ?? []).map((p: any) => ({ identity: p.identity, name: p.name ?? "", canPublish: Boolean(pick(p.permission, "canPublish", "can_publish")) }));
  } catch (e) { if (e instanceof LiveKitError && e.status === 404) return []; throw e; }
}
export async function setCanPublish(room: string, identity: string, canPublish: boolean) {
  await twirp("RoomService", "UpdateParticipant", { room, identity, permission: {
    can_subscribe: true, can_publish: canPublish, can_publish_data: false, ...(canPublish ? { can_publish_sources: ["MICROPHONE"] } : {}) } }, room);
}
export async function muteAudio(room: string, identity: string) {
  const p = await twirp("RoomService", "GetParticipant", { room, identity }, room);
  const audio = (p.tracks ?? []).filter((t: any) => t.type === "AUDIO" || t.type === 0);
  for (const t of audio) await twirp("RoomService", "MutePublishedTrack", { room, identity, track_sid: t.sid, muted: true }, room);
  return audio.length;
}
export async function removeParticipant(room: string, identity: string) {
  await twirp("RoomService", "RemoveParticipant", { room, identity }, room);
}

export async function startAudioEgress(room: string, filepath: string, targetKbps: number) {
  const s3 = storageEgressConfig();
  if (!s3) throw new LiveKitError(503, "Recording storage is not configured");
  const base = { room_name: room, audio_only: true, file_outputs: [{ file_type: "OGG", filepath, s3 }] };
  let note: string | null = null, r: any;
  try { r = await twirp("Egress", "StartRoomCompositeEgress", { ...base, advanced: { audio_bitrate: targetKbps } }); }
  catch (e) {
    if (!(e instanceof LiveKitError) || e.status >= 500 || e.status === 401 || e.status === 403) throw e;
    note = "Target bitrate was not accepted; recording uses LiveKit's default bitrate.";
    r = await twirp("Egress", "StartRoomCompositeEgress", base);
  }
  return { egressId: String(pick(r, "egressId", "egress_id")), note };
}
export async function stopEgress(egressId: string) { return twirp("Egress", "StopEgress", { egress_id: egressId }); }
export async function listEgress(egressId: string) { const r = await twirp("Egress", "ListEgress", { egress_id: egressId }); return (r.items ?? []) as any[]; }
export async function listRooms() { const r = await twirp("RoomService", "ListRooms", {}); return (r.rooms ?? []) as any[]; }
