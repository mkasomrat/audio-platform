import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { PlayButton } from "@/components/player/play-button";
import { formatDuration } from "@/lib/format";
import type { AudioItem } from "@/lib/data/library";
import type { Track } from "@/components/player/player-context";

export const toTrack = (a: Pick<AudioItem, "id" | "slug" | "title" | "stream_url" | "duration_seconds">): Track | null =>
  a.stream_url ? { id: a.id, slug: a.slug, title: a.title, src: a.stream_url, duration: a.duration_seconds } : null;

export function AudioCard({ a, queue }: { a: AudioItem; queue?: Track[] }) {
  const t = toTrack(a);
  return (
    <Card className="flex items-start gap-3">
      {t ? <PlayButton track={t} queue={queue} /> : <span className="size-11" />}
      <div className="min-w-0 flex-1">
        <Link href={`/library/${a.slug}`} className="block font-semibold leading-snug hover:text-brand">{a.title}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {a.audio_categories && <Badge tone="brand">{a.audio_categories.name}</Badge>}
          {formatDuration(a.duration_seconds) && <span>{formatDuration(a.duration_seconds)}</span>}
          {a.play_count > 0 && <span>{a.play_count} plays</span>}
        </div>
        {a.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.description}</p>}
      </div>
    </Card>
  );
}
