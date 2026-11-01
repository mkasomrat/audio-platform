import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSessionWithRoles } from "@/lib/auth/roles";

const nav = [
  { href: "/broadcasts/live", label: "Live" },
  { href: "/broadcasts/upcoming", label: "Upcoming" },
  { href: "/broadcasts/completed", label: "Past shows" },
  { href: "/library", label: "Library" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  let signedIn = false;
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) signedIn = Boolean((await getSessionWithRoles()).user);
  } catch { /* header must never crash the page */ }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {signedIn
            ? <Button href="/dashboard" variant="secondary" className="hidden sm:inline-flex">Dashboard</Button>
            : <Button href="/login" variant="secondary" className="hidden sm:inline-flex">Log in</Button>}
          <details className="relative md:hidden">
            <summary aria-label="Open menu" className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-surface"><Menu className="size-5" aria-hidden /></summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-lg">
              {nav.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-bg">{n.label}</Link>)}
              <Link href={signedIn ? "/dashboard" : "/login"} className="block rounded-lg px-3 py-3 text-sm font-semibold text-brand hover:bg-bg">{signedIn ? "Dashboard" : "Log in"}</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
