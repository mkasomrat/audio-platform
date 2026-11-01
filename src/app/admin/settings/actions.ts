"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/lib/forms";

export async function saveBranding(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole(["admin", "super_admin"]);
  const p = z.object({ name: z.string().trim().min(2, "Enter at least 2 characters.").max(40) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const db = await createClient();
  const { error } = await db.from("system_settings").upsert({ key: "branding", value: { name: p.data.name }, is_public: true, updated_by: user.id });
  if (error) return { error: "Couldn't save settings." };
  await logAudit(db, user.id, "settings.branding", "setting", "branding", { name: p.data.name });
  revalidatePath("/", "layout");
  return { message: "Saved." };
}
