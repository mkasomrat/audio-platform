import { cn } from "@/lib/utils";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "live" | "brand"; children: React.ReactNode }) {
  const t = { neutral: "bg-bg text-muted border-line", live: "bg-live/10 text-live border-live/40", brand: "bg-brand/10 text-brand border-brand/40" }[tone];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-line/60", className)} />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", hint }: { title?: string; hint?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-4">
      <p className="font-semibold text-danger">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

// Decorative live indicator: three bars that move only while a broadcast is live.
export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-live px-2.5 py-0.5 text-xs font-bold text-white">
      <span aria-hidden className="flex h-3 items-end gap-0.5">
        {[0, 0.25, 0.5].map((d) => <i key={d} className="eq-bar block h-3 w-0.5 bg-white" style={{ animationDelay: `${d}s` }} />)}
      </span>
      Live
    </span>
  );
}
