"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, LiveBadge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useLiveRoom } from "./use-live-room";
import { ConnBadge, QualityBadge } from "./status-bits";
import { ModerationPanel } from "./moderation-panel";

type Props = { broadcastId: string; title: string; status: string; startedAt: string | null; maxMinutes: number; recordingEnabled: boolean };
const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function StudioLive({ broadcastId, title, status: initial, startedAt: initialStart, maxMinutes, recordingEnabled }: Props) {
  const live = useLiveRoom(); const toast = useToast(); const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [startedAt, setStartedAt] = useState(initialStart);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rec, setRec] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const isLive = status === "live";

  useEffect(() => { if (!isLive || !startedAt) return; const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)), 1000); return () => clearInterval(t); }, [isLive, startedAt]);

  async function api(path: string, body: object) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  }
  async function connectHost() {
    const t = await api("/api/live/token", { broadcastId, mode: "host" });
    if (!t.ok) { setMsg(t.data.error ?? "Couldn't get a studio token."); return; }
    await live.connect(t.data.url, t.data.token, true); live.loadDevices();
  }
  async function start() {
    setBusy(true); setMsg(null);
    const r = await api("/api/live/start", { broadcastId });
    if (!r.ok) { setMsg(r.data.error ?? "Couldn't start."); setBusy(false); return; }
    setStatus("live"); setStartedAt(new Date().toISOString()); setRec(r.data.recording);
    if (r.data.recording === "failed") toast(`Recording did not start: ${r.data.message ?? "unknown reason"}`, "error");
    await connectHost(); setBusy(false);
  }
  async function end() {
    setBusy(true); setConfirmEnd(false);
    await live.disconnect();
    const r = await api("/api/live/end", { broadcastId });
    if (!r.ok) { setMsg(r.data.error ?? "Couldn't end the broadcast. Try again."); setBusy(false); return; }
    setStatus("ended"); setBusy(false); toast("Broadcast ended. The recording is being finalized.", "success"); router.refresh();
  }
  const limit = maxMinutes * 60, left = limit - elapsed;
  useEffect(() => { if (isLive && elapsed > 0 && left <= 0 && !busy) end(); /* auto-end at the configured maximum */ }, [elapsed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isLive && left === 600) toast("10 minutes until the maximum broadcast length.", "info"); }, [left, isLive, toast]);

  const connected = live.conn === "connected" || live.conn === "reconnecting";
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">{isLive ? <LiveBadge /> : <Badge>{status}</Badge>}{connected || live.conn === "connecting" ? <ConnBadge conn={live.conn} /> : null}{connected && <QualityBadge quality={live.quality} />}</div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {isLive && <div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-extrabold">{fmt(elapsed)}</p><p className="text-xs text-muted">On air</p></div><div><p className="text-2xl font-extrabold">{live.listeners}</p><p className="text-xs text-muted">Listeners</p></div><div><p className="text-2xl font-extrabold">{left > 0 ? fmt(left) : "0:00:00"}</p><p className="text-xs text-muted">Until limit</p></div></div>}
        {isLive && recordingEnabled && <p className="text-sm text-muted">Recording: {rec === "recording" ? "running on the server (continues if this tab closes)" : rec === "failed" ? "NOT running. Check Admin > Recordings." : "see Admin > Recordings"}</p>}
        <div ref={live.audioBox} hidden />
        {!isLive && status !== "ended" && <Button onClick={start} disabled={busy}><Radio className="size-5" aria-hidden />{busy ? "Starting…" : "Go live"}</Button>}
        {isLive && !connected && live.conn !== "connecting" && <Button onClick={connectHost} disabled={busy}>Reconnect studio</Button>}
        {isLive && connected && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={live.toggleMic}>{live.micOn ? <><Mic className="size-5" aria-hidden />Mute microphone</> : <><MicOff className="size-5" aria-hidden />Unmute microphone</>}</Button>
              <Button variant="danger" onClick={() => setConfirmEnd(true)} disabled={busy}>End broadcast</Button>
            </div>
            {live.devices.length > 1 && (
              <div className="space-y-1.5"><label htmlFor="mic" className="text-sm font-medium">Microphone</label>
                <select id="mic" onChange={(e) => live.pickDevice(e.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-surface px-3">{live.devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}</select></div>)}
          </div>)}
        {isLive && !connected && <Button variant="danger" onClick={() => setConfirmEnd(true)} disabled={busy}>End broadcast</Button>}
        {status === "ended" && <p className="text-sm text-muted">This broadcast has ended. The recording appears in Admin &gt; Recordings once finalized.</p>}
        {(msg || live.error) && <p role="alert" className="text-sm font-medium text-danger">{msg ?? live.error}</p>}
      </Card>
      <ModerationPanel broadcastId={broadcastId} live={isLive} />
      <ConfirmDialog open={confirmEnd} title="End this broadcast for everyone?" description="All listeners are disconnected and the recording is finalized. This can't be undone." confirmLabel="End broadcast" onCancel={() => setConfirmEnd(false)} onConfirm={end} />
    </div>
  );
}
