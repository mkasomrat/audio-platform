"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, Rewind, FastForward, SkipBack, SkipForward, ChevronUp, ChevronDown, X, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/format";

export type Track = { id: string; slug: string; title: string; src: string; duration: number | null };
type Ctx = { current: Track | null; playing: boolean; loading: boolean; play: (t: Track, queue?: Track[]) => void; toggle: () => void };
const PlayerCtx = createContext<Ctx>({ current: null, playing: false, loading: false, play: () => {}, toggle: () => {} });
export const usePlayer = () => useContext(PlayerCtx);
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const sb = useMemo(() => (process.env.NEXT_PUBLIC_SUPABASE_URL ? createClient() : null), []);
  const userId = useRef<string | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const listened = useRef({ id: "", secs: 0, counted: false, last: 0 });
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeS] = useState(1);
  const [rate, setRateS] = useState(1);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    sb?.auth.getUser().then(async ({ data }) => {
      userId.current = data.user?.id ?? null;
      if (data.user) {
        const { data: pref } = await sb.from("user_preferences").select("playback_speed").eq("user_id", data.user.id).maybeSingle();
        if (pref?.playback_speed) applyRate(Number(pref.playback_speed), false);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  const applyRate = useCallback((r: number, save: boolean) => {
    setRateS(r); const a = audio.current; if (a) { a.defaultPlaybackRate = r; a.playbackRate = r; }
    if (save && userId.current && sb) sb.from("user_preferences").upsert({ user_id: userId.current, playback_speed: r, updated_at: new Date().toISOString() }).then(() => {});
  }, [sb]);

  const saveProgress = useCallback(() => {
    const a = audio.current;
    if (!a || !current || !isFinite(a.duration) || a.duration <= 0) return;
    const pos = a.currentTime, completed = pos > a.duration - 15;
    try { completed ? localStorage.removeItem(`pos:${current.id}`) : localStorage.setItem(`pos:${current.id}`, String(Math.floor(pos))); } catch {}
    if (userId.current && sb) sb.from("listening_history").upsert({ user_id: userId.current, audio_id: current.id, progress_seconds: completed ? 0 : Math.floor(pos), completed, last_played_at: new Date().toISOString() }, { onConflict: "user_id,audio_id" }).then(() => {});
  }, [current, sb]);

  async function getResume(id: string) {
    let local = 0; try { local = Number(localStorage.getItem(`pos:${id}`)) || 0; } catch {}
    if (userId.current && sb) { const { data } = await sb.from("listening_history").select("progress_seconds").eq("user_id", userId.current).eq("audio_id", id).maybeSingle(); if (data) return data.progress_seconds || 0; }
    return local;
  }
  const seekTo = useCallback((t: number) => { const a = audio.current; if (a) { a.currentTime = Math.max(0, Math.min(t, isFinite(a.duration) ? a.duration : t)); setTime(a.currentTime); } }, []);

  const load = useCallback((t: Track) => {
    const a = audio.current; if (!a) return;
    setError(null); setLoading(true); setTime(0); setDuration(t.duration ?? 0);
    listened.current = { id: t.id, secs: 0, counted: false, last: 0 };
    a.src = t.src; a.defaultPlaybackRate = rate; a.playbackRate = rate; a.load();
    a.play().catch(() => setPlaying(false));
    getResume(t.id).then((s) => { if (s > 5) { if (a.readyState >= 1) { if (a.currentTime < 3 && (!isFinite(a.duration) || s < a.duration - 10)) a.currentTime = s; } else pendingSeek.current = s; } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  const play = useCallback((t: Track, q?: Track[]) => {
    if (current?.id === t.id) { const a = audio.current; if (a) (a.paused ? a.play().catch(() => {}) : a.pause()); return; }
    saveProgress(); setCurrent(t); setQueue(q?.length ? q : [t]); load(t);
  }, [current, load, saveProgress]);
  const toggle = useCallback(() => { const a = audio.current; if (a?.src) (a.paused ? a.play().catch(() => {}) : a.pause()); }, []);
  const step = useCallback((d: 1 | -1) => {
    if (!current) return; const i = queue.findIndex((x) => x.id === current.id), n = queue[i + d];
    if (n) { saveProgress(); setCurrent(n); load(n); } else if (d === -1) seekTo(0);
  }, [current, queue, load, saveProgress, seekTo]);
  const close = useCallback(() => { saveProgress(); const a = audio.current; if (a) { a.pause(); a.removeAttribute("src"); a.load(); } setCurrent(null); setPlaying(false); setExpanded(false); }, [saveProgress]);

  useEffect(() => { if (!playing) return; const t = setInterval(saveProgress, 10000); return () => clearInterval(t); }, [playing, saveProgress]);
  useEffect(() => { const h = () => saveProgress(); window.addEventListener("pagehide", h); return () => window.removeEventListener("pagehide", h); }, [saveProgress]);
  useEffect(() => { document.body.style.paddingBottom = current ? (expanded ? "260px" : "84px") : ""; }, [current, expanded]);

  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = new MediaMetadata({ title: current.title });
      ms.setActionHandler("play", () => audio.current?.play()); ms.setActionHandler("pause", () => audio.current?.pause());
      ms.setActionHandler("seekbackward", () => seekTo((audio.current?.currentTime ?? 0) - 15)); ms.setActionHandler("seekforward", () => seekTo((audio.current?.currentTime ?? 0) + 30));
      ms.setActionHandler("previoustrack", () => step(-1)); ms.setActionHandler("nexttrack", () => step(1));
      ms.setActionHandler("seekto", (d) => { if (typeof d.seekTime === "number") seekTo(d.seekTime); });
    } catch { /* unsupported actions are ignored */ }
  }, [current, step, seekTo]);

  const onTime = () => {
    const a = audio.current!; setTime(a.currentTime);
    const l = listened.current, d = a.currentTime - l.last; l.last = a.currentTime;
    if (!a.paused && d > 0 && d < 2) l.secs += d;
    if (!l.counted && l.secs >= 30 && l.id) { l.counted = true; fetch("/api/library/play", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioId: l.id }) }).catch(() => {}); }
  };

  const ctx = useMemo(() => ({ current, playing, loading, play, toggle }), [current, playing, loading, play, toggle]);
  const btn = "inline-flex size-11 items-center justify-center rounded-lg hover:bg-bg";
  return (
    <PlayerCtx.Provider value={ctx}>
      {children}
      <audio ref={audio} preload="metadata" className="hidden"
        onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); saveProgress(); }} onPlaying={() => { setLoading(false); setError(null); }}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onTimeUpdate={onTime}
        onDurationChange={(e) => setDuration(isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onLoadedMetadata={(e) => { const a = e.currentTarget; if (pendingSeek.current && pendingSeek.current < a.duration - 10) a.currentTime = pendingSeek.current; pendingSeek.current = null; }}
        onEnded={() => { saveProgress(); if (queue.findIndex((x) => x.id === current?.id) < queue.length - 1) step(1); else setPlaying(false); }}
        onVolumeChange={(e) => setVolumeS(e.currentTarget.volume)}
        onError={() => { setLoading(false); setPlaying(false); setError("This recording couldn't be played. The archive link may be unavailable (for example, Dropbox traffic limits) or the file may have moved."); }} />
      {current && (
        <div role="region" aria-label="Audio player" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="mx-auto max-w-6xl px-4 py-2">
            {expanded && (
              <div className="mb-2 space-y-2">
                <div className="flex items-center gap-2 text-xs tabular-nums"><span>{formatDuration(time) || "0:00"}</span>
                  <input type="range" aria-label="Seek" min={0} max={duration || 0} step={1} value={Math.min(time, duration || 0)} disabled={!duration} onChange={(e) => seekTo(Number(e.target.value))} className="flex-1" />
                  <span>{formatDuration(duration) || "--:--"}</span></div>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <button className={btn} aria-label="Previous" onClick={() => step(-1)}><SkipBack className="size-5" /></button>
                  <button className={btn} aria-label="Back 15 seconds" onClick={() => seekTo(time - 15)}><Rewind className="size-5" /></button>
                  <button className={btn} aria-label="Forward 30 seconds" onClick={() => seekTo(time + 30)}><FastForward className="size-5" /></button>
                  <button className={btn} aria-label="Next" onClick={() => step(1)}><SkipForward className="size-5" /></button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <label className="flex items-center gap-2"><Volume2 className="size-4" aria-hidden /><span className="sr-only">Volume</span><input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { if (audio.current) audio.current.volume = Number(e.target.value); }} /></label>
                  <label className="flex items-center gap-2">Speed <select value={rate} onChange={(e) => applyRate(Number(e.target.value), true)} className="min-h-9 rounded-lg border border-line bg-surface px-2">{RATES.map((r) => <option key={r} value={r}>{r}×</option>)}</select></label>
                </div>
              </div>)}
            {error && <p role="alert" className="mb-1 text-sm font-medium text-danger">{error} <button className="underline" onClick={() => current && load(current)}>Try again</button></p>}
            <div className="flex items-center gap-2">
              <button className={btn} aria-label={playing ? "Pause" : "Play"} onClick={toggle}>{loading ? <Loader2 className="size-5 animate-spin" /> : playing ? <Pause className="size-5" /> : <Play className="size-5" />}</button>
              <button className="min-w-0 flex-1 truncate text-left text-sm font-semibold" onClick={() => setExpanded(!expanded)}>{current.title}</button>
              <button className={btn} aria-label={expanded ? "Collapse player" : "Expand player"} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}</button>
              <button className={btn} aria-label="Close player" onClick={close}><X className="size-5" /></button>
            </div>
          </div>
        </div>)}
    </PlayerCtx.Provider>
  );
}
