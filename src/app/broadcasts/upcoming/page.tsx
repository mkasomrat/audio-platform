import type { Metadata } from "next";
import { BroadcastTabs } from "@/components/broadcasts/tabs";
import { BroadcastList } from "@/components/broadcasts/broadcast-list";
import { listBroadcasts } from "@/lib/data/broadcasts";

export const metadata: Metadata = { title: "Upcoming broadcasts" };

export default async function Page() {
  const result = await listBroadcasts("scheduled");
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Upcoming broadcasts</h1>
      <BroadcastTabs active="/broadcasts/upcoming" />
      <BroadcastList result={result} emptyTitle="No shows scheduled yet" emptyHint="Scheduled broadcasts will appear here." />
    </>
  );
}
