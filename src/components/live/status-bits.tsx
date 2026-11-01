import { Badge } from "@/components/ui/feedback";
import type { Conn } from "./use-live-room";

export function ConnBadge({ conn }: { conn: Conn }) {
  const map = { idle: ["Not connected", "neutral"], connecting: ["Connecting…", "neutral"], connected: ["Connected", "brand"], reconnecting: ["Reconnecting…", "live"], disconnected: ["Disconnected", "live"] } as const;
  const [label, tone] = map[conn];
  return <Badge tone={tone}>{label}</Badge>;
}
export function QualityBadge({ quality }: { quality: string }) {
  const label = ({ excellent: "Network: excellent", good: "Network: good", poor: "Network: poor", lost: "Network: lost" } as Record<string, string>)[quality] ?? "Network: measuring…";
  return <Badge tone={quality === "poor" || quality === "lost" ? "live" : "neutral"}>{label}</Badge>;
}
