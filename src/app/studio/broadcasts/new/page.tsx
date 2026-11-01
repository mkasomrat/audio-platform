import { Card } from "@/components/ui/card";
import { BroadcastForm } from "@/components/studio/broadcast-form";
import { createClient } from "@/lib/supabase/server";
import { createBroadcast } from "../actions";

export default async function NewBroadcast() {
  const db = await createClient();
  const { data: categories } = await db.from("broadcast_categories").select("id,name").order("name");
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-3xl font-bold">New broadcast</h1>
      <Card><BroadcastForm action={createBroadcast} categories={categories ?? []} submitLabel="Create broadcast" /></Card>
    </div>
  );
}
