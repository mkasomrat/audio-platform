import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge, LiveBadge } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import type { Broadcast } from "@/lib/data/broadcasts";

export function BroadcastCard({ b }: { b: Broadcast }) {
  const when = b.status === "ended" ? b.ended_at : b.status === "live" ? b.started_at : b.scheduled_at;
  return (
    <Link href={`/broadcasts/${b.slug}`} className="block rounded-xl focus-visible:outline-offset-4">
      <Card className="h-full transition hover:border-brand">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {b.status === "live" ? <LiveBadge /> : <Badge>{b.status === "ended" ? "Finished" : "Scheduled"}</Badge>}
          {b.broadcast_categories && <Badge tone="brand">{b.broadcast_categories.name}</Badge>}
        </div>
        <h3 className="text-lg font-semibold leading-snug">{b.title}</h3>
        {b.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{b.description}</p>}
        <p className="mt-3 text-sm text-muted">{formatDateTime(when)}</p>
      </Card>
    </Link>
  );
}
