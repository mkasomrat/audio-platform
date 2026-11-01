-- 0004 Phase 3: library, archive workflow, indexes. Run after 0003.
alter table public.audio_library add column if not exists stream_url text;
alter table public.audio_library add column if not exists duration_seconds integer;
alter table public.audio_library add column if not exists file_size_bytes bigint;
alter table public.recordings add column if not exists dropbox_stream_url text;
alter table public.recordings add column if not exists dropbox_checked_at timestamptz;
alter table public.recordings add column if not exists dropbox_ok boolean;
alter table public.recordings add column if not exists dropbox_supports_range boolean;
alter table public.recordings add column if not exists dropbox_content_type text;
alter table public.recordings add column if not exists dropbox_size_bytes bigint;
alter table public.recordings add column if not exists playback_tested boolean not null default false;
alter table public.recordings add column if not exists seek_tested boolean not null default false;

create index if not exists audio_library_category_idx on public.audio_library (category_id);
create index if not exists audio_library_featured_idx on public.audio_library (is_featured) where is_published;
create index if not exists audio_library_popular_idx on public.audio_library (play_count desc) where is_published;
create index if not exists audio_library_tags_tag_idx on public.audio_library_tags (tag_id);
create index if not exists playlist_items_order_idx on public.playlist_items (playlist_id, position);
create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
create index if not exists recordings_status_idx on public.recordings (status, archive_status);

create or replace function public.increment_play_count(_audio uuid) returns void
language sql security definer set search_path = public as $$
  update public.audio_library set play_count = play_count + 1 where id = _audio and is_published $$;
revoke execute on function public.increment_play_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_play_count(uuid) to service_role;

-- RLS review fixes: don't reveal host links of draft broadcasts or tag links of unpublished audio.
drop policy if exists hosts_read on public.broadcast_hosts;
create policy hosts_read on public.broadcast_hosts for select
  using (exists (select 1 from public.broadcasts b where b.id = broadcast_id));
drop policy if exists altag_read on public.audio_library_tags;
create policy altag_read on public.audio_library_tags for select
  using (exists (select 1 from public.audio_library a where a.id = audio_id));
