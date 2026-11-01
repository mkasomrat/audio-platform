import { Card } from "@/components/ui/card";

export function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-bold">{title}</h1>
      <Card>{children}</Card>
      {footer && <p className="mt-4 text-sm text-muted">{footer}</p>}
    </div>
  );
}
