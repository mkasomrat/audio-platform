import { Button } from "@/components/ui/button";
import { BroadcastList } from "@/components/broadcasts/broadcast-list";
import { EmptyState } from "@/components/ui/feedback";
import { listBroadcasts, listLibrary } from "@/lib/data/broadcasts";
import Link from "next/link";

export default async function Home() {
  const [live, upcoming, library] = await Promise.all([listBroadcasts("live", 6), listBroadcasts("scheduled", 3), listLibrary(4)]);
  return (
    <div className="space-y-12">
      <section className="py-6 sm:py-12">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">Listen when it happens. Listen again when it doesn&rsquo;t.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">Join live audio shows without an account, then find every finished show in the library.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/broadcasts/live">See what&rsquo;s live</Button>
          <Button href="/library" variant="secondary">Browse the library</Button>
        </div>
      </section>
      <section aria-labelledby="live-h">
        <h2 id="live-h" className="mb-4 text-2xl font-bold">Live now</h2>
        <BroadcastList result={live} emptyTitle="Nothing is live right now" emptyHint="Check the upcoming shows or browse the library." />
      </section>
      <section aria-labelledby="up-h">
        <div className="mb-4 flex items-end justify-between"><h2 id="up-h" className="text-2xl font-bold">Coming up</h2><Link href="/broadcasts/upcoming" className="text-sm font-semibold text-brand">All upcoming</Link></div>
        <BroadcastList result={upcoming} emptyTitle="No shows scheduled yet" emptyHint="New broadcasts will appear here once they're scheduled." />
      </section>
      <section aria-labelledby="lib-h">
        <div className="mb-4 flex items-end justify-between"><h2 id="lib-h" className="text-2xl font-bold">Recently added audio</h2><Link href="/library" className="text-sm font-semibold text-brand">Open library</Link></div>
        {library.data.length ? <ul className="grid gap-3 sm:grid-cols-2">{library.data.map((a) => <li key={a.id} className="rounded-xl border border-line bg-surface p-4 font-medium">{a.title}</li>)}</ul>
          : <EmptyState title="The library is empty" hint="Finished shows are added by administrators after they are archived." />}
      </section>
    </div>
  );
}
