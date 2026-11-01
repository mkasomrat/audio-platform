import { createClient } from "@/lib/supabase/server";

export type BroadcastStatus = "draft" | "scheduled" | "live" | "ended" | "cancelled";
export type Broadcast = {
  id: string; slug: string; title: string; description: string | null; status: BroadcastStatus;
  scheduled_at: string | null; started_at: string | null; ended_at: string | null;
  cover_image_url: string | null; broadcast_categories: { name: string } | null;
};
export type Result<T> = { data: T; error: string | null };

const COLS = "id,slug,title,description,status,scheduled_at,started_at,ended_at,cover_image_url,broadcast_categories(name)";
const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const unavailable = "The service is not available right now. Please try again shortly.";

export async function listBroadcasts(status: BroadcastStatus, limit = 24): Promise<Result<Broadcast[]>> {
  if (!configured()) return { data: [], error: unavailable };
  try {
    const supabase = await createClient();
    const sort = status === "ended" ? "ended_at" : "scheduled_at";
    const { data, error } = await supabase.from("broadcasts").select(COLS).eq("status", status)
      .order(sort, { ascending: status === "scheduled", nullsFirst: false }).limit(limit);
    if (error) return { data: [], error: unavailable };
    return { data: (data ?? []) as unknown as Broadcast[], error: null };
  } catch { return { data: [], error: unavailable }; }
}

export async function getBroadcast(slug: string): Promise<Result<(Broadcast & { hosts: string[] }) | null>> {
  if (!configured()) return { data: null, error: unavailable };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("broadcasts").select(COLS).eq("slug", slug).maybeSingle();
    if (error) return { data: null, error: unavailable };
    if (!data) return { data: null, error: null };
    const b = data as unknown as Broadcast;
    const { data: hostRows } = await supabase.from("broadcast_hosts").select("user_id").eq("broadcast_id", b.id);
    const ids = (hostRows ?? []).map((h) => h.user_id);
    let hosts: string[] = [];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("display_name").in("id", ids);
      hosts = (profs ?? []).map((p) => p.display_name);
    }
    return { data: { ...b, hosts }, error: null };
  } catch { return { data: null, error: unavailable }; }
}

export type LibraryItem = { id: string; slug: string; title: string; description: string | null; published_at: string | null };
export async function listLibrary(limit = 24): Promise<Result<LibraryItem[]>> {
  if (!configured()) return { data: [], error: unavailable };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("audio_library").select("id,slug,title,description,published_at")
      .eq("is_published", true).order("published_at", { ascending: false }).limit(limit);
    if (error) return { data: [], error: unavailable };
    return { data: (data ?? []) as LibraryItem[], error: null };
  } catch { return { data: [], error: unavailable }; }
}
