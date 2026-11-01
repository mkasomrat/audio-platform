# Final deployment guide
Order (all in Android Chrome): 1 SUPABASE_SETUP (run migrations 0001, 0002, 0003, 0004 in order) > 2 ANDROID_GITHUB_GUIDE > 3 VERCEL_DEPLOYMENT > 4 LIVEKIT_SETUP > 5 RECORDING_SETUP > 6 bootstrap super admin > 7 TESTING_CHECKLIST (all phases) > 8 Admin > Status should show no red warnings.
Register your own account AFTER running the migrations (the signup trigger creates the profile and listener role).
## Preventing charges
Never click Upgrade on Vercel, Supabase, LiveKit, Dropbox or Cloudflare. Never add a card. Hobby and free plans stop or fail at their limits instead of billing (LiveKit documents that over-quota requests fail); if any dashboard asks for payment details, stop and ask me.
## Performance notes
Indexes added for library, tags, playlists, bookmarks, history. Lists are paginated (12/page). Public pages are server-rendered; no images are loaded from third parties. Not done: response caching (pages read per-user cookies), image optimization (the app serves no photos), load testing.
## Ongoing
Weekly: Admin > Status. After each show: Refresh status if needed > Check real format > archive > delete temporary file. Monthly: compare Status minutes estimate with LiveKit's dashboard.
## Not delivered / future
200 concurrent listeners; a host with real audio streaming limits (Dropbox is a stop-gap); automatic Dropbox upload (deliberately not built); email deliverability beyond Supabase's built-in limit.
