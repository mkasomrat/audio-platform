import { BroadcastCard } from "./broadcast-card";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import type { Broadcast, Result } from "@/lib/data/broadcasts";

export function BroadcastList({ result, emptyTitle, emptyHint }: { result: Result<Broadcast[]>; emptyTitle: string; emptyHint: string }) {
  if (result.error) return <ErrorState title="Couldn't load broadcasts" hint={result.error} />;
  if (!result.data.length) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.data.map((b) => <BroadcastCard key={b.id} b={b} />)}</div>;
}
