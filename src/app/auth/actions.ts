"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appConfig } from "@/config/app";
import { safeNext } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer.");
const first = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";
const down = "The sign-in service is unavailable. Try again shortly.";

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: first(p.error) };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(p.data);
    if (error) return { error: error.message.toLowerCase().includes("confirm") ? "Confirm your email first. Check your inbox." : "Email or password is incorrect." };
  } catch { return { error: down }; }
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ email, password, displayName: z.string().trim().min(2, "Enter a name of at least 2 characters.").max(50) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: first(p.error) };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email: p.data.email, password: p.data.password,
      options: { data: { display_name: p.data.displayName }, emailRedirectTo: `${appConfig.siteUrl}/auth/callback?next=/dashboard` } });
    if (error) return { error: "We couldn't create that account. If you already registered, log in or reset your password." };
  } catch { return { error: down }; }
  return { message: "Check your email and open the confirmation link to finish registering." };
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ email }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: first(p.error) };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(p.data.email, { redirectTo: `${appConfig.siteUrl}/auth/callback?next=/reset-password` });
  } catch { return { error: down }; }
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ password }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: first(p.error) };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: p.data.password });
    if (error) return { error: "Couldn't update the password. Request a new reset link and try again." };
  } catch { return { error: down }; }
  redirect("/dashboard");
}

export async function signOut() {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch {}
  redirect("/");
}
