"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Enables "Both worked" only after the browser itself has played the file AND played on after a real seek.
export function ArchiveTester({ src, id, action }: { src: string; id: string; action: (fd: FormData) => void | Promise<void> }) {
  const [played, setPlayed] = useState(false), [sought, setSought] = useState(false), [err, setErr] = useState<string | null>(null);
  const before = useRef(0), target = useRef<number | null>(null);
  return (
    <div className="space-y-3">
      <audio controls preload="metadata" src={src} className="w-full"
        onTimeUpdate={(e) => { const a = e.currentTarget; if (a.currentTime >= 3) setPlayed(true); if (target.current !== null && a.currentTime > target.current + 2) { setSought(true); target.current = null; } if (target.current === null) before.current = a.currentTime; }}
        onSeeked={(e) => { const a = e.currentTarget; if (Math.abs(a.currentTime - before.current) > 10) target.current = a.currentTime; }}
        onError={() => setErr("The browser could not play this link.")} />
      <ul className="text-sm"><li>{played ? "✓" : "○"} Played for at least 3 seconds</li><li>{sought ? "✓" : "○"} Jumped ahead more than 10 seconds and kept playing for 2 seconds</li></ul>
      {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
      <form action={action}><input type="hidden" name="id" value={id} /><Button type="submit" disabled={!(played && sought)}>Both worked</Button></form>
    </div>
  );
}
