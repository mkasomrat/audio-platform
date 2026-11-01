"use client";
import { Loader2, Pause, Play } from "lucide-react";
import { usePlayer, type Track } from "./player-context";
import { Button } from "@/components/ui/button";

export function PlayButton({ track, queue, label }: { track: Track; queue?: Track[]; label?: boolean }) {
  const p = usePlayer();
  const mine = p.current?.id === track.id, active = mine && p.playing;
  return (
    <Button type="button" variant={mine ? "primary" : "secondary"} aria-label={`${active ? "Pause" : "Play"} ${track.title}`} onClick={() => p.play(track, queue)} className={label ? "" : "size-11 px-0"}>
      {mine && p.loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : active ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
      {label && (active ? "Pause" : "Play")}
    </Button>
  );
}
