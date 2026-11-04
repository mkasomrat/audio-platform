import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { deleteRecording, refreshRecording, verifyFormat } from "./actions";

const warning = (r: { status: string; temp_deleted: boolean; archive_status: string }) =>
  r.status === "ready" && !r.temp_deleted && r.archive_status !== "verified"
    ? "This recording has NOT been archived. Deleting it permanently removes the only copy of the audio. This can't be undone."
    : r.status === "ready" && !r.temp_deleted
      ? "The temporary file will be permanently removed. The Dropbox copy and its link are not touched."
      : "The recording record will be removed. This can't be undone.";

const mb = (n: number | null) => (n ? `${(n / 1048576).toFixed(1)} MB` : "unknown");
const dur = (s: number | null) => (s ? `${Math.floor(s / 60)} min ${s % 60}s` : "unknown");

export default async function Recordings({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data } = await db.from("recordings").select("id,status,archive_status,created_at,file_size_bytes,duration_seconds,audio_bitrate_kbps,audio_channels,audio_format,codec,format_verified,error_message,temp_deleted,broadcasts(title)").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Recordings</h1>
      {sp.error && <p role="alert" className="mb-3 text-sm font-medium text-danger">{sp.error}</p>}
      {sp.ok && <p role="status" className="mb-3 text-sm font-medium text-brand">{sp.ok}</p>}
      {!data?.length ? <EmptyState title="No recordings yet" hint="A recording is created automatically when a live broadcast starts. Finished recordings are archived to Dropbox from here." /> :
        <div className="space-y-3">{data.map((r) => (
          <Card key={r.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={r.status === "failed" ? "live" : r.status === "ready" ? "brand" : "neutral"}>{r.status}</Badge>{r.format_verified && <Badge tone="brand">OGG/Opus verified</Badge>}<span className="text-sm text-muted">{formatDateTime(r.created_at)}</span></div>
            <p className="font-semibold">{(r.broadcasts as unknown as { title: string } | null)?.title ?? "Unlinked recording"}</p>
            <p className="text-sm text-muted">Length {dur(r.duration_seconds)} · Size {mb(r.file_size_bytes)} · Measured bitrate {r.audio_bitrate_kbps ? `${r.audio_bitrate_kbps} kbps` : "unknown"} · Format: {r.format_verified ? `${r.audio_format}/${r.codec}${r.audio_channels ? `, ${r.audio_channels} ch` : ""}` : "not checked yet (requested OGG/Opus)"}</p>
            {r.error_message && <p className="text-sm text-danger">{r.error_message}</p>}
            <div className="flex flex-wrap gap-2">
              {["recording", "finalizing"].includes(r.status) && <form action={refreshRecording}><input type="hidden" name="id" value={r.id} /><Button type="submit" variant="secondary" className="min-h-9 px-3">Refresh status</Button></form>}
              {r.status === "ready" && <Button href={`/admin/recordings/${r.id}`} className="min-h-9 px-3">Manage archive</Button>}
              {r.status === "ready" && !r.temp_deleted && <>
                <form action={verifyFormat}><input type="hidden" name="id" value={r.id} /><Button type="submit" variant="secondary" className="min-h-9 px-3">Check real format</Button></form>
                <Button href={`/api/admin/recordings/${r.id}/download`} variant="secondary" className="min-h-9 px-3">Download</Button></>}
              {!["recording", "finalizing"].includes(r.status) && <ConfirmForm action={deleteRecording} hidden={{ id: r.id }} buttonLabel="Delete" title="Delete this recording?" description={warning(r)} confirmLabel="Delete recording" />}
            </div>
          </Card>))}</div>}
    </>
  );
}
