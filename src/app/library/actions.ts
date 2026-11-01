"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";

async function me() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  return { db, user };
}
const uuid = z.string().uuid();

export async function toggleBookmark(fd: FormData) {
  const { db, user } = await me();
  const audioId = uuid.safeParse(fd.get("audioId"));
  if (!audioId.success) return;
  const { data: ex } = await db.from("bookmarks").select("id").eq("user_id", user.id).eq("audio_id", audioId.data).maybeSingle();
  if (ex) await db.from("bookmarks").delete().eq("id", ex.id); else await db.from("bookmarks").insert({ user_id: user.id, audio_id: audioId.data });
  revalidatePath(`/library/${String(fd.get("slug"))}`); revalidatePath("/dashboard/listening");
}

export async function createPlaylist(_: FormState, fd: FormData): Promise<FormState> {
  const { db, user } = await me();
  const p = z.object({ name: z.string().trim().min(1, "Enter a name.").max(60) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const { data, error } = await db.from("audio_playlists").insert({ user_id: user.id, name: p.data.name }).select("id").single();
  if (error || !data) return { error: "Couldn't create the playlist." };
  redirect(`/dashboard/playlists/${data.id}`);
}
export async function renamePlaylist(_: FormState, fd: FormData): Promise<FormState> {
  const { db } = await me();
  const p = z.object({ id: uuid, name: z.string().trim().min(1, "Enter a name.").max(60) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const { error } = await db.from("audio_playlists").update({ name: p.data.name }).eq("id", p.data.id);
  revalidatePath(`/dashboard/playlists/${p.data.id}`);
  return error ? { error: "Couldn't rename." } : { message: "Saved." };
}
export async function deletePlaylist(fd: FormData) {
  const { db } = await me();
  const id = uuid.safeParse(fd.get("id")); if (!id.success) return;
  await db.from("audio_playlists").delete().eq("id", id.data);
  redirect("/dashboard/playlists");
}
export async function addToPlaylist(fd: FormData) {
  const { db } = await me();
  const p = z.object({ playlistId: uuid, audioId: uuid }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const { count } = await db.from("playlist_items").select("*", { count: "exact", head: true }).eq("playlist_id", p.data.playlistId);
  await db.from("playlist_items").upsert({ playlist_id: p.data.playlistId, audio_id: p.data.audioId, position: count ?? 0 }, { onConflict: "playlist_id,audio_id", ignoreDuplicates: true });
  revalidatePath(`/dashboard/playlists/${p.data.playlistId}`);
}
export async function removeFromPlaylist(fd: FormData) {
  const { db } = await me();
  const p = z.object({ playlistId: uuid, itemId: uuid }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await db.from("playlist_items").delete().eq("id", p.data.itemId).eq("playlist_id", p.data.playlistId);
  revalidatePath(`/dashboard/playlists/${p.data.playlistId}`);
}
