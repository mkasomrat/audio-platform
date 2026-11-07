// Times are stored in UTC. The server renders them in one fixed site time zone (default Asia/Dhaka),
// and always shows the zone name, so everyone reads the same unambiguous time.
// Change it with the NEXT_PUBLIC_TIME_ZONE environment variable (for example "Asia/Dhaka" or "Europe/London").
const SITE_TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "Asia/Dhaka";

export function formatDateTime(iso: string | null) {
  if (!iso) return "Time to be announced";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: SITE_TIME_ZONE, timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatDuration(sec: number | null | undefined) {
  if (!sec || sec < 1) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
