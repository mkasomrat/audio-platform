import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 12;
export type AudioItem = {
  id: string; slug: string; title: string; description: string | null; published_at: string | null; play_count: number;
  duration_seconds: number | null; stream_url: string | null; is_featured: boolean; category_id: string | null; audio_categories: { name: string; slug: string } | null;
};
const COLS = "id,slug,title,description,published_at,play_count,duration_seconds,stream_url,is_featured,category_id,audio_categories(name,slug)";
const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const unavailable = "The library is not available right now. Please try again shortly.";
export type Lib<T> = { data: T; error: string | null };

export type Query = { q?: string; category?: string; tag?: string; sort?: string; page?: number; featured?: boolean };

export async function searchLibrary(o: Query): Promise<Lib<{ items: AudioItem[]; total: number }>> {
  const empty = { items: [] as AudioItem[], total: 0 };
  if (!configured()) return { data: empty, error: unavailable };
  try {
    const db = await createClient();
    let q = db.from("audio_library").select(COLS, { count: "exact" }).eq("is_published", true);
    if (o.category) {
      const { data: c } = await db.from("audio_categories").select("id").eq("slug", o.category).maybeSingle();
      if (!c) return { data: empty, error: null };
      q = q.eq("category_id", c.id);
    }
    if (o.tag) {
      const { data: t } = await db.from("audio_tags").select("id").eq("slug", o.tag).maybeSingle();
      if (!t) return { data: empty, error: null };
      const { data: links } = await db.from("audio_library_tags").select("audio_id").eq("tag_id", t.id).limit(500);
      const ids = (links ?? []).map((l) => l.audio_id);
      if (!ids.length) return { data: empty, error: null };
      q = q.in("id", ids);
    }
    if (o.featured) q = q.eq("is_featured", true);
    const s = (o.q ?? "").replace(/[%_,()\\]/g, " ").trim().slice(0, 80);
    if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    const sort = o.sort ?? "new";
    const ordered = sort === "old" ? q.order("published_at", { ascending: true })
      : sort === "popular" ? q.order("play_count", { ascending: false }).order("published_at", { ascending: false })
      : sort === "title" ? q.order("title", { ascending: true })
      : q.order("published_at", { ascending: false });
    const page = Math.max(1, o.page ?? 1), from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await ordered.range(from, from + PAGE_SIZE - 1);
    if (error) return { data: empty, error: unavailable };
    return { data: { items: (data ?? []) as unknown as AudioItem[], total: count ?? 0 }, error: null };
  } catch { return { data: empty, error: unavailable }; }
}

export async function getAudio(slug: string): Promise<Lib<(AudioItem & { tags: { name: string; slug: string }[] }) | null>> {
  if (!configured()) return { data: null, error: unavailable };
  try {
    const db = await createClient();
    const { data, error } = await db.from("audio_library").select(COLS).eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) return { data: null, error: unavailable };
    if (!data) return { data: null, error: null };
    const { data: tl } = await db.from("audio_library_tags").select("audio_tags(name,slug)").eq("audio_id", data.id);
    const tags = (tl ?? []).map((t) => t.audio_tags as unknown as { name: string; slug: string } | null).filter((t): t is { name: string; slug: string } => Boolean(t));
    return { data: { ...(data as unknown as AudioItem), tags }, error: null };
  } catch { return { data: null, error: unavailable }; }
}

export async function relatedAudio(item: AudioItem, limit = 4): Promise<AudioItem[]> {
  try {
    const db = await createClient();
    let out: AudioItem[] = [];
    if (item.category_id) {
      const { data } = await db.from("audio_library").select(COLS).eq("is_published", true).eq("category_id", item.category_id).neq("id", item.id).order("published_at", { ascending: false }).limit(limit);
      out = (data ?? []) as unknown as AudioItem[];
    }
    if (out.length < limit) {
      const { data } = await db.from("audio_library").select(COLS).eq("is_published", true).neq("id", item.id).order("published_at", { ascending: false }).limit(limit + out.length);
      const have = new Set(out.map((x) => x.id));
      out = [...out, ...((data ?? []) as unknown as AudioItem[]).filter((x) => !have.has(x.id))].slice(0, limit);
    }
    return out;
  } catch { return []; }
}

export async function listAudioCategories() {
  try { const db = await createClient(); const { data } = await db.from("audio_categories").select("id,name,slug").order("name"); return data ?? []; } catch { return []; }
}
export async function listTags(limit = 15) {
  try { const db = await createClient(); const { data } = await db.from("audio_tags").select("id,name,slug").order("name").limit(limit); return data ?? []; } catch { return []; }
}
