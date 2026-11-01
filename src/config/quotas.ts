// Centralized free-tier quota configuration.
// VERIFIED (LiveKit docs, Oct 2026): Build plan = 100 concurrent participants (hard cap),
// egress file output max 3 hours. UNVERIFIED: 5,000 connection min/month (third-party sources).
export const PROVIDER_LIMITS = {
  livekitMaxParticipants: 100,
  livekitEgressMaxMinutes: 180,
  livekitMonthlyMinutes: { value: 5000, verified: false },
  supabaseFreeStorageMb: { value: 1024, verified: false },
} as const;

const int = (v: string | undefined, d: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

const speakers = int(process.env.MAX_SPEAKERS, 5);
const broadcasters = int(process.env.MAX_BROADCASTERS, 1);
// Leave headroom of 5 slots for moderators/reconnects.
const safeListenerCeiling = Math.max(
  0,
  PROVIDER_LIMITS.livekitMaxParticipants - speakers - broadcasters - 5,
);

export const capacity = {
  maxBroadcasters: broadcasters,
  maxSpeakers: speakers,
  // Never exceeds the provider cap, even if an env override is too high.
  maxListeners: Math.min(int(process.env.MAX_LISTENERS, 90), safeListenerCeiling),
  maxBroadcastDurationMin: Math.min(
    int(process.env.MAX_BROADCAST_DURATION_MIN, 120),
    PROVIDER_LIMITS.livekitEgressMaxMinutes,
  ),
  // Long-term architectural target only. NOT an operational limit on the free plan.
  futureTargetListeners: 200,
} as const;

export const maxTotalParticipants =
  capacity.maxBroadcasters + capacity.maxSpeakers + capacity.maxListeners;

// Recording size guard: Supabase Free allows 50 MB per file (verified in docs). At the target bitrate,
// 120 minutes is about 43 MB. The bitrate setting is requested from LiveKit but NOT verified; admin sees the real value.
export const recording = { targetKbps: 48, storageMaxFileMb: 50 } as const;
