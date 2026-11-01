# Supabase setup (browser only)
1. supabase.com > sign in with GitHub > **New project** (free plan; no card). Choose a strong database password and save it in a password manager. Do not put it in GitHub.
2. **SQL Editor > New query**: paste `supabase/migrations/0001_foundation_schema.sql` > **Run**. Then a new query with `0002_rls_policies.sql` > **Run**. Both must say "Success". Later phases add `0003_phase2_live.sql` and `0004_phase3_library_archive.sql`; run them in order, one at a time.
3. **Project Settings > API**: copy the Project URL and the publishable (anon) key. Copy the service-role key only when a later phase needs it; keep it secret.
4. **Authentication > URL Configuration**: Site URL = your Vercel address. Add Redirect URLs: `https://YOUR-SITE/auth/callback` (and `http://localhost:3000/auth/callback` is not needed).
5. **Authentication > Providers > Email**: keep "Confirm email" ON.
6. Register on your site, confirm the email, then run `supabase/bootstrap_super_admin.sql` after replacing the email. It must return one row.
## Free-plan cautions
- The built-in email sender has a very low hourly limit (exact number UNVERIFIED). If confirmation emails stop arriving, wait an hour; a custom SMTP service may be needed later.
- Free projects may pause after a period of inactivity (period UNVERIFIED). You can resume them from the dashboard.
