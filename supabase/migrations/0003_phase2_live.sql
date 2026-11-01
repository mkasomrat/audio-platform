-- 0003 Phase 2: live audio support. Run after 0002.
alter table public.broadcasts add column if not exists recording_enabled boolean not null default true;
alter table public.recordings add column if not exists format_verified boolean not null default false;
alter table public.recordings add column if not exists format_checked_at timestamptz;
alter table public.recordings add column if not exists audio_bitrate_kbps integer;
alter table public.recordings add column if not exists audio_channels smallint;
alter table public.recordings add column if not exists error_message text;

create table if not exists public.rate_limits (
  key text primary key, window_start timestamptz not null default now(), hits integer not null default 0);
alter table public.rate_limits enable row level security;  -- no policies: only the server (service role) can use it

create or replace function public.rate_limit_hit(_key text, _limit int, _window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits (key, window_start, hits) values (_key, now(), 1)
  on conflict (key) do update set
    hits = case when public.rate_limits.window_start < now() - make_interval(secs => _window_seconds) then 1 else public.rate_limits.hits + 1 end,
    window_start = case when public.rate_limits.window_start < now() - make_interval(secs => _window_seconds) then now() else public.rate_limits.window_start end
  returning * into r;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  return r.hits <= _limit;
end $$;
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

create or replace function public.can_moderate_broadcast(_bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.has_role(auth.uid(), 'moderator') or public.is_broadcast_host(_bid) $$;
