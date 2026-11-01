"use client";
import { useEffect, useRef } from "react";
import { Button } from "./button";

type Props = { open: boolean; title: string; description: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void };

// Use for every destructive action. Names the exact action on the confirm button.
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onCancel} className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-5 text-ink backdrop:bg-black/50">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
