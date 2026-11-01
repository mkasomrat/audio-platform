import { requireRole } from "@/lib/auth/roles";
import { SectionNav } from "@/components/layout/section-nav";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["broadcaster", "moderator", "admin", "super_admin"]);
  return (
    <>
      <SectionNav title="Studio" items={[{ href: "/studio", label: "Overview" }, { href: "/studio/broadcasts", label: "My broadcasts" }, { href: "/studio/settings", label: "Settings" }]} />
      {children}
    </>
  );
}
