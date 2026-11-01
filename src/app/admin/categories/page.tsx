import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/feedback";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { createClient } from "@/lib/supabase/server";
import { createCategory, deleteCategory } from "./actions";

async function Section({ kind, title, table }: { kind: "broadcast" | "audio"; title: string; table: string }) {
  const db = await createClient();
  const { data } = await db.from(table).select("id,name").order("name");
  return (
    <section className="space-y-3"><h2 className="text-xl font-bold">{title}</h2>
      <Card><ActionForm action={createCategory} submitLabel="Add category"><input type="hidden" name="kind" value={kind} /><Input label="Category name" name="name" required minLength={2} maxLength={40} /></ActionForm></Card>
      {!data?.length ? <EmptyState title="No categories yet" /> : <ul className="space-y-2">{data.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3"><span className="font-medium">{c.name}</span>
        <ConfirmForm action={deleteCategory} hidden={{ id: c.id, kind }} buttonLabel="Delete" title={`Delete “${c.name}”?`} description="Items in this category become uncategorized." confirmLabel="Delete category" /></li>)}</ul>}
    </section>);
}
export default function Categories() {
  return <div className="max-w-xl space-y-8"><h1 className="text-3xl font-bold">Categories</h1><Section kind="broadcast" title="Broadcast categories" table="broadcast_categories" /><Section kind="audio" title="Audio library categories" table="audio_categories" /></div>;
}
