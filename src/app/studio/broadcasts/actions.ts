"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

const STUDIO = ["broadcaster", "admin", "super_admin"] as const;
const schema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(150),
  description: z.string().trim().max(2000).optional(),
  category_id: z.string().uuid().optional().or(z.literal("")),
  scheduled_at: z.string().optional(),
  cover_image_url: z.string().trim().url("Enter a valid link.").startsWith("https://", "Cover link must start with https://").optional().or(z.literal("")),
  status: z.enum(["draft", "scheduled", "cancelled"]).optional(),
});

function parse(fd: FormData) {
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." } as const;
  const d = p.data;
  if (d.status === "scheduled" && !d.scheduled_at) return { error: "Pick a start time to schedule this broadcast." } as const;
  return { values: { title: d.title, description: d.description || null, category_id: d.category_id || null, scheduled_at: d.scheduled_at || null, cover_image_url: d.cover_image_url || null }, status: d.status } as const;
}

export async function createBroadcast(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireRole([...STUDIO]);
  const r = parse(fd);
  if ("error" in r) return { error: r.error };
  const db = await createClient();
  const slug = `${slugify(r.values.title)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await db.from("broadcasts").insert({ ...r.values, slug, status: r.status ?? "draft", created_by: user.id }).select("id").single();
  if (error || !data) return { error: "Couldn't create the broadcast. Check that you have broadcaster access." };
  await db.from("broadcast_hosts").insert({ broadcast_id: data.id, user_id: user.id, is_primary: true });
  redirect(`/studio/broadcasts/${data.id}`);
}

export async function updateBroadcast(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole([...STUDIO]);
  const id = String(fd.get("id") ?? "");
  const r = parse(fd);
  if ("error" in r) return { error: r.error };
  const db = await createClient();
  const { data: cur } = await db.from("broadcasts").select("status").eq("id", id).maybeSingle();
  if (!cur) return { error: "Broadcast not found, or you can't edit it." };
  const status = ["draft", "scheduled", "cancelled"].includes(cur.status) && r.status ? { status: r.status } : {};
  const { error } = await db.from("broadcasts").update({ ...r.values, ...status }).eq("id", id);
  if (error) return { error: "Couldn't save changes." };
  revalidatePath(`/studio/broadcasts/${id}`);
  return { message: "Saved." };
}

export async function addHost(_: FormState, fd: FormData): Promise<FormState> {
  await requireRole([...STUDIO]);
  const id = String(fd.get("broadcast_id") ?? ""), name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Enter the host's exact display name." };
  const db = await createClient();
  const { data: matches } = await db.from("profiles").select("id").eq("display_name", name).limit(2);
  if (!matches?.length) return { error: "No user has that exact display name." };
  if (matches.length > 1) return { error: "More than one user has that name. Ask the user to choose a unique display name." };
  const { error } = await db.from("broadcast_hosts").upsert({ broadcast_id: id, user_id: matches[0].id }, { onConflict: "broadcast_id,user_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't add the host." };
  revalidatePath(`/studio/broadcasts/${id}`);
  return { message: "Host added." };
}

export async function removeHost(fd: FormData) {
  await requireRole([...STUDIO]);
  const id = String(fd.get("broadcast_id")), hostId = String(fd.get("host_id"));
  const db = await createClient();
  await db.from("broadcast_hosts").delete().eq("id", hostId).eq("is_primary", false);
  revalidatePath(`/studio/broadcasts/${id}`);
}
