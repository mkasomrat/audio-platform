"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";

export type Conn = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export function useLiveRoom() {
  const roomRef = useRef<Room | null>(null);
  const audioBox = useRef<HTMLDivElement>(null);
  const vol = useRef({ volume: 1, muted: false });
  const [conn, setConn] = useState<Conn>("idle");
  const [quality, setQuality] = useState("unknown");
  const [listeners, setListeners] = useState(0);
  const [canSpeak, setCanSpeak] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const recount = useCallback((r: Room) => setListeners([...r.remoteParticipants.values()].filter((p) => !p.permissions?.canPublish).length), []);

  const disconnect = useCallback(async () => {
    const r = roomRef.current; roomRef.current = null;
    if (r) await r.disconnect();
    audioBox.current?.replaceChildren();
    setConn("idle"); setMicOn(false); setCanSpeak(false); setQuality("unknown");
  }, []);

  const connect = useCallback(async (url: string, token: string, publish: boolean) => {
    setError(null); setConn("connecting");
    const room = new Room({ adaptiveStream: false, dynacast: false, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    roomRef.current = room;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach(); el.volume = vol.current.volume; el.muted = vol.current.muted; audioBox.current?.appendChild(el);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((e) => e.remove()));
    room.on(RoomEvent.ConnectionStateChanged, (s) => setConn(s === ConnectionState.Connected ? "connected" : s === ConnectionState.Connecting ? "connecting" : s === ConnectionState.Disconnected ? "disconnected" : "reconnecting"));
    room.on(RoomEvent.ConnectionQualityChanged, (q, p) => { if (p.isLocal) setQuality(String(q)); });
    room.on(RoomEvent.ParticipantConnected, () => recount(room));
    room.on(RoomEvent.ParticipantDisconnected, () => recount(room));
    room.on(RoomEvent.ParticipantPermissionsChanged, (_prev, p) => { if (p.isLocal) { const can = Boolean(p.permissions?.canPublish); setCanSpeak(can); if (!can) setMicOn(false); } recount(room); });
    room.on(RoomEvent.TrackMuted, (_pub, p) => { if (p.isLocal) setMicOn(false); });
    room.on(RoomEvent.Disconnected, () => { setConn("disconnected"); setMicOn(false); });
    try {
      await room.connect(url, token);
      await room.startAudio().catch(() => {});
      setConn("connected"); recount(room); setCanSpeak(publish);
      if (publish) { await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true); }
    } catch (e: any) {
      const denied = /permission|notallowed|denied/i.test(String(e?.message ?? e));
      setError(denied ? "Microphone access was blocked. In Chrome, tap the lock icon by the address bar, allow Microphone, then try again." : "Couldn't connect to live audio. Check your connection and try again.");
      await disconnect(); setConn("disconnected");
    }
  }, [disconnect, recount]);

  const toggleMic = useCallback(async () => {
    const r = roomRef.current; if (!r) return;
    try { const next = !micOn; await r.localParticipant.setMicrophoneEnabled(next); setMicOn(next); setError(null); }
    catch { setError("Microphone access was blocked. Allow it in Chrome's site settings, then try again."); }
  }, [micOn]);

  const setVolume = useCallback((v: number) => { vol.current.volume = v; audioBox.current?.querySelectorAll("audio").forEach((a) => (a.volume = v)); }, []);
  const setMuted = useCallback((m: boolean) => { vol.current.muted = m; audioBox.current?.querySelectorAll("audio").forEach((a) => (a.muted = m)); }, []);
  const loadDevices = useCallback(async () => { try { setDevices(await Room.getLocalDevices("audioinput")); } catch { setDevices([]); } }, []);
  const pickDevice = useCallback(async (id: string) => { try { await roomRef.current?.switchActiveDevice("audioinput", id); } catch { setError("Couldn't switch microphone."); } }, []);

  useEffect(() => () => { roomRef.current?.disconnect(); }, []);
  return { audioBox, conn, quality, listeners, canSpeak, micOn, error, devices, connect, disconnect, toggleMic, setVolume, setMuted, loadDevices, pickDevice };
}
