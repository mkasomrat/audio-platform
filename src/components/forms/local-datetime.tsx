"use client";
import { useEffect, useState } from "react";

// Shows the user's local time; submits an exact UTC ISO string so time zones never shift.
export function LocalDateTime({ name, label, defaultIso }: { name: string; label: string; defaultIso?: string | null }) {
  const [local, setLocal] = useState("");
  useEffect(() => {
    if (!defaultIso) return;
    const d = new Date(defaultIso), p = (n: number) => String(n).padStart(2, "0");
    setLocal(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`);
  }, [defaultIso]);
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <div className="space-y-1.5">
      <label htmlFor={`${name}-l`} className="text-sm font-medium">{label}</label>
      <input id={`${name}-l`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base" />
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}
