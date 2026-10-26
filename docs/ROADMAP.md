# TypeNest roadmap (written for an AI assistant to execute)

How to use: read `docs/HANDOVER.md` first. Pick items by ID. Each item lists the goal, the data model, the code to touch and what "done" means. After each item run `npx tsc --noEmit`, `npx next lint`, `npx vitest run`. Never copy Monkeytype code (GPL-3). No dummy data. Do not remove existing features. New SQL goes in a new numbered file in `supabase/migrations/` (next number is 0039) and must be added to the README migration table.

Effort: S = 1-2 days, M = 1-2 weeks, L = a month or more.

## A. Verify what already exists (do before adding more)
- V1. Run migrations 0029-0038 on a real Supabase project; confirm each feature works with two accounts.
- V2. Account delete (`/api/account/delete`): confirm every table cascades from `profiles`/`auth.users`. If a table blocks deletion, add `on delete cascade` in a migration.
- V3. `settle_stale_race` (0032) sets `request.jwt.claim.sub` to call `finish_race`; test a real disconnect.
- V4. Real phones (Android, iPhone): typing area, race room, nav. Real Urdu keyboards: composition/IME in `TypingEngine.tsx` (`isComposing`).
- V5. Fix the lint warning about a missing `room` dependency in `app/compete/multiplayer/[code]/page.tsx`.

## B. Quick wins (S)
- R01 Profile private toggle. DB: `profiles.is_private boolean default false`. Change RPCs `get_public_profile` and `get_public_performance` to return no history when private (username and level only). API: `/api/profile` PATCH accepts `isPrivate`. UI: switch in Settings. `app/u/[username]/page.tsx` shows "This profile is private".
- R02 Suspicious/banned status. DB: `profiles.status text default 'ok' check in ('ok','suspicious','banned')`. Add `where status='ok'` to `get_leaderboard_wpm`, `get_race_leaderboard`, the ranked query in `app/compete/ranked/page.tsx`. Banned users cannot call race/room create APIs. Set status from the Supabase dashboard until R26 exists.
- R03 Streak time zone. DB: `profiles.timezone text`. Client sends `Intl.DateTimeFormat().resolvedOptions().timeZone` on login. Streak/day boundaries computed in that zone (`session_date` logic in the submit functions and `app/profile/page.tsx`).
- R04 Leaderboard own rank and opt-out. DB: `profiles.hide_from_leaderboards boolean`. New RPC `get_my_rank(period, category)` = count of better scores + 1. Show "Your rank" on `app/leaderboard/page.tsx`. Switch in Settings.
- R05 CI. `.github/workflows/ci.yml`: install, `tsc`, `lint`, `vitest` on push and pull request.
- R06 Pause/resume in `TypingEngine.tsx`: store elapsed time, stop the timer, resume on key. A paused test is not saved if paused more than once.
- R07 Engine warnings and options: Caps Lock warning (`getModifierState("CapsLock")`), "click to focus" on blur, typo indicator, timer style, speed unit (WPM/CPM/WPS as display conversion only). Store options in `typing_prefs` (`lib/validation.ts`, `lib/settingsContext.tsx`, `components/TypingPrefsCard.tsx`).
- R08 Custom time/word amounts and quote length buckets (short/medium/long) in the engine mode controls.
- R09 Result graph: add raw WPM and per-second errors to the existing `wpmHistory` chart (`RhythmChart` in `TypingEngine.tsx`).

