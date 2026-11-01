# Free-tier limitations (checked Oct 2026)
| Service | Verified | Unverified / risk |
|---|---|---|
| LiveKit Build | 100 concurrent participants hard cap; file egress max 3 h | 5,000 connection min/month and 50 GB bandwidth come from third-party sources; one 1-hour show with 100 listeners would use ~6,000 min |
| Vercel Hobby | Personal non-commercial use only | exact usage caps change |
| Cloudflare R2 | 10 GB free | A payment method is usually required to enable it, conflicting with the no-card rule |
| Supabase Storage (recordings) | S3 endpoint exists (`/storage/v1/s3`); Free = 50 MB per file; S3 presigned/multipart supported per docs | LiveKit Egress writing to it, the 48 kbps setting, 1 GB total storage: UNVERIFIED until your first test |
| Supabase Free | Postgres, Auth, RLS | email rate limit, inactivity pause, storage and file-size limits UNVERIFIED |
| Dropbox Free | Manual links | streaming/seeking and link traffic limits UNVERIFIED; tested in Phase 3 |
The 200-listener target is a future scalability goal, not available on free plans. Configured limits: 90 listeners, 5 speakers, 1 broadcaster, 120 minutes (size-safe for 50 MB files).

Dropbox detail: `raw=1` direct playback is confirmed by Dropbox staff; shared-link bandwidth is limited per account per day (figure of 20 GB/day for Basic is second-hand, UNVERIFIED). Range/seek support is checked per file by the app, not assumed.
