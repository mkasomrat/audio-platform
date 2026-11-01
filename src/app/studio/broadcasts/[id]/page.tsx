import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { BroadcastForm } from "@/components/studio/broadcast-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { addHost, removeHost, updateBroadcast } from "../actions";

export default async function EditBroadcast({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await createClient();
  const { data: b } = await db.from("broadcasts").select("id,title,description,category_id,status,scheduled_at,cover_image_url,slug").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [{ data: categories }, { data: hostRows }] = await Promise.all([
    db.from("broadcast_categories").select("id,name").order("name"),
    db.from("broadcast_hosts").select("id,user_id,is_primary").eq("broadcast_id", id),
  ]);
  const { data: profs } = hostRows?.length ? await db.from("profiles").select("id,display_name").in("id", hostRows.map((h) => h.user_id)) : { data: [] as { id: string; display_name: string }[] };
  const name = (uid: string) => profs?.find((p) => p.id === uid)?.display_name ?? "Unknown";
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold">Edit broadcast</h1><Button href={`/studio/live/${id}`}>Live studio</Button></div>
      <Card><BroadcastForm action={updateBroadcast} categories={categories ?? []} b={b} submitLabel="Save changes" /></Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Hosts</h2>
        <ul className="space-y-2">{(hostRows ?? []).map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-2"><span>{name(h.user_id)}{h.is_primary ? " (primary)" : ""}</span>
            {!h.is_primary && <ConfirmForm action={removeHost} hidden={{ broadcast_id: id, host_id: h.id }} buttonLabel="Remove" title="Remove this host?" description={`${name(h.user_id)} will no longer manage this broadcast.`} confirmLabel="Remove host" />}</li>))}</ul>
        <ActionForm action={addHost} submitLabel="Add host"><input type="hidden" name="broadcast_id" value={id} /><Input label="Host's exact display name" name="name" required /></ActionForm>
        <p className="text-xs text-muted">The person must have an account and the broadcaster role to run the show.</p>
      </Card>
    </div>
  );
}
