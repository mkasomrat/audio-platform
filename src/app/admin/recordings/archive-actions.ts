"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { normalizeDropbox, probeStream } from "@/lib/archive/dropbox";
import { deleteObject } from "@/lib/storage/s3";
import { slugify } from "@/lib/utils";

const uuid = z.string().uuid();
const done = (id: string, m: string, kind: "ok" | "error" = "ok"): never => redirect(`/admin/recordings/${id}?${kind}=${encodeURIComponent(m)}`);
async function ctx(fd: FormData) {
  const { user } = await requireRole(["admin", "super_admin"]);
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) redirect("/admin/recordings");
  const db = adminClient();
  const { data: r } = await db.from("recordings").select("*").eq("id", id.data).maybeSingle();
  if (!r) redirect("/admin/recordings");
  return { user, db, r, id: id.data, audit: await createClient() };
}

export async function addDropboxLink(fd: FormData) {
  const { user, db, id, audit } = await ctx(fd);
  const n = normalizeDropbox(String(fd.get("url") ?? ""));
  if ("error" in n) return done(id, n.error, "error");
  await db.from("recordings").update({ dropbox_share_url: n.share, dropbox_stream_url: n.stream, archive_status: "link_added", uploaded_at: new Date().toISOString(), dropbox_ok: null, dropbox_supports_range: null, dropbox_checked_at: null, playback_tested: false, seek_tested: false, verified_at: null }).eq("id", id);
  await logAudit(audit, user.id, "archive.link_added", "recording", id);
  revalidatePath(`/admin/recordings/${id}`); done(id, "Link saved. Next, run the automatic check.");
}

export async function verifyDropbox(fd: FormData) {
  const { user, db, r, id, audit } = await ctx(fd);
  if (!r.dropbox_stream_url) return done(id, "Add the Dropbox link first.", "error");
  const p = await probeStream(r.dropbox_stream_url, r.file_size_bytes);
  await db.from("recordings").update({ dropbox_ok: p.ok, dropbox_supports_range: p.supportsRange, dropbox_content_type: p.contentType || null, dropbox_size_bytes: p.total, dropbox_checked_at: new Date().toISOString(), archive_status: p.ok ? "link_added" : "failed", playback_tested: false, seek_tested: false }).eq("id", id);
  await logAudit(audit, user.id, "archive.link_check", "recording", id, { ok: p.ok, range: p.supportsRange, status: p.status });
  revalidatePath(`/admin/recordings/${id}`);
  if (!p.ok) return done(id, p.problems.join(" ") || "The check failed.", "error");
  done(id, `Dropbox serves a real OGG/Opus file${p.supportsRange ? " and supports range requests" : ""}${p.sizeMatches ? ", and its size matches the recording" : ""}. ${p.problems.join(" ")} Now test playback and seeking below.`);
}

export async function recordTests(fd: FormData) {
  const { user, db, r, id, audit } = await ctx(fd);
  if (!r.dropbox_ok) return done(id, "Run the automatic check first.", "error");
  await db.from("recordings").update({ playback_tested: true, seek_tested: true }).eq("id", id);
  await logAudit(audit, user.id, "archive.browser_test", "recording", id);
  revalidatePath(`/admin/recordings/${id}`); done(id, "Playback and seeking recorded as working in your browser.");
}

export async function markVerified(fd: FormData) {
  const { user, db, r, id, audit } = await ctx(fd);
  if (!(r.dropbox_ok && r.dropbox_supports_range && r.playback_tested && r.seek_tested)) return done(id, "All checks (link check with range support, playback, seeking) must pass first.", "error");
  await db.from("recordings").update({ archive_status: "verified", verified_at: new Date().toISOString(), completed_by: user.id }).eq("id", id);
  await logAudit(audit, user.id, "archive.verified", "recording", id);
  revalidatePath(`/admin/recordings/${id}`); done(id, "Archive marked verified.");
}

export async function deleteTemporary(fd: FormData) {
  const { user, db, r, id, audit } = await ctx(fd);
  if (r.archive_status !== "verified" || r.status !== "ready" || r.temp_deleted || !r.temp_storage_path) return done(id, "Only a verified, ready recording with a temporary file can be deleted.", "error");
  try { await deleteObject(r.temp_storage_path); } catch { return done(id, "Couldn't delete the temporary file. Nothing was changed.", "error"); }
  await db.from("recordings").update({ temp_deleted: true, temp_deleted_at: new Date().toISOString() }).eq("id", id);
  await logAudit(audit, user.id, "archive.temp_deleted", "recording", id, { path: r.temp_storage_path });
  revalidatePath(`/admin/recordings/${id}`); done(id, "Temporary file deleted. Metadata and the Dropbox link are kept.");
}

export async function createLibraryItem(fd: FormData) {
  const { user, db, r, id, audit } = await ctx(fd);
  const p = z.object({ title: z.string().trim().min(2).max(150), description: z.string().trim().max(2000).optional(), categoryId: z.string().uuid().optional().or(z.literal("")) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return done(id, "Enter a title of at least 2 characters.", "error");
  if (r.archive_status !== "verified" || !r.dropbox_stream_url) return done(id, "Verify the archive before adding it to the library.", "error");
  const { data, error } = await db.from("audio_library").insert({ recording_id: id, slug: `${slugify(p.data.title)}-${Math.random().toString(36).slice(2, 7)}`, title: p.data.title, description: p.data.description || null, category_id: p.data.categoryId || null, stream_url: r.dropbox_stream_url, duration_seconds: r.duration_seconds, file_size_bytes: r.file_size_bytes, is_published: false }).select("id").single();
  if (error || !data) return done(id, "This recording may already be in the library.", "error");
  await logAudit(audit, user.id, "library.create", "audio", data.id, { recording: id });
  redirect(`/admin/library/${data.id}`);
}
