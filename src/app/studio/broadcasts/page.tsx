import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function MyBroadcasts() {
  const { user, roles } = await requireRole(["broadcaster", "admin", "super_admin"]);
  const db = await createClient();
  const { data: hostRows } = await db.from("broadcast_hosts").select("broadcast_id").eq("user_id", user.id);
  const ids = (hostRows ?? []).map((h) => h.broadcast_id);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  let q = db.from("broadcasts").select("id,title,status,scheduled_at").order("created_at", { ascending: false }).limit(100);
  if (!isAdmin) q = q.or(`created_by.eq.${user.id}${ids.length ? `,id.in.(${ids.join(",")})` : ""}`);
  const { data } = await q;
  return (
    <>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-3xl font-bold">My broadcasts</h1><Button href="/studio/broadcasts/new">New broadcast</Button></div>
      {!data?.length ? <EmptyState title="No broadcasts yet" hint="Create one to schedule your first show." /> :
        <div className="space-y-3">{data.map((b) => <Link key={b.id} href={`/studio/broadcasts/${b.id}`} className="block"><Card className="hover:border-brand">
          <div className="mb-1 flex items-center gap-2"><Badge>{b.status}</Badge><span className="text-sm text-muted">{formatDateTime(b.scheduled_at)}</span></div><p className="font-semibold">{b.title}</p></Card></Link>)}</div>}
    </>
  );
}
