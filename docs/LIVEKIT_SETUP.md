# LiveKit setup (free Build plan, browser only)
1. cloud.livekit.io > sign in > create a project (no card; if a card is demanded, stop and tell me).
2. **Settings > Keys**: create an API key. Copy the project URL (`wss://….livekit.cloud`), API Key and API Secret.
3. Vercel > Project > **Settings > Environment Variables**, add: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Settings > API; secret, never share). Redeploy.
4. **Webhook (needed so recordings finish automatically):** LiveKit dashboard > Settings > Webhooks > add `https://YOUR-SITE/api/livekit/webhook` and pick your API key. (Menu names may differ; if you can't find it, use the "Refresh status" button in Admin > Recordings instead.)
5. Supabase SQL Editor: run `supabase/migrations/0003_phase2_live.sql`.
6. On LiveKit's project **Settings/limits** page, read the real numbers (participants, connection minutes, egress) and tell me if they differ from FREE_TIER_LIMITATIONS.md.
Role setup: give your account `broadcaster` in Admin > Users (admins can host too). Moderators get `moderator`.
How a show works: Studio > My broadcasts > open > **Live studio** > **Go live**. Listeners open the public broadcast page and tap **Join live audio**.
