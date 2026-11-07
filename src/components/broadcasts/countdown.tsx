"use client";
import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const pad = (n: number) => String(n).padStart(2, "0");

function downloadIcs(startsAt: string, title: string) {
  const s = new Date(startsAt), e = new Date(s.getTime() + 60 * 60000); // length is unknown, so 1 hour is assumed
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (t: string) => t.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LaSW//EN", "BEGIN:VEVENT", `UID:${s.getTime()}@lasw`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(s)}`, `DTEND:${f(e)}`, `SUMMARY:${esc(title)}`, `URL:${location.href}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "lasw-show.ics"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function Countdown({ startsAt, title }: { startsAt: string; title: string }) {
  const target = new Date(startsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const left = now === null ? null : target - now;
  const over = left !== null && left <= 0;
  const soon = left !== null && left > 0 && left < 3600_000;
  const parts = left === null || over ? null : [
    { v: Math.floor(left / 86400000), en: "Days", bn: "দিন" },
    { v: Math.floor((left % 86400000) / 3600000), en: "Hours", bn: "ঘণ্টা" },
    { v: Math.floor((left % 3600000) / 60000), en: "Minutes", bn: "মিনিট" },
    { v: Math.floor((left % 60000) / 1000), en: "Seconds", bn: "সেকেন্ড" },
  ];
  let when = "", zone = "";
  if (now !== null) {
    when = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(target));
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  const minutesLeft = left === null || over ? 0 : Math.ceil(left / 60000);

  return (
    <section aria-label="Countdown to the live show" className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand/15 via-surface to-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span aria-hidden className="relative flex size-3">
          <span className={`absolute inline-flex size-full animate-ping rounded-full ${over ? "bg-live" : "bg-brand"} opacity-60`} />
          <span className={`relative inline-flex size-3 rounded-full ${over ? "bg-live" : "bg-brand"}`} />
        </span>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-muted">
          {over ? "Starting any moment · এখনই শুরু হবে" : soon ? "Starting soon · শুরু হতে আর একটু বাকি" : "Starts in · শুরু হতে বাকি"}
        </p>
      </div>

      {over ? (
        <p role="status" className="font-display text-2xl font-extrabold leading-snug">
          The start time has arrived. Waiting for the host to go live&hellip;
          <span className="mt-1 block text-base font-semibold text-muted">সময় হয়েছে, হোস্ট শুরু করলেই এখানে জয়েন বোতাম আসবে।</span>
        </p>
      ) : (
        <>
          <div role="timer" aria-live="off" aria-label={now === null ? "Loading countdown" : `${minutesLeft} minutes until the show`} className="grid grid-cols-4 gap-2 sm:gap-3">
            {(parts ?? [{ en: "Days", bn: "দিন" }, { en: "Hours", bn: "ঘণ্টা" }, { en: "Minutes", bn: "মিনিট" }, { en: "Seconds", bn: "সেকেন্ড" }]).map((p, i) => (
              <div key={p.en} className="rounded-xl border border-line bg-bg/80 px-1 py-3 text-center sm:py-4">
                <div className={`font-display text-3xl font-extrabold tabular-nums leading-none sm:text-5xl ${i === 3 ? "text-brand" : ""}`}>
                  {parts && "v" in p ? pad((p as { v: number }).v) : "--"}
                </div>
                <div className="mt-2 text-[11px] font-semibold leading-tight text-muted sm:text-xs">{p.en}<span className="block">{p.bn}</span></div>
              </div>
            ))}
          </div>
          <p className="sr-only" aria-live="polite">{minutesLeft > 0 ? `${minutesLeft} minutes until the show starts` : ""}</p>
        </>
      )}

      {when && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Your time: <span className="font-semibold text-ink">{when}</span><span className="block text-xs">{zone}</span></p>
          {!over && <Button type="button" variant="secondary" className="min-h-10 px-3" onClick={() => downloadIcs(startsAt, title)}><CalendarPlus className="size-4" aria-hidden />Add to calendar</Button>}
        </div>
      )}
    </section>
  );
}
