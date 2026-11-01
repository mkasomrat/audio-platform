import Link from "next/link";

export function SectionNav({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div className="mb-6 space-y-3">
      <p className="font-display text-sm font-bold text-muted">{title}</p>
      <nav aria-label={title} className="flex gap-2 overflow-x-auto pb-1">
        {items.map((i) => <Link key={i.href} href={i.href} className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand">{i.label}</Link>)}
      </nav>
    </div>
  );
}
