import "server-only";
import { adminClient } from "@/lib/supabase/admin";

// ESTIMATE of connection minutes this month: from token issue to the recorded leave time.
// It is NOT LiveKit's own meter. Check the LiveKit dashboard for the real number.
export async function estimateMonthlyMinutes() {
  try {
    const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const { data, error } = await adminClient().from("broadcast_participants").select("joined_at,left_at").gte("joined_at", start.toISOString()).limit(20000);
    if (error || !data) return null;
    const now = Date.now();
    return Math.round(data.reduce((t, r) => t + ((r.left_at ? new Date(r.left_at).getTime() : now) - new Date(r.joined_at).getTime()), 0) / 60000);
  } catch { return null; }
}
