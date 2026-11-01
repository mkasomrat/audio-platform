import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RoleKey = "super_admin" | "admin" | "broadcaster" | "moderator" | "listener";

export async function getSessionWithRoles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, roles: [] as RoleKey[] };
  const { data } = await supabase
    .from("user_roles")
    .select("app_roles(key)")
    .eq("user_id", user.id);
  const roles = (data ?? [])
    .map((r) => (r.app_roles as unknown as { key: RoleKey } | null)?.key)
    .filter((k): k is RoleKey => Boolean(k));
  return { user, roles };
}

// Server-side enforcement. Use in every protected layout/page/route handler.
export async function requireRole(allowed: RoleKey[]) {
  const { user, roles } = await getSessionWithRoles();
  if (!user) redirect("/login");
  if (!roles.some((r) => allowed.includes(r))) redirect("/dashboard?denied=1");
  return { user, roles };
}
