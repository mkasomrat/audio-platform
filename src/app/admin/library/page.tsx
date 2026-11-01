import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { toggleFeatured, togglePublish } from "./actions";

export default async function AdminLibrary() {
  const db = await createClient();
  const { data } = await db.from("audio_library").select("id,title,is_published,is_featured,play_count").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Audio library</h1>
      {!data?.length ? <EmptyState title="No library items yet" hint="Archive and verify a recording first (Recordings > Manage archive), then add it here." /> :
        <div className="space-y-3">{data.map((a) => <Card key={a.id} className="space-y-3">
          <div className="space-y-1"><p className="font-semibold">{a.title}</p><div className="flex gap-2"><Badge tone={a.is_published ? "brand" : "neutral"}>{a.is_published ? "Published" : "Hidden"}</Badge>{a.is_featured && <Badge tone="brand">Featured</Badge>}<span className="text-sm text-muted">{a.play_count} plays</span></div></div>
          <div className="flex flex-wrap gap-2"><Button href={`/admin/library/${a.id}`} variant="secondary" className="min-h-9 px-3">Edit</Button>
            <form action={togglePublish}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="publish" value={String(!a.is_published)} /><Button type="submit" variant="secondary" className="min-h-9 px-3">{a.is_published ? "Hide" : "Publish"}</Button></form>
            <form action={toggleFeatured}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="on" value={String(!a.is_featured)} /><Button type="submit" variant="ghost" className="min-h-9 px-3">{a.is_featured ? "Unfeature" : "Feature"}</Button></form></div>
        </Card>)}</div>}
    </>
  );
}
