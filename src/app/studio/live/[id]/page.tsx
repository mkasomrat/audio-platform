import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StudioLive } from "@/components/live/studio-live";
import { ModerationPanel } from "@/components/live/moderation-panel";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { canHost, canModerate } from "@/lib/live/auth";
import { capacity } from "@/config/quotas";
import { livekitConfigured } from "@/lib/livekit/server";
import { storageConfigured } from "@/lib/storage/s3";

export default async function LiveStudio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await createClient();
  const { data: b } = await db.from("broadcasts").select("id,title,status,started_at,recording_enabled,slug").eq("id", id).maybeSingle();
  if (!b) notFound();
  const host = await canHost(db, id);
  if (!host && !(await canModerate(db, id))) notFound();
  return (
    <div className="max-w-xl space-y-4">
      {host && !livekitConfigured() && <Card><p role="alert" className="text-sm text-danger">Live audio isn&rsquo;t configured: LiveKit keys are missing in Vercel. See docs/LIVEKIT_SETUP.md.</p></Card>}
      {host && b.recording_enabled && !storageConfigured() && <Card><p role="alert" className="text-sm text-danger">Recording storage isn&rsquo;t configured. You can go live, but nothing will be recorded. See docs/RECORDING_SETUP.md.</p></Card>}
      {host
        ? <StudioLive broadcastId={b.id} title={b.title} status={b.status} startedAt={b.started_at} maxMinutes={capacity.maxBroadcastDurationMin} recordingEnabled={b.recording_enabled} />
        : <><h1 className="text-2xl font-bold">{b.title}</h1><ModerationPanel broadcastId={b.id} live={b.status === "live"} /></>}
      <Button href={`/broadcasts/${b.slug}`} variant="ghost">View public page</Button>
    </div>
  );
}
