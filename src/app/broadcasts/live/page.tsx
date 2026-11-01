import type { Metadata } from "next";
import { BroadcastTabs } from "@/components/broadcasts/tabs";
import { BroadcastList } from "@/components/broadcasts/broadcast-list";
import { listBroadcasts } from "@/lib/data/broadcasts";

export const metadata: Metadata = { title: "Live now" };

export default async function Page() {
  const result = await listBroadcasts("live");
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Live now</h1>
      <BroadcastTabs active="/broadcasts/live" />
      <BroadcastList result={result} emptyTitle="Nothing is live right now" emptyHint="Check upcoming shows, or listen to a past show in the library." />
    </>
  );
}
