import type { Metadata } from "next";
import { ActionForm } from "@/components/forms/action-form";
import { AuthShell } from "@/components/forms/auth-shell";
import { Input } from "@/components/ui/input";
import { requestReset } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Reset password" };

export default function Forgot() {
  return (
    <AuthShell title="Reset your password">
      <ActionForm action={requestReset} submitLabel="Send reset link">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
      </ActionForm>
    </AuthShell>
  );
}
