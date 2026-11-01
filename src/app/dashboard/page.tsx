import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { user, roles } = await requireRole(["listener", "moderator", "broadcaster", "admin", "super_admin"]);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const sp = await searchParams;
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const canStudio = isAdmin || roles.includes("broadcaster");
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Hello, {profile?.display_name ?? "listener"}</h1>
      {sp.denied && <p role="alert" className="rounded-lg border border-danger/40 p-3 text-sm text-danger">You don&rsquo;t have permission to open that page.</p>}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Your roles</p>
        <div className="flex flex-wrap gap-2">{roles.map((r) => <Badge key={r} tone="brand">{r.replace("_", " ")}</Badge>)}</div>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button href="/dashboard/listening" variant="secondary">My listening</Button>
        <Button href="/dashboard/playlists" variant="secondary">Playlists</Button>
        <Button href="/profile" variant="secondary">Edit profile</Button>
        {canStudio && <Button href="/studio" variant="secondary">Broadcaster studio</Button>}
        {isAdmin && <Button href="/admin" variant="secondary">Admin dashboard</Button>}
      </div>
            <form action={signOut}><Button variant="ghost" type="submit">Log out</Button></form>
    </div>
  );
}
