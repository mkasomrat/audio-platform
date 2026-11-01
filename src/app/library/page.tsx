import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { AudioCard, toTrack } from "@/components/library/audio-card";
import { listAudioCategories, listTags, PAGE_SIZE, searchLibrary } from "@/lib/data/library";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audio library" };
type SP = { q?: string; category?: string; tag?: string; sort?: string; page?: string };

export default async function Library({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filtered = Boolean(sp.q || sp.category || sp.tag);
  const [res, cats, tags, featured] = await Promise.all([
    searchLibrary({ ...sp, page }), listAudioCategories(), listTags(),
    !filtered && page === 1 ? searchLibrary({ featured: true, sort: "new" }) : Promise.resolve(null),
  ]);
  const href = (o: Partial<SP>) => { const p = new URLSearchParams(); const m = { ...sp, ...o }; Object.entries(m).forEach(([k, v]) => { if (v && !(k === "page" && v === "1")) p.set(k, String(v)); }); const s = p.toString(); return `/library${s ? `?${s}` : ""}`; };
  const pages = Math.max(1, Math.ceil(res.data.total / PAGE_SIZE));
  const queue = res.data.items.map(toTrack).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const chip = (on: boolean) => cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-brand bg-brand text-brand-ink" : "border-line text-muted hover:text-ink");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audio library</h1>
      <form action="/library" className="flex flex-col gap-2 sm:flex-row">
        <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search titles and descriptions" aria-label="Search the library" className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-base" />
        {sp.category && <input type="hidden" name="category" value={sp.category} />}{sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <select name="sort" defaultValue={sp.sort ?? "new"} aria-label="Sort order" className="min-h-11 rounded-lg border border-line bg-surface px-3"><option value="new">Newest</option><option value="old">Oldest</option><option value="popular">Most played</option><option value="title">Title A–Z</option></select>
        <Button type="submit">Search</Button>
      </form>
      {cats.length > 0 && <nav aria-label="Categories" className="flex gap-2 overflow-x-auto"><Link href={href({ category: undefined, page: "1" })} className={chip(!sp.category)}>All</Link>{cats.map((c) => <Link key={c.id} href={href({ category: c.slug, page: "1" })} className={chip(sp.category === c.slug)}>{c.name}</Link>)}</nav>}
      {tags.length > 0 && <nav aria-label="Tags" className="flex gap-2 overflow-x-auto">{tags.map((t) => <Link key={t.id} href={href({ tag: sp.tag === t.slug ? undefined : t.slug, page: "1" })} className={chip(sp.tag === t.slug)}>#{t.name}</Link>)}</nav>}
      {featured && featured.data.items.length > 0 && <section aria-labelledby="feat"><h2 id="feat" className="mb-3 text-xl font-bold">Featured</h2><div className="grid gap-3 sm:grid-cols-2">{featured.data.items.map((a) => <AudioCard key={a.id} a={a} />)}</div></section>}
      <section aria-labelledby="all">
        <h2 id="all" className="mb-3 text-xl font-bold">{filtered ? `${res.data.total} result${res.data.total === 1 ? "" : "s"}` : sp.sort === "popular" ? "Most played" : "Recently added"}</h2>
        {res.error ? <ErrorState title="Couldn't load the library" hint={res.error} />
          : !res.data.items.length ? <EmptyState title={filtered ? "Nothing matches your search" : "The library is empty"} hint={filtered ? "Try different words or clear the filters." : "Recordings appear here after an administrator archives and publishes them."} action={filtered ? <Button href="/library" variant="secondary">Clear filters</Button> : undefined} />
          : <div className="grid gap-3 sm:grid-cols-2">{res.data.items.map((a) => <AudioCard key={a.id} a={a} queue={queue} />)}</div>}
      </section>
      {pages > 1 && <nav aria-label="Pages" className="flex items-center justify-between">
        {page > 1 ? <Button href={href({ page: String(page - 1) })} variant="secondary">Previous</Button> : <span />}<span className="text-sm text-muted">Page {page} of {pages}</span>
        {page < pages ? <Button href={href({ page: String(page + 1) })} variant="secondary">Next</Button> : <span />}</nav>}
    </div>
  );
}
