-- 0002 Helper functions + Row Level Security. Run after 0001.
-- Helpers are SECURITY DEFINER with fixed search_path so policies never recurse into RLS.
create or replace function public.has_role(_user uuid, _role text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur join public.app_roles r on r.id = ur.role_id
                 where ur.user_id = _user and r.key = _role) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin') $$;

create or replace function public.can_broadcast() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.has_role(auth.uid(),'broadcaster') $$;

create or replace function public.is_broadcast_host(_bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.broadcast_hosts h where h.broadcast_id=_bid and h.user_id=auth.uid())
    or exists (select 1 from public.broadcasts b where b.id=_bid and b.created_by=auth.uid())) $$;

create or replace function public.is_playlist_owner(_pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.audio_playlists p where p.id=_pid and p.user_id=auth.uid()) $$;

-- Only a super_admin may grant/revoke admin or super_admin. SQL Editor (auth.uid() null) is allowed for bootstrap.
create or replace function public.guard_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  select key into k from public.app_roles where id = coalesce(new.role_id, old.role_id);
  if auth.uid() is not null and k in ('admin','super_admin') and not public.has_role(auth.uid(),'super_admin') then
    raise exception 'Only a super_admin can change admin roles';
  end if;
  return coalesce(new, old);
end $$;
create trigger t_guard_roles before insert or update or delete on public.user_roles
  for each row execute function public.guard_role_change();

do $$ declare t text; begin
  foreach t in array array['profiles','app_roles','user_roles','broadcast_categories','broadcasts','broadcast_hosts',
   'speaker_requests','broadcast_participants','recordings','audio_categories','audio_tags','audio_library',
   'audio_library_tags','audio_playlists','playlist_items','bookmarks','listening_history','user_preferences',
   'system_settings','audit_logs']
  loop execute format('alter table public.%I enable row level security', t); end loop; end $$;

-- profiles
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- roles
create policy roles_read on public.app_roles for select using (true);
create policy user_roles_read on public.user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_write on public.user_roles for all using (public.is_admin()) with check (public.is_admin());
-- categories
create policy bcat_read on public.broadcast_categories for select using (true);
create policy bcat_admin on public.broadcast_categories for all using (public.is_admin()) with check (public.is_admin());
-- broadcasts
create policy broadcasts_read on public.broadcasts for select
  using ((is_public and status <> 'draft') or public.is_admin() or public.is_broadcast_host(id));
create policy broadcasts_insert on public.broadcasts for insert
  with check (public.can_broadcast() and created_by = auth.uid());
create policy broadcasts_update on public.broadcasts for update
  using (public.is_admin() or public.is_broadcast_host(id)) with check (public.is_admin() or public.is_broadcast_host(id));
create policy broadcasts_delete on public.broadcasts for delete using (public.is_admin());
-- hosts
create policy hosts_read on public.broadcast_hosts for select using (true);
create policy hosts_write on public.broadcast_hosts for all
  using (public.is_admin() or public.is_broadcast_host(broadcast_id))
  with check (public.is_admin() or public.is_broadcast_host(broadcast_id));
-- speaker requests / participants (live writes happen server-side with the service role in Phase 2)
create policy sreq_read on public.speaker_requests for select
  using (user_id = auth.uid() or public.is_admin() or public.is_broadcast_host(broadcast_id));
create policy sreq_insert on public.speaker_requests for insert with check (user_id = auth.uid());
create policy sreq_manage on public.speaker_requests for update
  using (public.is_admin() or public.is_broadcast_host(broadcast_id));
create policy part_read on public.broadcast_participants for select
  using (public.is_admin() or public.is_broadcast_host(broadcast_id));
-- recordings: admin only
create policy rec_admin on public.recordings for all using (public.is_admin()) with check (public.is_admin());
-- library
create policy acat_read on public.audio_categories for select using (true);
create policy acat_admin on public.audio_categories for all using (public.is_admin()) with check (public.is_admin());
create policy atag_read on public.audio_tags for select using (true);
create policy atag_admin on public.audio_tags for all using (public.is_admin()) with check (public.is_admin());
create policy alib_read on public.audio_library for select using (is_published or public.is_admin());
create policy alib_admin on public.audio_library for all using (public.is_admin()) with check (public.is_admin());
create policy altag_read on public.audio_library_tags for select using (true);
create policy altag_admin on public.audio_library_tags for all using (public.is_admin()) with check (public.is_admin());
-- personal
create policy pl_read on public.audio_playlists for select using (user_id = auth.uid() or is_public);
create policy pl_write on public.audio_playlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pli_read on public.playlist_items for select
  using (public.is_playlist_owner(playlist_id) or exists (select 1 from public.audio_playlists p where p.id = playlist_id and p.is_public));
create policy pli_write on public.playlist_items for all
  using (public.is_playlist_owner(playlist_id)) with check (public.is_playlist_owner(playlist_id));
create policy bm_own on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lh_own on public.listening_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy up_own on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- system
create policy ss_read on public.system_settings for select using (is_public or public.is_admin());
create policy ss_admin on public.system_settings for all using (public.is_admin()) with check (public.is_admin());
create policy audit_read on public.audit_logs for select using (public.is_admin());
create policy audit_insert on public.audit_logs for insert with check (public.is_admin() and actor_id = auth.uid());
