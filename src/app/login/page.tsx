import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/forms/action-form";
import { AuthShell } from "@/components/forms/auth-shell";
import { Input } from "@/components/ui/input";
import { signIn } from "@/app/auth/actions";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Log in" footer={<>New here? <Link className="font-semibold text-brand" href="/register">Create an account</Link>. Listening doesn&rsquo;t require one.</>}>
      {sp.error === "link" && <p role="alert" className="mb-4 text-sm text-danger">That link is invalid or expired. Request a new one.</p>}
      <ActionForm action={signIn} submitLabel="Log in">
        <input type="hidden" name="next" value={safeNext(sp.next)} />
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required />
        <p className="text-sm"><Link className="font-semibold text-brand" href="/forgot-password">Forgot your password?</Link></p>
      </ActionForm>
    </AuthShell>
  );
}
