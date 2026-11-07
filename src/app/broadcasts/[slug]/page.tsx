import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, ErrorState, LiveBadge } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { getBroadcast } from "@/lib/data/broadcasts";
import { Countdown } from "@/components/broadcasts/countdown";
import { ListenerPlayer } from "@/components/live/listener-player";
import { formatDateTime } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getBroadcast(slug);
  return { title: data?.title ?? "Broadcast" };
}

export default async function BroadcastPage({ params }: Props) {
  const { slug } = await params;
  const { data: b, error } = await getBroadcast(slug);
  if (error) return <ErrorState title="Couldn't load this broadcast" hint={error} />;
  if (!b) notFound();
  const note = b.status === "ended" ? "Finished shows appear in the audio library once an administrator archives them." : "This broadcast is not available.";
  return (
    <article className="max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {b.status === "live" ? <LiveBadge /> : <Badge>{b.status === "ended" ? "Finished" : b.status === "cancelled" ? "Cancelled" : "Scheduled"}</Badge>}
        {b.broadcast_categories && <Badge tone="brand">{b.broadcast_categories.name}</Badge>}
      </div>
      <h1 className="text-4xl font-extrabold leading-tight">{b.title}</h1>
      <p className="text-muted">{b.hosts.length ? `Hosted by ${b.hosts.join(", ")} · ` : ""}{formatDateTime(b.scheduled_at ?? b.started_at)}</p>
      {b.description && <p className="whitespace-pre-line text-lg">{b.description}</p>}
      {b.status === "scheduled" && b.scheduled_at && <Countdown startsAt={b.scheduled_at} title={b.title} />}
      {b.status === "live" || b.status === "scheduled" ? <ListenerPlayer broadcastId={b.id} initialStatus={b.status} /> : <Card><p className="text-sm text-muted">{note}</p></Card>}
    </article>
  );
}
