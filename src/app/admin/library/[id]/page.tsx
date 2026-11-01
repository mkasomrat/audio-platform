import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { createClient } from "@/lib/supabase/server";
import { updateLibraryItem } from "../actions";

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await createClient();
  const { data: a } = await db.from("audio_library").select("id,title,description,category_id,is_published").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [{ data: cats }, { data: tl }] = await Promise.all([db.from("audio_categories").select("id,name").order("name"), db.from("audio_library_tags").select("audio_tags(name)").eq("audio_id", id)]);
  const tags = (tl ?? []).map((t) => (t.audio_tags as unknown as { name: string } | null)?.name).filter(Boolean).join(", ");
  return (
    <div className="max-w-xl space-y-4">
      <Link href="/admin/library" className="text-sm font-semibold text-brand">← Library</Link>
      <h1 className="text-3xl font-bold">Edit library item</h1>
      <Card><ActionForm action={updateLibraryItem} submitLabel="Save">
        <input type="hidden" name="id" value={id} /><Input label="Title" name="title" defaultValue={a.title} required />
        <div className="space-y-1.5"><label htmlFor="d" className="text-sm font-medium">Description</label><textarea id="d" name="description" rows={4} defaultValue={a.description ?? ""} className="w-full rounded-lg border border-line bg-surface p-3" /></div>
        <div className="space-y-1.5"><label htmlFor="c" className="text-sm font-medium">Category</label><select id="c" name="categoryId" defaultValue={a.category_id ?? ""} className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"><option value="">No category</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <Input label="Tags (comma separated, up to 10)" name="tags" defaultValue={tags} />
      </ActionForm></Card>
      <p className="text-sm text-muted">{a.is_published ? "Published." : "Hidden. Publish it from the library list when ready."}</p>
    </div>
  );
}
