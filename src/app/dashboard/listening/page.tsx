import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PlayButton } from "@/components/player/play-button";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/format";
import Link from "next/link";
import type { Track } from "@/components/player/player-context";

export const metadata: Metadata = { title: "My listening" };
type Row = { id: string; slug: string; title: string; stream_url: string | null; duration_seconds: number | null };
const track = (a: Row): Track | null => (a.stream_url ? { id: a.id, slug: a.slug, title: a.title, src: a.stream_url, duration: a.duration_seconds } : null);

function List({ rows, extra }: { rows: Row[]; extra?: (i: number) => string }) {
  const q = rows.map(track).filter((t): t is Track => Boolean(t));
  return <div className="space-y-2">{rows.map((a, i) => { const t = track(a); return (
    <Card key={a.id + i} className="flex items-center gap-3">{t ? <PlayButton track={t} queue={q} /> : <span className="size-11" />}
      <div className="min-w-0 flex-1"><Link href={`/library/${a.slug}`} className="block truncate font-semibold hover:text-brand">{a.title}</Link><p className="text-sm text-muted">{extra?.(i) ?? formatDuration(a.duration_seconds)}</p></div></Card>); })}</div>;
}

export default async function Listening() {
  const { user } = await requireRole(["listener", "moderator", "broadcaster", "admin", "super_admin"]);
  const db = await createClient();
  const [{ data: hist }, { data: marks }] = await Promise.all([
    db.from("listening_history").select("progress_seconds,completed,last_played_at,audio_library(id,slug,title,stream_url,duration_seconds)").eq("user_id", user.id).order("last_played_at", { ascending: false }).limit(40),
    db.from("bookmarks").select("audio_library(id,slug,title,stream_url,duration_seconds)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const h = (hist ?? []).map((r) => ({ ...r, a: r.audio_library as unknown as Row | null })).filter((r) => r.a);
  const cont = h.filter((r) => !r.completed && r.progress_seconds > 10).slice(0, 5);
  const bm = (marks ?? []).map((m) => m.audio_library as unknown as Row | null).filter((x): x is Row => Boolean(x));
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">My listening</h1>
      <section aria-labelledby="c"><h2 id="c" className="mb-3 text-xl font-bold">Continue listening</h2>
        {cont.length ? <List rows={cont.map((r) => r.a!)} extra={(i) => `Stopped at ${formatDuration(cont[i].progress_seconds)}`} /> : <EmptyState title="Nothing to continue" hint="Start a recording and it will appear here." />}</section>
      <section aria-labelledby="b"><h2 id="b" className="mb-3 text-xl font-bold">Bookmarks</h2>
        {bm.length ? <List rows={bm} /> : <EmptyState title="No bookmarks yet" hint="Use Bookmark on a recording's page." />}</section>
      <section aria-labelledby="r"><h2 id="r" className="mb-3 text-xl font-bold">Recently played</h2>
        {h.length ? <List rows={h.map((r) => r.a!)} extra={(i) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(h[i].last_played_at))} /> : <EmptyState title="No listening history yet" />}</section>
    </div>
  );
}
