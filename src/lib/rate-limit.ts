import "server-only";
import { adminClient } from "@/lib/supabase/admin";

// Fixed-window limiter backed by Postgres. Returns false when the caller is over the limit.
// If the limiter itself fails we allow the request (availability over strictness) and log it.
export async function rateLimit(req: Request, name: string, limit: number, windowSec: number) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data, error } = await adminClient().rpc("rate_limit_hit", { _key: `${name}:${ip}`, _limit: limit, _window_seconds: windowSec });
    if (error) { console.error("rate limit error:", error.message); return true; }
    return data === true;
  } catch (e) { console.error("rate limit unavailable:", e); return true; }
}
