import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu, type MenuGroup } from "./mobile-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSessionWithRoles, type RoleKey } from "@/lib/auth/roles";
import { getBrandName } from "@/lib/data/settings";

const VERSION = "0.1.0";
const nav = [
  { href: "/broadcasts/live", label: "Live" },
  { href: "/broadcasts/upcoming", label: "Upcoming" },
  { href: "/broadcasts/completed", label: "Past shows" },
  { href: "/library", label: "Library" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  let signedIn = false, roles: RoleKey[] = [];
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) { const s = await getSessionWithRoles(); signedIn = Boolean(s.user); roles = s.roles; }
  } catch { /* the header must never crash the page */ }
  const brand = await getBrandName();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const canStudio = isAdmin || roles.includes("broadcaster") || roles.includes("moderator");

  const desktop = [...nav, ...(canStudio ? [{ href: "/studio", label: "Studio" }] : []), ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];
  const groups: MenuGroup[] = [
    { id: "listen", label: "Listen", bn: "শুনুন", items: [
      { href: "/broadcasts/live", label: "Live now", bn: "লাইভ" },
      { href: "/broadcasts/upcoming", label: "Upcoming", bn: "আসন্ন শো" },
      { href: "/broadcasts/completed", label: "Past shows", bn: "পূর্বের শো" }] },
    { id: "library", label: "Library", bn: "লাইব্রেরি", href: "/library" },
    { id: "about", label: "About", bn: "সম্পর্কে", href: "/about" },
    signedIn
      ? { id: "account", label: "Account", bn: "অ্যাকাউন্ট", items: [
          { href: "/dashboard", label: "Dashboard", bn: "ড্যাশবোর্ড" },
          { href: "/dashboard/listening", label: "My listening", bn: "আমার শোনা" },
          { href: "/dashboard/playlists", label: "Playlists", bn: "প্লেলিস্ট" },
          ...(canStudio ? [{ href: "/studio", label: "Studio", bn: "স্টুডিও" }] : []),
          ...(isAdmin ? [{ href: "/admin", label: "Admin", bn: "অ্যাডমিন" }] : [])] }
      : { id: "account", label: "Account", bn: "অ্যাকাউন্ট", items: [
          { href: "/login", label: "Log in", bn: "লগইন" },
          { href: "/register", label: "Create account", bn: "নতুন অ্যাকাউন্ট" }] },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {desktop.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink">{n.label}</Link>)}
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
