# Changelog
## Phase 1
Foundation: config and quotas; Supabase auth and session middleware; schema and RLS; UI kit with light/dark; public pages; register/login/reset; dashboard and profile; admin (overview, users and roles, broadcasts, categories, recordings, library, settings, audit log); studio (create, edit, schedule, hosts); docs.

## Phase 2
Live audio via LiveKit (own token signing, Twirp API), host studio (go live, mic, devices, timer, network and connection state), listener player (guest join, volume, reconnect, raise hand), moderation (approve, reject, make speaker, mute, remove, kick), server-side Egress recording (OGG), webhook finalization, admin recordings (refresh, real-format check, download), capacity and duration enforcement, rate limiting, migration 0003.

## Phase 3
Library (search, categories, tags, featured, popular via 30-second play counts, related, pagination, sorting, detail pages); persistent mini/expanded player (seek, speed, volume, resume, queue, media session); bookmarks, playlists, history, continue listening, saved speed; Dropbox archive workflow (link normalization, server probe, browser playback/seek test, verification, guarded temp deletion, library item creation); library admin (edit, tags, feature, publish); audio categories; System Status page; RLS fixes; indexes; migration 0004; final docs.
