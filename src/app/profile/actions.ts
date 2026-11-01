"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ display_name: z.string().trim().min(2, "Enter a name of at least 2 characters.").max(50), bio: z.string().trim().max(300, "Keep the bio under 300 characters.") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };
  const { error } = await supabase.from("profiles").update({ display_name: p.data.display_name, bio: p.data.bio || null }).eq("id", user.id);
  return error ? { error: "Couldn't save your profile. Try again." } : { message: "Profile saved." };
}
