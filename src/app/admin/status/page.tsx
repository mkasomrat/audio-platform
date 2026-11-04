import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { adminClient } from "@/lib/supabase/admin";
import { capacity, maxTotalParticipants, PROVIDER_LIMITS } from "@/config/quotas";
import { listParticipants, listRooms, livekitConfigured } from "@/lib/livekit/server";
import { describeStorage, pingStorage, storageConfigured } from "@/lib/storage/s3";
import { estimateMonthlyMinutes } from "@/lib/data/usage";

export const dynamic = "force-dynamic";
type Kind = "measured" | "estimate" | "unavailable" | "setting";
type Row = { label: string; value: string; kind: Kind };

export default async function Status() {
  const rows: Row[] = [], warnings: string[] = [];
  const add = (label: string, value: string, kind: Kind) => rows.push({ label, value, kind });
  add("Participant limit (configured)", `${maxTotalParticipants} of provider cap ${PROVIDER_LIMITS.livekitMaxParticipants}`, "setting");
  add("Listener limit (configured)", String(capacity.maxListeners), "setting");
  add("Max broadcast length (configured)", `${capacity.maxBroadcastDurationMin} min`, "setting");

  let db; try { db = adminClient(); } catch { db = null; }
  if (!db) { add("Database", "Service key missing", "unavailable"); warnings.push("SUPABASE_SERVICE_ROLE_KEY is missing in Vercel."); }
  else {
    const { data: live, error } = await db.from("broadcasts").select("id,livekit_room_name").eq("status", "live");
    add("Database", error ? "Not reachable" : "Reachable", error ? "unavailable" : "measured");
    if (error) warnings.push("The database query failed.");
    if (livekitConfigured()) {
      try {
        const rooms = await listRooms(); add("LiveKit", `Reachable, ${rooms.length} active room(s)`, "measured");
        let total = 0; for (const b of live ?? []) if (b.livekit_room_name) total += (await listParticipants(b.livekit_room_name)).length;
        add("Current participants", String(total), "measured");
        if (total >= maxTotalParticipants * 0.9) warnings.push("Participants are above 90% of the configured limit.");
      } catch (e: any) { add("LiveKit", `Unreachable: ${String(e.message ?? e).slice(0, 80)}`, "unavailable"); warnings.push("LiveKit could not be reached. Live audio may be down or the keys are wrong."); }
    } else { add("LiveKit", "Not configured", "unavailable"); warnings.push("LiveKit keys are not set."); }
    if (storageConfigured()) {
      try { await pingStorage(); add("Recording storage", "Reachable", "measured"); }
      catch (e: any) {
        const code = e?.$metadata?.httpStatusCode, d = describeStorage();
        add("Recording storage", `Unreachable: ${e?.name ?? "Error"}${code ? ` (HTTP ${code})` : ""}. ${String(e?.message ?? "").slice(0, 160)}`, "unavailable");
        if (d) add("Storage settings in use", `endpoint ${d.endpoint} | region ${d.region} | bucket ${d.bucket}`, "setting");
        if (d && /supabase/i.test(d.endpoint) && !/\/storage\/v1\/s3\/?$/.test(d.endpoint)) warnings.push("The storage endpoint should end with /storage/v1/s3.");
        if (d && d.region === "auto" && /supabase/i.test(d.endpoint)) warnings.push("STORAGE_REGION is 'auto' or unset. Supabase needs its real region code (for example ap-southeast-1).");
        if (code === 403) warnings.push("HTTP 403: the access key ID or secret is wrong, or the region does not match.");
        if (code === 404 || e?.name === "NoSuchBucket") warnings.push("The bucket name was not found. Check R2_BUCKET_NAME and that the bucket exists.");
        warnings.push("Recording storage could not be reached. New recordings will fail.");
      }
    }
    else { add("Recording storage", "Not configured", "unavailable"); warnings.push("Recording storage is not configured. Shows will not be recorded."); }
    const { data: recs } = await db.from("recordings").select("status,archive_status,file_size_bytes,temp_deleted");
    const by = (f: (r: any) => boolean) => (recs ?? []).filter(f).length;
    add("Recordings: recording / finalizing", `${by((r) => r.status === "recording")} / ${by((r) => r.status === "finalizing")}`, "measured");
    add("Recordings: ready / failed", `${by((r) => r.status === "ready")} / ${by((r) => r.status === "failed")}`, "measured");
    add("Ready, not yet archived", String(by((r) => r.status === "ready" && r.archive_status !== "verified")), "measured");
    if (by((r) => r.status === "failed")) warnings.push("One or more recordings failed. See Admin > Recordings.");
    if (by((r) => r.status === "finalizing")) warnings.push("A recording is still finalizing. Use Refresh status if the webhook isn't set.");
    const used = (recs ?? []).filter((r) => r.status === "ready" && !r.temp_deleted).reduce((t, r) => t + (r.file_size_bytes ?? 0), 0);
    add("Temporary files kept (sum of recorded sizes)", `${(used / 1048576).toFixed(1)} MB of ${PROVIDER_LIMITS.supabaseFreeStorageMb.value} MB${PROVIDER_LIMITS.supabaseFreeStorageMb.verified ? "" : " (limit unverified)"}`, "estimate");
    if (used > PROVIDER_LIMITS.supabaseFreeStorageMb.value * 1048576 * 0.8) warnings.push("Temporary recordings use over 80% of the assumed storage limit. Archive and delete old ones.");
    const { count: pub } = await db.from("audio_library").select("*", { count: "exact", head: true }).eq("is_published", true);
    add("Published library items", String(pub ?? 0), "measured");
  }
  const minutes = await estimateMonthlyMinutes();
  add("Connection minutes this month", minutes === null ? "Unavailable" : `about ${minutes} of ${PROVIDER_LIMITS.livekitMonthlyMinutes.value}${PROVIDER_LIMITS.livekitMonthlyMinutes.verified ? "" : " (limit unverified)"}`, minutes === null ? "unavailable" : "estimate");
  if (minutes !== null && minutes > PROVIDER_LIMITS.livekitMonthlyMinutes.value * 0.8) warnings.push("Estimated connection minutes are above 80% of the assumed monthly allowance. Check LiveKit's dashboard.");
  add("Dropbox", "Cannot be monitored from here. Links are re-checked on each recording's archive page.", "unavailable");

  const tone = { measured: "brand", estimate: "neutral", unavailable: "live", setting: "neutral" } as const;
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">System status</h1>
      <p className="text-sm text-muted">Each line says how it was obtained: <b>measured</b> now, an <b>estimate</b>, a <b>setting</b>, or <b>unavailable</b>. Nothing here is invented.</p>
      <Card className="space-y-2"><h2 className="font-semibold">Warnings</h2>{warnings.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-danger">{warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="text-sm text-muted">No warnings from the checks above.</p>}</Card>
      <div className="space-y-2">{rows.map((r) => <Card key={r.label} className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm text-muted">{r.label}</p><p className="font-semibold">{r.value}</p></div><Badge tone={tone[r.kind]}>{r.kind}</Badge></Card>)}</div>
      <Card><h2 className="mb-1 font-semibold">Known free-tier limits</h2><p className="text-sm text-muted">The 200-listener goal is not available on free plans. See docs/FREE_TIER_LIMITATIONS.md. Never upgrade any account to a paid plan from these warnings.</p></Card>
    </div>
  );
}
