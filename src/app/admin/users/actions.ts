"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const ROLES = ["admin", "broadcaster", "moderator", "super_admin"];
const fail = (m: string): never => redirect(`/admin/users?error=${encodeURIComponent(m)}`);

async function change(fd: FormData, grant: boolean) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const userId = String(fd.get("userId") ?? ""), key = String(fd.get("role") ?? "");
  if (!ROLES.includes(key) || !/^[0-9a-f-]{36}$/.test(userId)) return fail("Invalid request.");
  if (!grant && userId === user.id && key === "super_admin") return fail("You can't remove your own super admin role.");
  const db = await createClient();
  const { data: role } = await db.from("app_roles").select("id").eq("key", key).single();
  if (!role) return fail("Role not found.");
  const { error } = grant
    ? await db.from("user_roles").upsert({ user_id: userId, role_id: role.id, granted_by: user.id }, { onConflict: "user_id,role_id", ignoreDuplicates: true })
    : await db.from("user_roles").delete().eq("user_id", userId).eq("role_id", role.id);
  if (error) return fail(error.message.includes("super_admin") ? "Only a super admin can change admin roles." : "Couldn't change the role.");
  await logAudit(db, user.id, grant ? "role.grant" : "role.revoke", "user", userId, { role: key });
  revalidatePath("/admin/users");
}
export async function grantRole(fd: FormData) { await change(fd, true); }
export async function revokeRole(fd: FormData) { await change(fd, false); }
