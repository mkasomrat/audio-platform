import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, ErrorState } from "@/components/ui/feedback";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { createClient } from "@/lib/supabase/server";
import { grantRole, revokeRole } from "./actions";

export default async function Users({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const [{ data: profiles, error }, { data: links }] = await Promise.all([
    db.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("user_roles").select("user_id,app_roles(key)"),
  ]);
  if (error) return <ErrorState title="Couldn't load users" />;
  const roles = new Map<string, string[]>();
  (links ?? []).forEach((l) => { const k = (l.app_roles as unknown as { key: string } | null)?.key; if (k) roles.set(l.user_id, [...(roles.get(l.user_id) ?? []), k]); });
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Users</h1>
      {sp.error && <p role="alert" className="mb-4 text-sm font-medium text-danger">{sp.error}</p>}
      <div className="space-y-3">
        {(profiles ?? []).map((p) => {
          const mine = roles.get(p.id) ?? [];
          return (
            <Card key={p.id} className="space-y-3">
              <div><p className="font-semibold">{p.display_name}</p><p className="break-all text-xs text-muted">{p.id}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {mine.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1"><Badge tone="brand">{r.replace("_", " ")}</Badge>
                    {r !== "listener" && <ConfirmForm action={revokeRole} hidden={{ userId: p.id, role: r }} buttonLabel="Remove" title={`Remove ${r.replace("_", " ")}?`} description={`${p.display_name} will lose this role immediately.`} confirmLabel="Remove role" />}
                  </span>))}
              </div>
              <form action={grantRole} className="flex gap-2">
                <input type="hidden" name="userId" value={p.id} />
                <select name="role" aria-label={`Role to add for ${p.display_name}`} className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3">
                  {["broadcaster", "moderator", "admin", "super_admin"].filter((r) => !mine.includes(r)).map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
                <Button type="submit" variant="secondary">Add role</Button>
              </form>
            </Card>);
        })}
      </div>
    </>
  );
}
