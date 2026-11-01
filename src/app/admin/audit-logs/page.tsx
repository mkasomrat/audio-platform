import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function AuditLogs() {
  const db = await createClient();
  const { data } = await db.from("audit_logs").select("id,action,entity_type,entity_id,metadata,created_at,actor_id").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Audit log</h1>
      {!data?.length ? <EmptyState title="No activity recorded yet" hint="Role changes, deletions and settings changes appear here." /> :
        <div className="space-y-2">{data.map((l) => <Card key={l.id} className="text-sm"><p className="font-semibold">{l.action}</p>
          <p className="break-all text-muted">{l.entity_type} {l.entity_id} · {formatDateTime(l.created_at)}</p>
          <p className="break-all text-xs text-muted">by {l.actor_id ?? "unknown"} {Object.keys(l.metadata ?? {}).length ? JSON.stringify(l.metadata) : ""}</p></Card>)}</div>}
    </>
  );
}
