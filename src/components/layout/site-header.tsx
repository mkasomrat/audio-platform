import Link from "next/link";
import { CalendarClock, History, Info, Library, Mic, Radio, ShieldCheck, type LucideIcon } from "lucide-react";
import { Logo } from "./logo";
import { MobileMenu, type MenuGroup } from "./mobile-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSessionWithRoles, type RoleKey } from "@/lib/auth/roles";
import { getBrandName } from "@/lib/data/settings";

const VERSION = "0.1.0";
const nav: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/broadcasts/live", label: "Live", Icon: Radio },
  { href: "/broadcasts/upcoming", label: "Upcoming", Icon: CalendarClock },
  { href: "/broadcasts/completed", label: "Past shows", Icon: History },
  { href: "/library", label: "Library", Icon: Library },
  { href: "/about", label: "About", Icon: Info },
];

export async function SiteHeader() {
  let signedIn = false, roles: RoleKey[] = [];
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) { const s = await getSessionWithRoles(); signedIn = Boolean(s.user); roles = s.roles; }
  } catch { /* the header must never crash the page */ }
  const brand = await getBrandName();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const canStudio = isAdmin || roles.includes("broadcaster") || roles.includes("moderator");

  const desktop = [...nav, ...(canStudio ? [{ href: "/studio", label: "Studio", Icon: Mic }] : []), ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: ShieldCheck }] : [])];
  const groups: MenuGroup[] = [
    { id: "listen", label: "Listen", icon: "headphones", items: [
      { href: "/broadcasts/live", label: "Live now", icon: "radio" },
      { href: "/broadcasts/upcoming", label: "Upcoming", icon: "upcoming" },
      { href: "/broadcasts/completed", label: "Past shows", icon: "history" }] },
    { id: "library", label: "Library", icon: "library", href: "/library" },
    { id: "about", label: "About", icon: "info", href: "/about" },
    signedIn
      ? { id: "account", label: "Account", icon: "user", items: [
          { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
          { href: "/dashboard/listening", label: "My listening", icon: "headphones" },
          { href: "/dashboard/playlists", label: "Playlists", icon: "playlists" },
          ...(canStudio ? [{ href: "/studio", label: "Studio", icon: "studio" as const }] : []),
          ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "admin" as const }] : [])] }
      : { id: "account", label: "Account", icon: "user", items: [
          { href: "/login", label: "Log in", icon: "login" },
          { href: "/register", label: "Create account", icon: "signup" }] },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {desktop.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink"><Icon className="size-4" aria-hidden />{label}</Link>))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button href={signedIn ? "/dashboard" : "/login"} variant="secondary" className="hidden sm:inline-flex">{signedIn ? "Dashboard" : "Log in"}</Button>
          <MobileMenu brand={brand} version={VERSION} groups={groups} />
        </div>
      </div>
    </header>
  );
}
