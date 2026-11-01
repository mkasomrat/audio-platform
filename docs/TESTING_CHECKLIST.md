# Phase 1 testing checklist (tick on your phone; nothing has been run by me)
Auth: register > confirm email > log in > log out > forgot password > reset > log in again.
Roles: new account sees only "listener"; /admin and /studio redirect to dashboard with a message.
Bootstrap: run SQL > admin pages open. Users page: add broadcaster to a second account; that account can open /studio but not /admin.
Admin: create category; delete it (dialog appears); change a setting name (header updates); audit log shows entries.
Studio: create draft > not visible publicly; set Scheduled with a time > appears in Upcoming; add a host by display name; remove host.
Public: home, live, upcoming, past, detail, library, about load in light and dark; menu works at phone width.
Failure: wrong password shows a clear message; a tampered /broadcasts/xyz shows 404.

# Phase 2 checklist (nothing has been run by me)
Setup: migration 0003 run; env vars set; webhook added; storage bucket made.
Live: Go live as broadcaster; open the public page on a second device (guest, not logged in); hear audio; volume and mute work; listener count changes.
Failure: open the public page before going live (waiting message); turn on airplane mode 10 seconds on the listener (reconnect message, audio returns); deny microphone permission (clear message).
Speakers: listener taps Ask to speak; host sees request toast; Approve; listener unmutes and is heard; host Mutes; host Removes speaker; reject path; "Make speaker" from the listener list; Remove listener.
Security: log out, call /studio/live/ID (refused); normal account cannot Go live; two quick Join taps are not duplicated; a listener cannot request as another identity (not testable by hand; code-reviewed only).
Capacity: set MAX_LISTENERS=1 temporarily; second device sees "This broadcast is full".
Recording: Admin > Recordings shows "recording" during the show; End broadcast; status becomes ready (webhook) or use Refresh status; Check real format says OGG/Opus; Download plays; note measured bitrate and size.
Tab-close: close the host tab mid-show; recording continues; after about 10 minutes the room closes by itself (unverified behavior): report what happens.
Limit: not tested for 100+ listeners; a real 90-listener test has NOT been done.

# Phase 3 checklist (nothing has been run by me)
Library: publish an item; search a word from its title; filter by category and tag; sort by popular; pagination (publish 13+ or temporarily test with fewer); featured appears on top; related list on detail page; empty and error states.
Player: play/pause; seek bar; back 15 / forward 30; speed; volume; mini and expanded view; navigate to another page while playing (audio continues); close and reopen to see resume position; next/previous in a playlist; lock the phone screen (lock-screen controls appear where Chrome supports them).
Failure: break the Dropbox link on purpose; the player shows the clear error and Try again.
Personal (logged in): bookmark/unbookmark; create playlist, add, remove, rename, delete (dialog); My listening shows Continue listening, Bookmarks, Recently played; speed preference persists after reload. Guest: can listen, sees the log-in hint, no bookmark buttons.
Archive: full 7-step workflow on a real recording. Confirm the Check step fails for a wrong link and for a link to a non-audio file. Confirm Delete is refused before verification.
Status page: values match reality; stop a key to see an "unavailable" warning.
Final acceptance: Phase 1 and 2 checklists passed; a real show recorded, archived, published, and played on a second phone including seeking.
NOT done: no 200-listener test, no 90-listener test. Do not claim either.
