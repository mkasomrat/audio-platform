"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { endBroadcast } from "@/lib/live/lifecycle";

export async function setStatus(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id")), status = String(fd.get("status"));
  if (!["draft", "scheduled", "cancelled"].includes(status)) return; // live/ended are controlled by the studio in the live studio
  const db = await createClient();
  const { error } = await db.from("broadcasts").update({ status }).eq("id", id);
  if (!error) await logAudit(db, user.id, "broadcast.status", "broadcast", id, { status });
  revalidatePath("/admin/broadcasts");
}
export async function deleteBroadcast(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id"));
  const db = await createClient();
  const { error } = await db.from("broadcasts").delete().eq("id", id);
  if (!error) await logAudit(db, user.id, "broadcast.delete", "broadcast", id);
  revalidatePath("/admin/broadcasts");
}

export async function endLive(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id"));
  const r = await endBroadcast(id);
  if (r.ok) await logAudit(await createClient(), user.id, "broadcast.force_end", "broadcast", id);
  revalidatePath("/admin/broadcasts");
}
