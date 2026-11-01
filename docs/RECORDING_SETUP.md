# Recording setup (no credit card path: Supabase Storage)
Recording is done by LiveKit's servers (Egress), so it continues if the host's browser closes. Output requested: audio-only OGG (Opus) at 48 kbps.
1. Supabase > **Storage > New bucket** named `recordings`. Keep it **private**.
2. Supabase > **Storage > Settings (S3 Configuration)**: enable the S3 connection, note the Endpoint and Region, then **New access key** and copy both values.
3. Add to Vercel env vars: `R2_ENDPOINT` (the S3 endpoint, ends in `/storage/v1/s3`), `STORAGE_REGION`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME=recordings`. (Names keep the R2_ prefix but work with any S3-compatible service.) Redeploy.
4. Do a 2-minute test show. Admin > Recordings > **Refresh status** (or wait for the webhook) > **Check real format** > **Download** and play it.
Limits to know: Supabase Free allows 50 MB per file (verified). At 48 kbps that is about 2 hours, so the maximum broadcast length defaults to 120 minutes. The 48 kbps request is NOT verified; the page shows the measured bitrate. If it is higher, shorten shows or tell me.
The admin page shows what the file REALLY is (it reads the OGG/Opus headers); extensions are never trusted.
Temporary files are never deleted in Phase 2. Dropbox verification and deletion come in Phase 3.
Not verified: LiveKit Egress uploading to Supabase's S3 endpoint, presigned downloads from it, and the bitrate option. If the first test fails, the red message in Admin > Recordings says why; send it to me. Cloudflare R2 is the alternative but likely needs a card.
