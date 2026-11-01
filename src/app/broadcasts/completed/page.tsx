import type { Metadata } from "next";
import { BroadcastTabs } from "@/components/broadcasts/tabs";
import { BroadcastList } from "@/components/broadcasts/broadcast-list";
import { listBroadcasts } from "@/lib/data/broadcasts";

export const metadata: Metadata = { title: "Past shows" };

export default async function Page() {
  const result = await listBroadcasts("ended");
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Past shows</h1>
      <BroadcastTabs active="/broadcasts/completed" />
      <BroadcastList result={result} emptyTitle="No finished shows yet" emptyHint="Shows appear here after they end." />
    </>
  );
}
