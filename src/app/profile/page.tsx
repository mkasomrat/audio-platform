import type { Metadata } from "next";
import { ActionForm } from "@/components/forms/action-form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "Profile" };

export default async function Profile() {
  const { user } = await requireRole(["listener", "moderator", "broadcaster", "admin", "super_admin"]);
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("display_name,bio").eq("id", user.id).maybeSingle();
  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-3xl font-bold">Profile</h1>
      <Card>
        <ActionForm action={updateProfile} submitLabel="Save profile">
          <Input label="Display name" name="display_name" defaultValue={p?.display_name ?? ""} required minLength={2} maxLength={50} />
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium">Bio</label>
            <textarea id="bio" name="bio" rows={4} maxLength={300} defaultValue={p?.bio ?? ""} className="w-full rounded-lg border border-line bg-surface p-3 text-base" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
