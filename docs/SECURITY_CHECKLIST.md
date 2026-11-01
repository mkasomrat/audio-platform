# Security checklist (Phase 1)
- [x] RLS enabled on all 20 tables; helper functions are SECURITY DEFINER with fixed search_path (no recursive policies).
- [x] New users get only `listener`; only a super_admin can grant admin/super_admin (database trigger).
- [x] Every /admin and /studio page and action calls `requireRole()` on the server; middleware only redirects.
- [x] Admin actions write to audit_logs.
- [x] Redirect targets (`next`) must start with a single `/`.
- [x] No secrets in code; `.env` is git-ignored. No service-role key is used in Phase 1.
- [ ] You: confirm no secret was ever committed; rotate keys if one was.
- [ ] You: after bootstrap, confirm /admin is refused for a normal account.
Known limits: no rate limiting yet (Phase 2/3); cover images are https links, not uploads.

## Phase 2 additions
- [x] LiveKit secret and service-role key are used only in server code (`server-only`); browser receives short-lived join tokens only.
- [x] Listener tokens cannot publish; speakers are promoted server-side after moderator authorization (host, admin or moderator).
- [x] Raise-hand requests carry an HMAC proof of the issued identity.
- [x] Webhook requests are rejected unless the JWT signature and body hash verify.
- [x] Postgres-backed per-IP rate limits on token, speaker, status, moderation and start routes (fails open if the limiter is down).
- [x] Capacity is checked before issuing listener tokens; LiveKit's own cap is the final enforcement.
- [ ] You: confirm SUPABASE_SERVICE_ROLE_KEY exists only in Vercel.
Known limits: rate limits are per IP (shared networks share a budget); capacity check is best-effort under simultaneous joins.

## Phase 3 and final review (code-reviewed; not penetration-tested)
- [x] Static review: no client component imports server-only code; the service-role client is used only in server files; the only public variables are the Supabase URL, publishable key and site URL.
- [x] Every server action and API route checks the caller (role check, ownership via RLS, signed proof, or webhook signature). Login/register/reset actions are public by design.
- [x] RLS review found and fixed two leaks (host links on draft broadcasts, tag links on unpublished audio) in migration 0004.
- [x] Library search escapes filter characters; play counts need 30 s of listening and are limited to one per person per item per hour.
- [x] Dropbox links accepted only from dropbox.com over https; temporary files deleted only when verified and confirmed.
- [ ] You: run the Security items in TESTING_CHECKLIST with a normal account.
Not covered: automated tests, dependency audit (no network here), formal penetration test.
