"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

const TABLES = { broadcast: "broadcast_categories", audio: "audio_categories" } as const;
const kindOf = (v: unknown) => (v === "audio" ? "audio" : "broadcast");

export async function createCategory(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole(["admin", "super_admin"]);
  const p = z.object({ name: z.string().trim().min(2, "Enter a name of at least 2 characters.").max(40) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const kind = kindOf(fd.get("kind")), db = await createClient();
  const { data, error } = await db.from(TABLES[kind]).insert({ name: p.data.name, slug: slugify(p.data.name) }).select("id").single();
  if (error) return { error: "That category already exists." };
  await logAudit(db, user.id, "category.create", `${kind}_category`, data.id, { name: p.data.name });
  revalidatePath("/admin/categories");
  return { message: "Category added." };
}
export async function deleteCategory(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id")), kind = kindOf(fd.get("kind")), db = await createClient();
  const { error } = await db.from(TABLES[kind]).delete().eq("id", id);
  if (!error) await logAudit(db, user.id, "category.delete", `${kind}_category`, id);
  revalidatePath("/admin/categories");
}
