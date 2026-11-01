import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ErrorState } from "@/components/ui/feedback";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { deleteBroadcast, endLive, setStatus } from "./actions";

export default async function AdminBroadcasts() {
  const db = await createClient();
  const { data, error } = await db.from("broadcasts").select("id,title,status,scheduled_at").order("created_at", { ascending: false }).limit(100);
  if (error) return <ErrorState title="Couldn't load broadcasts" />;
  return (
    <>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-3xl font-bold">Broadcasts</h1><Button href="/studio/broadcasts/new">New broadcast</Button></div>
      {!data?.length ? <EmptyState title="No broadcasts yet" hint="Create the first one from the studio." /> : (
        <div className="space-y-3">{data.map((b) => (
          <Card key={b.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={b.status === "live" ? "live" : "neutral"}>{b.status}</Badge><span className="text-sm text-muted">{formatDateTime(b.scheduled_at)}</span></div>
            <p className="font-semibold">{b.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button href={`/studio/broadcasts/${b.id}`} variant="secondary" className="min-h-9 px-3">Edit</Button>
              {b.status === "live" && <ConfirmForm action={endLive} hidden={{ id: b.id }} buttonLabel="End now" title="End this live broadcast?" description="Everyone is disconnected and the recording is finalized." confirmLabel="End broadcast" />}
              {["draft", "scheduled", "cancelled"].filter((s) => s !== b.status).map((s) => (
                <form key={s} action={setStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={s} /><Button type="submit" variant="ghost" className="min-h-9 px-3">Mark {s}</Button></form>))}
              <ConfirmForm action={deleteBroadcast} hidden={{ id: b.id }} buttonLabel="Delete" title="Delete this broadcast?" description={`“${b.title}” and its host and request records will be permanently removed.`} confirmLabel="Delete broadcast" />
            </div>
          </Card>))}</div>)}
      <p className="mt-4 text-sm text-muted">Hosts go live from the studio. Open a live show in the studio to moderate it.</p>
    </>
  );
}
