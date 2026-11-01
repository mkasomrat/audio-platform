"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Hand, Headphones, LogOut, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useLiveRoom } from "./use-live-room";
import { ConnBadge, QualityBadge } from "./status-bits";

type Session = { identity: string; proof: string };

export function ListenerPlayer({ broadcastId, initialStatus }: { broadcastId: string; initialStatus: string }) {
  const live = useLiveRoom();
  const toast = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [req, setReq] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const joined = live.conn !== "idle" && live.conn !== "disconnected";

  useEffect(() => {
    if (joined) return;
    const t = setInterval(async () => { try { const r = await (await fetch(`/api/live/status?broadcastId=${broadcastId}`)).json(); if (r.status) setStatus(r.status); } catch {} }, 15000);
    return () => clearInterval(t);
  }, [broadcastId, joined]);

  const join = useCallback(async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ broadcastId, mode: "listen" }) });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error ?? "Couldn't join."); if (res.status === 409 && !d.code) setStatus("scheduled"); return; }
      setSession({ identity: d.identity, proof: d.proof }); setReq("none");
      await live.connect(d.url, d.token, false);
    } catch { setMsg("Couldn't reach the server. Check your connection."); } finally { setBusy(false); }
  }, [broadcastId, live]);

  const call = useCallback(async (action: "raise" | "cancel" | "status") => {
    if (!session) return null;
    const res = await fetch("/api/live/speaker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ broadcastId, action, ...session }) });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Request failed.", "error"); return null; }
    setReq(d.status === "approved" || d.status === "pending" ? d.status : "none"); return d.status as string;
  }, [broadcastId, session, toast]);

  const wasSpeaker = useRef(false);
  useEffect(() => {
    if (live.canSpeak && !wasSpeaker.current) toast("You're now a speaker. Tap the microphone button to unmute.", "success");
    if (!live.canSpeak && wasSpeaker.current) { setReq("none"); toast("Your speaker access ended.", "info"); }
    wasSpeaker.current = live.canSpeak;
  }, [live.canSpeak, toast]);

  useEffect(() => {
    if (!joined || req !== "pending") return;
    const t = setInterval(() => { call("status"); }, 5000);
    return () => clearInterval(t);
  }, [joined, req, call]);

  if (!joined) {
    return (
      <Card className="space-y-3">
        {status === "live" ? <>
          <p className="font-semibold">This show is live.</p>
          <Button onClick={join} disabled={busy}><Headphones className="size-5" aria-hidden />{busy ? "Joining…" : live.conn === "disconnected" ? "Rejoin live audio" : "Join live audio"}</Button>
          <p className="text-xs text-muted">No account needed. Your microphone stays off.</p>
        </> : <p className="text-sm text-muted">{status === "ended" ? "This broadcast has ended." : "Listening opens here when the host starts the show."}</p>}
        {(msg || live.error) && <p role="alert" className="text-sm font-medium text-danger">{msg ?? live.error}</p>}
        {live.conn === "disconnected" && <p role="status" className="text-sm text-muted">You were disconnected. Rejoin to keep listening.</p>}
        <div ref={live.audioBox} hidden />
      </Card>
    );
  }
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap gap-2"><ConnBadge conn={live.conn} /><QualityBadge quality={live.quality} /><span className="text-sm text-muted">{live.listeners} listening</span></div>
      <div ref={live.audioBox} hidden />
      <div className="flex items-center gap-3">
        <Button variant="secondary" aria-label={muted ? "Unmute playback" : "Mute playback"} onClick={() => { setMuted(!muted); live.setMuted(!muted); }}>{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</Button>
        <input type="range" min={0} max={1} step={0.05} value={volume} aria-label="Volume" className="flex-1" onChange={(e) => { const v = Number(e.target.value); setVolume(v); live.setVolume(v); }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {live.canSpeak ? (
          <Button onClick={live.toggleMic}>{live.micOn ? <><Mic className="size-5" aria-hidden />Mute microphone</> : <><MicOff className="size-5" aria-hidden />Unmute microphone</>}</Button>
        ) : req === "pending" ? <Button variant="secondary" onClick={() => call("cancel")}><Hand className="size-5" aria-hidden />Cancel request</Button>
          : <Button variant="secondary" onClick={() => call("raise")} disabled={live.conn !== "connected"}><Hand className="size-5" aria-hidden />Ask to speak</Button>}
        <Button variant="ghost" onClick={async () => { if (req === "pending") await call("cancel"); await live.disconnect(); setSession(null); }}><LogOut className="size-5" aria-hidden />Leave</Button>
      </div>
      {req === "pending" && <p role="status" className="text-sm text-muted">Request sent. Waiting for the host to approve.</p>}
      {live.error && <p role="alert" className="text-sm font-medium text-danger">{live.error}</p>}
      {live.conn === "reconnecting" && <p role="status" className="text-sm text-muted">Connection interrupted. Trying to reconnect automatically…</p>}
    </Card>
  );
}
