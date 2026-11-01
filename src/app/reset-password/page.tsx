import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/forms/action-form";
import { AuthShell } from "@/components/forms/auth-shell";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/app/auth/actions";
import { getSessionWithRoles } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPassword() {
  const { user } = await getSessionWithRoles();
  if (!user) redirect("/forgot-password");
  return (
    <AuthShell title="Choose a new password">
      <ActionForm action={updatePassword} submitLabel="Save new password">
        <Input label="New password (8+ characters)" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </ActionForm>
    </AuthShell>
  );
}
