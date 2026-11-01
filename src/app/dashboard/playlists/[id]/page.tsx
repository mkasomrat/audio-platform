import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/feedback";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { PlayButton } from "@/components/player/play-button";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { deletePlaylist, removeFromPlaylist, renamePlaylist } from "@/app/library/actions";
import type { Track } from "@/components/player/player-context";

type A = { id: string; slug: string; title: string; stream_url: string | null; duration_seconds: number | null };

export default async function Playlist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user } = await requireRole(["listener", "moderator", "broadcaster", "admin", "super_admin"]);
  const db = await createClient();
  const { data: pl } = await db.from("audio_playlists").select("id,name,user_id").eq("id", id).maybeSingle();
  if (!pl || pl.user_id !== user.id) notFound();
  const { data: items } = await db.from("playlist_items").select("id,position,audio_library(id,slug,title,stream_url,duration_seconds)").eq("playlist_id", id).order("position");
  const rows = (items ?? []).map((i) => ({ item: i.id, a: i.audio_library as unknown as A | null })).filter((r): r is { item: string; a: A } => Boolean(r.a));
  const tracks = rows.map((r) => r.a.stream_url ? ({ id: r.a.id, slug: r.a.slug, title: r.a.title, src: r.a.stream_url, duration: r.a.duration_seconds } as Track) : null).filter((t): t is Track => Boolean(t));
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-3xl font-bold">{pl.name}</h1>
      <Card><ActionForm action={renamePlaylist} submitLabel="Rename"><input type="hidden" name="id" value={id} /><Input label="Playlist name" name="name" defaultValue={pl.name} required maxLength={60} /></ActionForm></Card>
      {!rows.length ? <EmptyState title="This playlist is empty" hint="Open a recording and use Add to playlist." action={<Button href="/library" variant="secondary">Browse the library</Button>} /> :
        <div className="space-y-2">{rows.map((r) => { const t = tracks.find((x) => x.id === r.a.id); return (
          <Card key={r.item} className="flex items-center gap-3">{t ? <PlayButton track={t} queue={tracks} /> : <span className="size-11" />}
            <Link href={`/library/${r.a.slug}`} className="min-w-0 flex-1 truncate font-semibold hover:text-brand">{r.a.title}</Link>
            <form action={removeFromPlaylist}><input type="hidden" name="playlistId" value={id} /><input type="hidden" name="itemId" value={r.item} /><Button type="submit" variant="ghost" className="min-h-9 px-3">Remove</Button></form></Card>); })}</div>}
      <ConfirmForm action={deletePlaylist} hidden={{ id }} buttonLabel="Delete playlist" title="Delete this playlist?" description="The playlist is removed. The recordings stay in the library." confirmLabel="Delete playlist" />
    </div>
  );
}
