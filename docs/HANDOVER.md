# TypeNest: project handover

Read this first. It tells a new assistant what the project is, how it is built, what is finished, what is not, and how the owner likes to work.

## 1. What TypeNest is
An independent typing platform (owner: solo builder). Competitor reference: Monkeytype (GPL-3, so never copy its code; learn from ideas only). Differentiators: live multiplayer races, friends, spectating, tournaments, Urdu and Roman Urdu, coach, academy, arcade.

## 2. Stack and hosting
- Next.js 14 (App Router) + TypeScript + Tailwind. Supabase (Postgres, Auth, Realtime, Storage). Deployed on Vercel from GitHub. No custom domain yet (uses the Vercel URL), so anything that needs a domain (custom SMTP, SEO landing pages, streak emails, payments) is intentionally postponed.
- Env vars: see `.env.example` (Supabase URL, anon key, service role key, site URL).
- Checks to run after every change: `npx tsc --noEmit`, `npx next lint`, `npx vitest run` (62 tests pass; one known lint warning about a useEffect dependency in the race room).

## 3. Code map
- `app/` pages and `app/api/*` routes. `components/` UI. `lib/` helpers (settings context, validation zod schemas, wpm, elo, rateLimit, raceVerify, apiKey, legal text).
- Typing engine: `components/typing/TypingEngine.tsx` (about 1,600 lines, handle with care). Games: `components/typing/WordGames.tsx`, `FallingWordsGame.tsx`.
- Race room: `app/compete/multiplayer/[code]/page.tsx`. Tournaments: `app/multiplayer/[code]/page.tsx`. Lobby: `app/multiplayer/page.tsx`. Spectator: `app/watch/[code]`.
- Design system: `app/globals.css` (tokens, `.card` ruled sections, `.pd-*` boxed profile/race language, `.lb-*`, `.ms-*`, `.cp-*` composition classes, `.rc-*` race room). Fonts: Bricolage Grotesque (headings), Onest (body), JetBrains Mono (typing).
- Settings: `lib/settingsContext.tsx` (+ `/api/settings`, table `user_settings`, `typing_prefs` jsonb).

## 4. Database
Migrations live in `supabase/migrations/`. `0001` to `0028` existed originally (profiles, typing_tests, XP, missions, races, ELO, tournaments, teams). Added in the redesign rounds, and they must be run in order in the Supabase SQL Editor:
`0029` avatars bucket, `0030` race leaderboard, `0031` shared rate limits, `0032` settle stale race (disconnects), `0033` public performance, `0034` friends, `0035` race spectator, `0036` typing prefs and extra themes, `0037` announcements, `0038` API keys.
The SQL in 0032 (impersonating auth.uid to call finish_race) and the account-delete cascade were NOT tested against a real database. Test them first.

## 5. What is built
Redesign (white default theme, top nav, ruled editorial layout, per-page compositions for Home, Leaderboard, Compete, Stats, Missions, Arcade, Academy, Teams, Ranked, Coach, Multiplayer, Tournament, Friends, Login/Signup, Profile). Profile dashboard with photo upload and crop. Multiplayer: strict word-by-word typing, win/lose screens with confetti, rematch, emotes, disconnect settlement, spectator, race leaderboard, keystroke-replay anti-cheat (`lib/raceVerify.ts`), quick race create/join. Friends (+ race challenge), friends-only leaderboard, account deletion, announcement banner. Typing: 14 themes, caret styles, smooth caret, blind mode, stop on error, live stats options, min WPM/accuracy fail rules, difficulty (normal/expert/master), custom text (never saved to stats), personal best line, Tab+Enter and Esc shortcuts. Games: Speed Rush, Accuracy Survival. Academy: 14 lessons. Share card. Legal pages (Terms, Privacy, Cookies, Acceptable Use) with footer links, no contact section by the owner's choice. `LICENSE` is "All rights reserved". API keys: Settings > API keys; read-only endpoints `GET /api/v1/me` and `GET /api/v1/results?limit=` with `Authorization: Bearer tn_...`, 60 requests/minute/key, keys stored as SHA-256 hashes, max 5 active.

## 6. Remaining work (priority order)
1. Quick wins: Profile private toggle (`profiles.is_private`, change public RPCs), suspicious/banned flags (`profiles.status`, leaderboard RPCs filter `status='ok'`), streak time zone, leaderboard own rank and opt-out, CI (GitHub Actions: tsc, lint, vitest).
2. Typing depth: Zen mode (engine end condition needs care), practise words and weak-spot mode, keyboard layouts + keymap (Urdu layouts matter), funbox modes (6), presets table, tape mode, caps lock and focus warnings, raw/errors/burst chart, speed units, pause/resume, custom theme builder, fonts/background, settings search, richer command palette, Urdu IME test on real devices.
3. Trust: report system, admin panel with audit log, server-side validation of every test (keystroke stats), blocklist for deleted accounts, blocked users.
4. Competition: team modes 2v2 to 4v4 (needs `team_size`, `team`, `finish_team_race`, no ELO), daily scheduled tournament, matchmaking queue, in-app notifications, race replays.
5. Scale: Redis rate limiting, remove race polling in favour of realtime, leaderboard caching/materialized views, integration tests for `submit_test`/`finish_race`/ELO, shared zod schemas, PWA, load tests (k6), Sentry (owner said later).
6. Needs a domain first: custom SMTP, password reset and email verify, streak reminders, SEO pages, payments.
Known fix needed: the tournament bracket sizes are 2/4/8/16 players (single elimination); they are not team modes.

## 7. How the owner likes to work
- Reply in Roman Urdu (Urdu written in English letters), plain and direct.
- No dummy or placeholder features, no fake numbers. Never remove existing features when adding new ones.
- The design must not look AI-generated: no gradients, glows, tinted icon tiles or emoji decoration. Premium comes from typography, composition and precision.
- Work on the real project files. Give a zip only when asked or when a batch is finished, and say honestly what was not verified.
- Be honest about limits: no browser or real Supabase is available to the assistant, so visual and SQL behaviour is unverified until the owner tests it.
- Explain what will be added and how it works before big features; the owner then decides.
- Not a lawyer: legal text needs review before launch (governing law is generic; a contact and deletion route is needed for privacy law).
