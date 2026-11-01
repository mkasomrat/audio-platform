import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/broadcasts/live", label: "Live now" },
  { href: "/broadcasts/upcoming", label: "Upcoming" },
  { href: "/broadcasts/completed", label: "Past shows" },
];

export function BroadcastTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Broadcast lists" className="mb-6 flex gap-2 overflow-x-auto">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active === t.href ? "page" : undefined}
          className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold", active === t.href ? "border-brand bg-brand text-brand-ink" : "border-line text-muted hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
