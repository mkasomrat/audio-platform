import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}
type Db = Awaited<ReturnType<typeof createClient>>;

export async function canHost(db: Db, broadcastId: string) {
  const [{ data: admin }, { data: host }, { data: caster }] = await Promise.all([
    db.rpc("is_admin"), db.rpc("is_broadcast_host", { _bid: broadcastId }), db.rpc("can_broadcast")]);
  return admin === true || (host === true && caster === true);
}
export async function canModerate(db: Db, broadcastId: string) {
  const { data } = await db.rpc("can_moderate_broadcast", { _bid: broadcastId });
  return data === true;
}
