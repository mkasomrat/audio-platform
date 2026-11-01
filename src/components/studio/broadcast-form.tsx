import { ActionForm } from "@/components/forms/action-form";
import { LocalDateTime } from "@/components/forms/local-datetime";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

type B = { id: string; title: string; description: string | null; category_id: string | null; status: string; scheduled_at: string | null; cover_image_url: string | null };
type Props = { action: (p: FormState, fd: FormData) => Promise<FormState>; categories: { id: string; name: string }[]; b?: B; submitLabel: string };

export function BroadcastForm({ action, categories, b, submitLabel }: Props) {
  const locked = b && !["draft", "scheduled", "cancelled"].includes(b.status);
  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      {b && <input type="hidden" name="id" value={b.id} />}
      <Input label="Title" name="title" defaultValue={b?.title ?? ""} required minLength={3} maxLength={150} />
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <textarea id="description" name="description" rows={5} maxLength={2000} defaultValue={b?.description ?? ""} className="w-full rounded-lg border border-line bg-surface p-3 text-base" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="category_id" className="text-sm font-medium">Category</label>
        <select id="category_id" name="category_id" defaultValue={b?.category_id ?? ""} className="min-h-11 w-full rounded-lg border border-line bg-surface px-3">
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <LocalDateTime name="scheduled_at" label="Start time (your local time)" defaultIso={b?.scheduled_at} />
      <Input label="Cover image link (https://…, optional)" name="cover_image_url" type="url" defaultValue={b?.cover_image_url ?? ""} />
      {locked ? <p className="text-sm text-muted">Status: {b?.status}. It can&rsquo;t be changed here.</p> : (
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={b?.status ?? "draft"} className="min-h-11 w-full rounded-lg border border-line bg-surface px-3">
            <option value="draft">Draft (hidden from the public)</option><option value="scheduled">Scheduled (public)</option><option value="cancelled">Cancelled</option>
          </select>
        </div>)}
    </ActionForm>
  );
}
