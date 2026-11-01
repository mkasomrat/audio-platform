import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { getBrandName } from "@/lib/data/settings";
import { capacity, maxTotalParticipants, PROVIDER_LIMITS } from "@/config/quotas";
import { saveBranding } from "./actions";
import { livekitConfigured } from "@/lib/livekit/server";
import { storageConfigured } from "@/lib/storage/s3";
import { estimateMonthlyMinutes } from "@/lib/data/usage";

export default async function Settings() {
  const name = await getBrandName();
  const minutes = await estimateMonthlyMinutes();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card><ActionForm action={saveBranding} submitLabel="Save"><Input label="Platform name" name="name" defaultValue={name} required minLength={2} maxLength={40} /></ActionForm></Card>
      <Card className="space-y-1 text-sm">
        <p className="font-semibold">Capacity limits (read from configuration)</p>
        <p>Listeners: {capacity.maxListeners} · Speakers: {capacity.maxSpeakers} · Broadcasters: {capacity.maxBroadcasters}</p>
        <p>Total participants allowed: {maxTotalParticipants} of {PROVIDER_LIMITS.livekitMaxParticipants} provider cap</p>
        <p>Max broadcast length: {capacity.maxBroadcastDurationMin} minutes</p>
        <p className="text-muted">The long-term target of {capacity.futureTargetListeners} listeners is not available on the free plan. Live usage is on the Status page.</p>
      </Card>
      <Card className="space-y-1 text-sm">
        <p className="font-semibold">Integrations (keys present, not a live health check)</p>
        <p>Live audio (LiveKit): {livekitConfigured() ? "keys present" : "NOT configured"}</p>
        <p>Recording storage: {storageConfigured() ? "keys present" : "NOT configured"}</p>
        <p>Connection minutes this month: {minutes === null ? "unavailable" : `about ${minutes} (estimate)`} of {PROVIDER_LIMITS.livekitMonthlyMinutes.value}{PROVIDER_LIMITS.livekitMonthlyMinutes.verified ? "" : " (limit unverified)"}</p>
        <p className="text-muted">The estimate comes from join and leave records, not LiveKit&rsquo;s meter. Check the LiveKit dashboard for the real figure.</p>
      </Card>
    </div>
  );
}
