import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge, ErrorState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AudioCard, toTrack } from "@/components/library/audio-card";
import { PlayButton } from "@/components/player/play-button";
import { getAudio, relatedAudio } from "@/lib/data/library";
import { getSessionWithRoles } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDuration } from "@/lib/format";
import { addToPlaylist, toggleBookmark } from "../actions";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { data } = await getAudio((await params).slug); return { title: data?.title ?? "Audio" }; }

export default async function AudioPage({ params }: Props) {
  const { slug } = await params;
  const { data: a, error } = await getAudio(slug);
  if (error) return <ErrorState title="Couldn't load this recording" hint={error} />;
  if (!a) notFound();
  const track = toTrack(a);
  const [related, { user }] = [await relatedAudio(a), await getSessionWithRoles()];
  let bookmarked = false, playlists: { id: string; name: string }[] = [];
  if (user) {
    const db = await createClient();
    const [{ data: b }, { data: pl }] = await Promise.all([db.from("bookmarks").select("id").eq("user_id", user.id).eq("audio_id", a.id).maybeSingle(), db.from("audio_playlists").select("id,name").eq("user_id", user.id).order("name")]);
    bookmarked = Boolean(b); playlists = pl ?? [];
  }
  return (
    <article className="max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">{a.audio_categories && <Badge tone="brand">{a.audio_categories.name}</Badge>}{a.tags.map((t) => <Link key={t.slug} href={`/library?tag=${t.slug}`}><Badge>#{t.name}</Badge></Link>)}</div>
      <h1 className="text-4xl font-extrabold leading-tight">{a.title}</h1>
      <p className="text-sm text-muted">{formatDateTime(a.published_at)}{formatDuration(a.duration_seconds) ? ` · ${formatDuration(a.duration_seconds)}` : ""}{a.play_count > 0 ? ` · ${a.play_count} plays` : ""}</p>
      {a.description && <p className="whitespace-pre-line text-lg">{a.description}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {track ? <PlayButton track={track} label /> : <p className="text-sm text-danger">This recording has no playable link yet.</p>}
        {user && <form action={toggleBookmark}><input type="hidden" name="audioId" value={a.id} /><input type="hidden" name="slug" value={a.slug} /><Button type="submit" variant="secondary">{bookmarked ? "Remove bookmark" : "Bookmark"}</Button></form>}
      </div>
      {user ? (playlists.length > 0 ? <Card><form action={addToPlaylist} className="flex gap-2"><input type="hidden" name="audioId" value={a.id} /><input type="hidden" name="slug" value={a.slug} />
        <select name="playlistId" aria-label="Playlist" className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3">{playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><Button type="submit" variant="secondary">Add to playlist</Button></form></Card>
        : <p className="text-sm text-muted"><Link href="/dashboard/playlists" className="font-semibold text-brand">Create a playlist</Link> to save this recording.</p>)
        : <p className="text-sm text-muted"><Link href={`/login?next=/library/${a.slug}`} className="font-semibold text-brand">Log in</Link> to bookmark and make playlists. Listening needs no account.</p>}
      {related.length > 0 && <section aria-labelledby="rel"><h2 id="rel" className="mb-3 text-xl font-bold">Related recordings</h2><div className="space-y-3">{related.map((r) => <AudioCard key={r.id} a={r} />)}</div></section>}
    </article>
  );
}
