import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

// Records an administrative action. Failure to log never blocks the action, but is reported to server logs.
export async function logAudit(db: Db, actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const { error } = await db.from("audit_logs").insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, metadata });
  if (error) console.error("audit log failed:", error.message);
}
