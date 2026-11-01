"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = { action: (fd: FormData) => void | Promise<void>; hidden: Record<string, string>; buttonLabel: string; title: string; description: string; confirmLabel: string };

export function ConfirmForm({ action, hidden, buttonLabel, title, description, confirmLabel }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={ref} action={action}>{Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}</form>
      <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <ConfirmDialog open={open} title={title} description={description} confirmLabel={confirmLabel}
        onCancel={() => setOpen(false)} onConfirm={() => { setOpen(false); ref.current?.requestSubmit(); }} />
    </>
  );
}
