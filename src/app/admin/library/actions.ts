"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

export async function togglePublish(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id")), publish = fd.get("publish") === "true";
  const db = await createClient();
  if (publish) { const { data: a } = await db.from("audio_library").select("stream_url").eq("id", id).maybeSingle(); if (!a?.stream_url) return; }
  const { error } = await db.from("audio_library").update({ is_published: publish, published_at: publish ? new Date().toISOString() : null }).eq("id", id);
  if (!error) await logAudit(db, user.id, publish ? "library.publish" : "library.unpublish", "audio", id);
  revalidatePath("/admin/library"); revalidatePath("/library");
}
export async function toggleFeatured(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = String(fd.get("id")), on = fd.get("on") === "true";
  const db = await createClient();
  const { error } = await db.from("audio_library").update({ is_featured: on }).eq("id", id);
  if (!error) await logAudit(db, user.id, on ? "library.feature" : "library.unfeature", "audio", id);
  revalidatePath("/admin/library"); revalidatePath("/library");
}
export async function updateLibraryItem(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole(["admin", "super_admin"]);
  const p = z.object({ id: z.string().uuid(), title: z.string().trim().min(2, "Title needs 2+ characters.").max(150), description: z.string().trim().max(2000).optional(), categoryId: z.string().uuid().optional().or(z.literal("")), tags: z.string().max(400).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const db = await createClient();
  const { error } = await db.from("audio_library").update({ title: p.data.title, description: p.data.description || null, category_id: p.data.categoryId || null }).eq("id", p.data.id);
  if (error) return { error: "Couldn't save." };
  const names = [...new Set((p.data.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 10).map((n) => n.slice(0, 30));
  await db.from("audio_library_tags").delete().eq("audio_id", p.data.id);
  if (names.length) {
    const { data: tags } = await db.from("audio_tags").upsert(names.map((name) => ({ name, slug: slugify(name) })), { onConflict: "slug" }).select("id");
    if (tags?.length) await db.from("audio_library_tags").insert(tags.map((t) => ({ audio_id: p.data.id, tag_id: t.id })));
  }
  await logAudit(db, user.id, "library.update", "audio", p.data.id);
  revalidatePath("/library"); revalidatePath("/admin/library");
  return { message: "Saved." };
}
