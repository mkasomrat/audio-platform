"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

type Props = { action: (prev: FormState, fd: FormData) => Promise<FormState>; submitLabel: string; children: React.ReactNode; className?: string };

export function ActionForm({ action, submitLabel, children, className }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      {state?.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      {state?.message && <p role="status" className="text-sm font-medium text-brand">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Working…" : submitLabel}</Button>
    </form>
  );
}
