import { NextResponse } from "next/server";
import { getSessionWithRoles } from "@/lib/auth/roles";
import { adminClient } from "@/lib/supabase/admin";
import { presignDownload, storageConfigured } from "@/lib/storage/s3";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, roles } = await getSessionWithRoles();
  if (!user || !roles.some((r) => r === "admin" || r === "super_admin")) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/.test(id) || !storageConfigured()) return NextResponse.json({ error: "Unavailable." }, { status: 400 });
  const { data: r } = await adminClient().from("recordings").select("temp_storage_path,original_filename,status,temp_deleted").eq("id", id).maybeSingle();
  if (!r?.temp_storage_path || r.status !== "ready" || r.temp_deleted) return NextResponse.json({ error: "This recording isn't ready to download." }, { status: 409 });
  try { return NextResponse.redirect(await presignDownload(r.temp_storage_path, r.original_filename ?? "recording.ogg")); }
  catch { return NextResponse.json({ error: "Couldn't create a download link. Check storage settings." }, { status: 502 }); }
}
