# Architecture
Next.js App Router (server components + server actions) on Vercel; Supabase for Auth/Postgres. `src/config` holds branding and quotas; `src/lib` holds Supabase clients, auth/role helpers, data queries, validation and audit; `src/components` holds ui, forms, layout, studio; `src/app` holds public pages, `/admin`, `/studio`, auth. Authorization is enforced twice: in server code (`requireRole`) and in the database (RLS). Optional services (LiveKit, storage) are never required for Phase 1 to run.
Phase 2 adds: LiveKit token route handlers, egress start/stop and webhook handler, studio live UI, listener player, speaker queue.

## Phase 2 live architecture
Browser (livekit-client) <-> LiveKit Cloud. Our server signs join tokens (`/api/live/token`), controls rooms, permissions and egress through LiveKit's HTTP API (`src/lib/livekit/server.ts`), records state in Postgres via the service role, and receives LiveKit webhooks (`/api/livekit/webhook`). Recordings go from LiveKit Egress straight to S3-compatible storage; the host's browser is not involved.

## Phase 3
A client-side PlayerProvider (root layout) owns one <audio> element so playback survives navigation. Library queries run on the server through RLS. Archive checks run on the server (`src/lib/archive`), while the playback/seek test runs in the admin's browser. Temporary-file deletion is a guarded server action.
