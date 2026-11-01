import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/feedback";
import { ActionForm } from "@/components/forms/action-form";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createPlaylist } from "@/app/library/actions";

export const metadata: Metadata = { title: "Playlists" };

export default async function Playlists() {
  const { user } = await requireRole(["listener", "moderator", "broadcaster", "admin", "super_admin"]);
  const db = await createClient();
  const { data } = await db.from("audio_playlists").select("id,name").eq("user_id", user.id).order("created_at", { ascending: false });
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold">Playlists</h1>
      <Card><ActionForm action={createPlaylist} submitLabel="Create playlist"><Input label="Playlist name" name="name" required maxLength={60} /></ActionForm></Card>
      {!data?.length ? <EmptyState title="No playlists yet" hint="Create one, then add recordings from their pages." /> : <ul className="space-y-2">{data.map((p) => <li key={p.id}><Link href={`/dashboard/playlists/${p.id}`} className="block rounded-xl border border-line bg-surface p-4 font-semibold hover:border-brand">{p.name}</Link></li>)}</ul>}
    </div>
  );
}
