# Vercel deployment (Hobby, personal non-commercial use only)
1. vercel.com > sign in with GitHub > **Add New > Project** > import `audio-platform` (it must be in your personal GitHub account; Hobby cannot use organization repos).
2. Framework: Next.js (auto). Under **Environment Variables** add: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Add `NEXT_PUBLIC_SITE_URL` after you know your address.
3. **Deploy**. When it finishes, copy your `https://….vercel.app` address, set `NEXT_PUBLIC_SITE_URL` to it (Settings > Environment Variables), then **Deployments > Redeploy**.
4. Put the same address into Supabase Authentication URL settings.
5. Never enable Pro, spend management or any paid add-on. If the build fails, open the failed deployment > **Build Logs**, copy the error to me.
Hobby is for personal, non-commercial use only. Adding ads, donations, payments or organizational/client use means this host is no longer allowed.
