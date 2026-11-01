import { requireRole } from "@/lib/auth/roles";
import { SectionNav } from "@/components/layout/section-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin", "super_admin"]);
  return (
    <>
      <SectionNav title="Admin" items={[
        { href: "/admin", label: "Overview" }, { href: "/admin/users", label: "Users" }, { href: "/admin/broadcasts", label: "Broadcasts" },
        { href: "/admin/categories", label: "Categories" }, { href: "/admin/recordings", label: "Recordings" }, { href: "/admin/library", label: "Library" },
        { href: "/admin/status", label: "Status" }, { href: "/admin/settings", label: "Settings" }, { href: "/admin/audit-logs", label: "Audit log" }]} />
      {children}
    </>
  );
}
