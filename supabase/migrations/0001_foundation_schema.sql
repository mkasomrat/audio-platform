-- 0001 Foundation schema. Run in Supabase SQL Editor (once, in order).
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ===== Identity & roles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Listener',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('super_admin','admin','broadcaster','moderator','listener')),
  description text
);
insert into public.app_roles (key, description) values
 ('super_admin','Full control'),('admin','Manage users, broadcasts, archive'),
 ('broadcaster','Run live broadcasts'),('moderator','Moderate speaker requests'),
 ('listener','Default registered user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.app_roles(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);
create index on public.user_roles (user_id);

-- ===== Broadcasts =====
create table public.broadcast_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 150),
  description text,
  cover_image_url text,
  category_id uuid references public.broadcast_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','live','ended','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  livekit_room_name text unique,          -- Phase 2
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.broadcasts (status, scheduled_at);
create index on public.broadcasts (created_by);

create table public.broadcast_hosts (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_primary boolean not null default false,
  unique (broadcast_id, user_id)
);
create index on public.broadcast_hosts (user_id);

create table public.speaker_requests (          -- Phase 2
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  participant_identity text,
  display_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','revoked')),
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index on public.speaker_requests (broadcast_id, status);

create table public.broadcast_participants (    -- Phase 2
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  participant_identity text not null,
  role text not null check (role in ('broadcaster','speaker','moderator','listener')),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);
create index on public.broadcast_participants (broadcast_id, left_at);

-- ===== Recordings & library =====
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid references public.broadcasts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','recording','finalizing','ready','failed')),
  egress_id text,
  original_filename text,
  audio_format text, codec text,
  duration_seconds integer, file_size_bytes bigint,
  temp_storage_path text,
  temp_deleted boolean not null default false,
  temp_deleted_at timestamptz,
  dropbox_share_url text,
  archive_status text not null default 'not_archived' check (archive_status in ('not_archived','link_added','verified','failed')),
  uploaded_at timestamptz, verified_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.recordings (broadcast_id);

create table public.audio_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, slug text not null unique
);
create table public.audio_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, slug text not null unique
);
create table public.audio_library (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid unique references public.recordings(id) on delete set null,
  slug text not null unique,
  title text not null, description text,
  category_id uuid references public.audio_categories(id) on delete set null,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  play_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.audio_library (is_published, published_at desc);
create table public.audio_library_tags (
  audio_id uuid not null references public.audio_library(id) on delete cascade,
  tag_id uuid not null references public.audio_tags(id) on delete cascade,
  primary key (audio_id, tag_id)
);

-- ===== Personal features =====
create table public.audio_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, is_public boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.audio_playlists (user_id);
create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.audio_playlists(id) on delete cascade,
  audio_id uuid not null references public.audio_library(id) on delete cascade,
  position integer not null default 0,
  unique (playlist_id, audio_id)
);
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_id uuid not null references public.audio_library(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, audio_id)
);
create table public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_id uuid not null references public.audio_library(id) on delete cascade,
  progress_seconds integer not null default 0,
  completed boolean not null default false,
  last_played_at timestamptz not null default now(),
  unique (user_id, audio_id)
);
create index on public.listening_history (user_id, last_played_at desc);
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  playback_speed numeric(3,2) not null default 1.00,
  updated_at timestamptz not null default now()
);

-- ===== System =====
create table public.system_settings (
  key text primary key, value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.system_settings (key, value, is_public) values
 ('branding', '{"name":"Audio Platform"}', true);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text, entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);

-- updated_at triggers
create trigger t_profiles_u before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_broadcasts_u before update on public.broadcasts for each row execute function public.set_updated_at();
create trigger t_recordings_u before update on public.recordings for each row execute function public.set_updated_at();
create trigger t_library_u before update on public.audio_library for each row execute function public.set_updated_at();
create trigger t_playlists_u before update on public.audio_playlists for each row execute function public.set_updated_at();

-- New user -> profile + listener role ONLY
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.app_roles where key = 'listener';
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
