-- Run ONCE in Supabase SQL Editor, AFTER you have registered and verified your own account.
-- Replace the email below with yours. There is no public route that can do this.
insert into public.user_roles (user_id, role_id, granted_by)
select u.id, r.id, u.id
from auth.users u, public.app_roles r
where u.email = 'YOUR_EMAIL@example.com' and r.key = 'super_admin'
on conflict do nothing;

-- Check it worked (should return one row):
select u.email, r.key from public.user_roles ur
join auth.users u on u.id = ur.user_id join public.app_roles r on r.id = ur.role_id
where u.email = 'YOUR_EMAIL@example.com';
