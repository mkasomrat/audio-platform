"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type Req = { id: string; participant_identity: string; display_name: string | null };
type Data = { status: string; pending: Req[]; speakers: Req[]; listeners: { identity: string; name: string }[]; total: number; error: string | null };

export function ModerationPanel({ broadcastId, live }: { broadcastId: string; live: boolean }) {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [kick, setKick] = useState<{ identity: string; name: string } | null>(null);
  const seen = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/live/requests?broadcastId=${broadcastId}`); const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Couldn't load requests."); return; }
      setErr(null); setD(j);
      if (j.pending.length > seen.current) toast(`${j.pending.length} listener${j.pending.length > 1 ? "s" : ""} want to speak`, "info");
      seen.current = j.pending.length;
    } catch { setErr("Connection problem. Retrying…"); }
  }, [broadcastId, toast]);

  useEffect(() => { if (!live) return; load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [live, load]);

  async function act(action: string, extra: Record<string, string>) {
    const r = await fetch("/api/live/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ broadcastId, action, ...extra }) });
    const j = await r.json();
    toast(r.ok ? "Done." : j.error ?? "Failed.", r.ok ? "success" : "error"); load();
  }
  if (!live) return <Card><p className="text-sm text-muted">Moderation controls appear while the broadcast is live.</p></Card>;
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Moderation</h2><Badge>{d ? `${d.total} in room` : "…"}</Badge></div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {d?.error && <p role="alert" className="text-sm text-danger">{d.error}</p>}
      <section aria-label="Speaker requests" className="space-y-2">
        <h3 className="text-sm font-semibold">Requests ({d?.pending.length ?? 0})</h3>
        {!d?.pending.length ? <p className="text-sm text-muted">No one is waiting.</p> : d.pending.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2"><span>{r.display_name ?? "Listener"}</span>
            <span className="flex gap-2"><Button className="min-h-9 px-3" onClick={() => act("approve", { requestId: r.id })}>Approve</Button><Button variant="secondary" className="min-h-9 px-3" onClick={() => act("reject", { requestId: r.id })}>Reject</Button></span></div>))}
      </section>
      <section aria-label="Speakers" className="space-y-2">
        <h3 className="text-sm font-semibold">Speakers ({d?.speakers.length ?? 0})</h3>
        {!d?.speakers.length ? <p className="text-sm text-muted">No approved speakers.</p> : d.speakers.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2"><span>{s.display_name ?? "Speaker"}</span>
            <span className="flex gap-2"><Button variant="secondary" className="min-h-9 px-3" onClick={() => act("mute", { identity: s.participant_identity })}>Mute</Button><Button variant="secondary" className="min-h-9 px-3" onClick={() => act("revoke", { identity: s.participant_identity })}>Remove speaker</Button></span></div>))}
      </section>
      <section aria-label="Listeners" className="space-y-2">
        <h3 className="text-sm font-semibold">Listeners</h3>
        {!d?.listeners.length ? <p className="text-sm text-muted">No listeners yet.</p> : d.listeners.slice(0, 30).map((l) => (
          <div key={l.identity} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2"><span>{l.name}</span>
            <span className="flex gap-2"><Button variant="secondary" className="min-h-9 px-3" onClick={() => act("promote", { identity: l.identity, name: l.name })}>Make speaker</Button><Button variant="ghost" className="min-h-9 px-3" onClick={() => setKick(l)}>Remove</Button></span></div>))}
        {(d?.listeners.length ?? 0) > 30 && <p className="text-xs text-muted">Showing the first 30 listeners.</p>}
      </section>
      <ConfirmDialog open={Boolean(kick)} title="Remove this listener?" description={`${kick?.name ?? "This listener"} will be disconnected. They can rejoin unless you end the show.`} confirmLabel="Remove listener" onCancel={() => setKick(null)} onConfirm={() => { if (kick) act("kick", { identity: kick.identity }); setKick(null); }} />
    </Card>
  );
}
