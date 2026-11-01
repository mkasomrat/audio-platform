import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/forms/action-form";
import { AuthShell } from "@/components/forms/auth-shell";
import { Input } from "@/components/ui/input";
import { signUp } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Create account" };

export default function Register() {
  return (
    <AuthShell title="Create account" footer={<>Already registered? <Link className="font-semibold text-brand" href="/login">Log in</Link></>}>
      <ActionForm action={signUp} submitLabel="Create account">
        <Input label="Display name" name="displayName" autoComplete="nickname" required minLength={2} maxLength={50} />
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Password (8+ characters)" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </ActionForm>
    </AuthShell>
  );
}
