import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

async function count(table: string, filter?: [string, string]) {
  const supabase = await createClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count: n, error } = await q;
  return error ? "—" : String(n ?? 0);
}

export default async function AdminHome() {
  const stats = [
    ["Users", await count("profiles")], ["Live now", await count("broadcasts", ["status", "live"])],
    ["Scheduled", await count("broadcasts", ["status", "scheduled"])], ["Finished", await count("broadcasts", ["status", "ended"])],
    ["Recordings", await count("recordings")], ["Published audio", await count("audio_library", ["is_published", "true"])],
  ];
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([l, v]) => <Card key={l}><p className="text-3xl font-extrabold">{v}</p><p className="text-sm text-muted">{l}</p></Card>)}
      </div>
      <p className="mt-4 text-sm text-muted">&ldquo;—&rdquo; means the count couldn&rsquo;t be read. Live audio status and usage monitoring arrive with Phases 2 and 3.</p>
    </>
  );
}