## C. Typing depth (M)
- R10 Zen mode. New content type `zen` in the engine: no word list, keys appended to a typed buffer, ends with Esc or Shift+Enter, shows WPM only, never saved. The end-of-test logic in the engine assumes a word list, so isolate it behind a flag.
- R11 Practise words. During a test record per-word time and errors. Result screen button "Practise these words" builds a custom-text test (reuse the `custom` content type, never saved).
- R12 Weak-spot mode. Read top 5 error keys from `char_stats` (used by `app/train/page.tsx`), pick words from `lib/wordBank.ts` that contain them, build the test from those.
- R13 Keyboard layouts and keymap. New `lib/layouts.ts` (Dvorak, Colemak, Urdu phonetic, Urdu standard) mapping physical key codes to characters. Setting `layout`. New keymap component shows the board and highlights the next key. Map key events through the layout in the engine key handler.
- R14 Funbox (start with 6): nospace, mirror, memory, capitals, backwards, morse. Each is a function that transforms the word list or display. Setting `funbox`. Save funbox results under their own category so they never touch normal leaderboards.
- R15 Presets. Table `user_presets(id, user_id, name, settings jsonb)`. API list/save/apply/delete. Apply writes theme and `typing_prefs` in one step.
- R16 Tape mode: single scrolling line display option in the engine.
- R17 Custom theme builder (5 colour pickers with a contrast check, saved as `custom_theme jsonb`, applied as CSS variables under `data-theme="custom"`), font family and size settings, background colour/image.
- R18 Settings search box (filter the sections) and more command-palette commands (theme, mode, caret style).
- R19 Tags and filters. Tables `tags(id,user_id,name)` and `typing_tests.tag_id`. Pick a tag before a test. Filters (mode, language, tag) on `app/stats/page.tsx`.
- R20 Stats charts: WPM histogram, daily activity bars, last 30 days vs previous 30 days.
- R21 Badges. Table `badges(user_id, badge, awarded_at)`. Show on profile header. Weekly scheduled job awards top-3 of the weekly leaderboard.
- R22 Profile search: query `profiles` by username prefix (indexed), max 10 results.
- R23 Blocked users. Table `blocks(blocker, blocked)`. Blocked users cannot send friend requests, challenges or emotes to the blocker; check on emote receive in the race room.

## D. Trust and moderation (M to L)
- R24 Reports. Table `reports(id, reporter, target_user, kind, reason, status, created_at)`. "Report" button on profiles and race rooms. Rate limit per reporter.
- R25 Admin panel `/admin` guarded by `profiles.is_admin`. Report queue, change a user's status (R02), remove a result, rename a user, post an announcement (`announcements` table). Every action writes `audit_log(admin, action, target, at)`.
- R26 Validate every test on the server, not only races. Send keystroke log with each test, run `lib/raceVerify.ts`-style checks in the submit route, store `key_spacing_avg` and `key_spacing_sd` on `typing_tests`, mark suspicious results (R02). Keep the exact rules server-side.
- R27 Deleted-account blocklist: store a hash of the email in `deleted_emails` and refuse immediate re-signup (optional).

## E. Competition (L)
- R28 Team modes 2v2, 3v3, 4v4. DB: `race_rooms.team_size`, `race_participants.team`. New RPCs `start_team_race` (random split), `finish_team_race` (no Elo, all players must finish), `get_team_race_leaderboard`; extend `get_race_room` and `settle_stale_race` (longer timeout, e.g. 120 s). UI: two team colours in lobby, lanes and result; team total score. Not to be confused with the tournament bracket sizes 2/4/8/16.
- R29 Daily scheduled tournament: Supabase cron creates one public tournament each evening; registration opens earlier.
- R30 Matchmaking queue: table `matchmaking_queue`, a job pairs players with near Elo and creates a room, both get a realtime message.
- R31 In-app notifications: `notifications(user_id,type,payload,read_at)` for friend requests, challenges, streak warnings; bell icon in `components/TopBar.tsx`.
- R32 Race replays: replay page re-plays stored keystroke logs for each player at 1x/2x.

## F. Scale and engineering (M to L)
- R33 Redis rate limiting (Upstash) to replace the Postgres limiter in `lib/rateLimit.ts` (keep the same function signature).
- R34 Remove the 2-second race polling in the race room; rely on realtime, poll only after a disconnect.
- R35 Cache leaderboards (materialized views refreshed each minute, or Redis sorted sets).
- R36 Integration tests against a Supabase test instance for `submit_test`, `finish_race`, ELO, friends, API keys. Add API route tests.
- R37 Shared zod schemas for client and server in one module.
- R38 PWA (manifest, service worker, offline test).
- R39 Load test with k6 (1k to 10k concurrent racers) and find the first bottleneck.
- R40 Sentry (the owner asked to do this later).
- R41 Optional: result submission through API keys. Only with the full R26 validation, never as a bypass.

## G. Blocked until a domain exists
- R42 Custom SMTP, password reset, email verification (Supabase built-in email is heavily limited).
- R43 Streak reminder emails or push.
- R44 SEO landing pages (Urdu typing test, Roman Urdu typing test).
- R45 Pro plan and payments (needs refund policy, tax setup).
- R46 When a domain is bought: set `NEXT_PUBLIC_SITE_URL`, update Supabase Auth URL configuration, and add a contact method plus a data-request route to the legal pages.

## Suggested order
V1-V5, then R01, R02, R05, R03, R04, then R10-R14, R24-R26, R28-R32, then F, then G.
