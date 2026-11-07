"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; bn: string };
export type MenuGroup = { id: string; label: string; bn: string; href?: string; items?: Item[] };

export function MobileMenu({ brand, version, groups }: { brand: string; version: string; groups: MenuGroup[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(groups.find((g) => g.items)?.id ?? null);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); openRef.current?.focus(); };
  }, [open]);

  const row = "block border-b border-line/60 py-5 font-display text-3xl font-extrabold";

  return (
    <>
      <button ref={openRef} type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface md:hidden"><Menu className="size-6" aria-hidden /></button>

      {mounted && open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg px-6 pb-8 pt-4 text-ink md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 font-display text-xl font-extrabold text-brand">
              <svg width="40" height="40" viewBox="0 0 28 28" aria-hidden><rect width="28" height="28" rx="8" className="fill-brand" />
                <g className="fill-brand-ink"><rect x="6" y="10" width="2.6" height="8" rx="1.3" /><rect x="10.5" y="6" width="2.6" height="16" rx="1.3" /><rect x="15" y="9" width="2.6" height="10" rx="1.3" /><rect x="19.5" y="12" width="2.6" height="4" rx="1.3" /></g></svg>
              {brand}
            </Link>
            <button ref={closeRef} type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="inline-flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand"><X className="size-6" aria-hidden /></button>
          </div>

          <nav aria-label="Menu" className="mt-6 flex-1">
            {groups.map((g) => g.items ? (
              <div key={g.id} className="border-b border-line/60">
                <button type="button" aria-expanded={expanded === g.id} aria-controls={`m-${g.id}`} onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                  className="flex w-full items-center justify-between py-5 text-left font-display text-3xl font-extrabold">
                  <span>{g.bn}<span className="ml-3 text-base font-semibold text-muted">{g.label}</span></span>
                  <ChevronDown aria-hidden className={cn("size-7 shrink-0 transition-transform", expanded === g.id && "rotate-180")} />
                </button>
                {expanded === g.id && (
                  <ul id={`m-${g.id}`} className="space-y-1 pb-4">
                    {g.items.map((i) => (
                      <li key={i.href}><Link href={i.href} className="block rounded-lg px-2 py-3 text-xl font-semibold hover:bg-surface">{i.bn}<span className="ml-2 text-sm font-medium text-muted">{i.label}</span></Link></li>
                    ))}
                  </ul>)}
              </div>
            ) : (
              <Link key={g.id} href={g.href ?? "/"} className={row}>{g.bn}<span className="ml-3 text-base font-semibold text-muted">{g.label}</span></Link>
            ))}
          </nav>

          <div className="mt-8 space-y-3">
            <Button href="/broadcasts/live" className="min-h-14 w-full rounded-full text-lg">লাইভ শুনুন</Button>
            <Button href="/broadcasts/upcoming" variant="secondary" className="min-h-14 w-full rounded-full border-brand text-lg text-brand">সময়সূচি দেখুন</Button>
            <p className="pt-3 text-center font-display text-2xl text-brand/80">v{version}</p>
          </div>
        </div>, document.body)}
    </>
  );
}
