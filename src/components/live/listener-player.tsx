"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hand, Headphones, LogOut, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useLiveRoom } from "./use-live-room";
import { ConnBadge, QualityBadge } from "./status-bits";

type Session = { identity: string; proof: string };

export function ListenerPlayer({ broadcastId, initialStatus, scheduledAt }: { broadcastId: string; initialStatus: string; scheduledAt?: string | null }) {
  const live = useLiveRoom();
  const toast = useToast();
  const router = useRouter();
  const startsAt = scheduledAt ? new Date(scheduledAt).getTime() : null;
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [autoMsg, setAutoMsg] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [req, setReq] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [near, setNear] = useState(false);
  const [activated, setActivated] = useState(false);
  const userLeft = useRef(false), autoTried = useRef(false), prevStatus = useRef(initialStatus);
  const joined = live.conn !== "idle" && live.conn !== "disconnected";

  // Remember whether the browser has seen a touch yet (needed before it allows sound).
  useEffect(() => {
    if ((navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) setActivated(true);
    const h = () => setActivated(true);
    window.addEventListener("pointerup", h, { once: true }); window.addEventListener("keydown", h, { once: true });
    return () => { window.removeEventListener("pointerup", h); window.removeEventListener("keydown", h); };
  }, []);

  // Watch for the show going live: slow far from the start time, fast around it, paused while connected.
  useEffect(() => {
    if (joined || status === "ended") return;
    let alive = true, timer: ReturnType<typeof setTimeout>;
    const left = () => (startsAt === null ? Infinity : startsAt - Date.now());
    const delay = () => (status === "live" ? 5000 : left() > 600_000 ? 30_000 : left() > 0 ? 10_000 : left() > -900_000 ? 3_000 : 10_000);
    const tick = async () => {
      try { const r = await (await fetch(`/api/live/status?broadcastId=${broadcastId}`)).json(); if (alive && r.status) setStatus(r.status); } catch { /* try again next time */ }
      if (alive) { setNear(left() < 30 * 60_000); timer = setTimeout(tick, delay()); }
    };
    setNear(left() < 30 * 60_000);
    timer = setTimeout(tick, delay());
    const onVis = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void tick(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [broadcastId, joined, status, startsAt]);

  // Keep the screen awake from 30 minutes before the start until the listener leaves (where the browser supports it).
  useEffect(() => {
    if (!(joined || (near && (status === "scheduled" || status === "live")))) return;
    type Lock = { release: () => Promise<void> };
    let lock: Lock | null = null;
    const request = async () => { try { const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<Lock> } }).wakeLock; if (wl && document.visibilityState === "visible") lock = await wl.request("screen"); } catch { /* not supported or denied */ } };
    void request();
    const onVis = () => { if (document.visibilityState === "visible") void request(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); };
  }, [joined, near, status]);

  const join = useCallback(async () => {
    setBusy(true); setMsg(null); userLeft.current = false;
    try {
      const res = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ broadcastId, mode: "listen" }) });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error ?? "Couldn't join."); if (res.status === 409 && !d.code) setStatus("scheduled"); return; }
      setSession({ identity: d.identity, proof: d.proof }); setReq("none");
      await live.connect(d.url, d.token, false);
    } catch { setMsg("Couldn't reach the server. Check your connection."); } finally { setBusy(false); setAutoMsg(false); }
  }, [broadcastId, live]);
  const joinRef = useRef(join); joinRef.current = join;

  // When the show flips to live: refresh the page (hides the countdown) and join automatically, with a short random delay so a crowd doesn't hit the server in the same instant.
  useEffect(() => {
    if (status === "live" && prevStatus.current !== "live") router.refresh();
    if (status !== "live") autoTried.current = false;
    prevStatus.current = status;
  }, [status, router]);
  useEffect(() => {
    if (status !== "live" || joined || busy || userLeft.current || autoTried.current) return;
    setAutoMsg(true);
    const t = setTimeout(() => { if (autoTried.current) return; autoTried.current = true; void joinRef.current(); }, Math.random() * 2500);
    return () => clearTimeout(t);
  }, [status, joined, busy]);

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
          {autoMsg && !msg && <p role="status" className="text-sm text-muted">Joining the live audio automatically&hellip;</p>}
          <Button onClick={join} disabled={busy}><Headphones className="size-5" aria-hidden />{busy ? "Joining…" : live.conn === "disconnected" || userLeft.current || msg ? "Join live audio" : "Join now"}</Button>
        </> : status === "ended" ? <p className="text-sm text-muted">This broadcast has ended.</p> : (
          <div className="space-y-2">
            <p className="text-sm text-muted">Keep this page open. When the host goes live, the sound starts by itself.</p>
            {!activated && <p className="text-xs text-muted">Tip: touch the screen once anywhere on this page, so your browser allows sound to start automatically.</p>}
            {near && <p className="text-xs text-muted">Your screen is kept awake until the show starts, where your browser allows it.</p>}
          </div>)}
        {(msg || live.error) && <p role="alert" className="text-sm font-medium text-danger">{msg ?? live.error}</p>}
        {live.conn === "disconnected" && !userLeft.current && <p role="status" className="text-sm text-muted">You were disconnected. Join again to keep listening.</p>}
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
        <Button variant="ghost" onClick={async () => { userLeft.current = true; if (req === "pending") await call("cancel"); await live.disconnect(); setSession(null); }}><LogOut className="size-5" aria-hidden />Leave</Button>
      </div>
      {req === "pending" && <p role="status" className="text-sm text-muted">Request sent. Waiting for the host to approve.</p>}
      {live.error && <p role="alert" className="text-sm font-medium text-danger">{live.error}</p>}
      {live.conn === "reconnecting" && <p role="status" className="text-sm text-muted">Connection interrupted. Trying to reconnect automatically…</p>}
      {live.audioBlocked && (
        <button type="button" onClick={() => void live.unlockAudio()} className="fixed inset-x-4 bottom-4 z-50 flex animate-pulse items-center justify-center gap-3 rounded-2xl bg-brand p-4 text-base font-bold text-brand-ink shadow-xl">
          <Volume2 className="size-6" aria-hidden />Tap anywhere to start the sound
        </button>)}
    </Card>
  );
}
