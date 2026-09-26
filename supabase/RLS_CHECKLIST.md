# RLS Review Checklist

Every migration that adds a table, column, or changes a policy should be
checked against this list before it's considered done — not after
something goes wrong.

- [ ] Does `select` return only what the *current* row owner (or the
      public, if genuinely public data) should see? `using (true)` on a
      table with sensitive columns (auth UUIDs, emails, private notes) is
      almost always wrong — restrict to `auth.uid() = user_id`, or split
      sensitive columns into a security-definer view/RPC instead.
- [ ] Can the client `insert`/`update`/`delete` a column that should only
      ever move through server-side logic (XP, levels, scores, "won" flags,
      anything that pays out a reward)? If yes, either remove the client's
      write policy for that table and route writes through a
      `security definer` function, or add a trigger that pins the
      protected column to its old value unless a guard flag is set (see
      `protect_profile_columns` in 0011).
- [ ] Does every `security definer` function re-check `auth.uid()` against
      any user id it's given as a parameter, instead of trusting the
      parameter? A definer function bypasses RLS on purpose — it's the
      function body's job to enforce the same rule RLS would have.
- [ ] Are amounts/scores/results bounded to a plausible range *inside* the
      function or a check constraint — not only validated in the Next.js
      route, which a direct API call can skip entirely?
- [ ] If two of these can run concurrently for the same user (two tabs, a
      double-click, a retried request), is the result still correct? Read-
      then-write from the client is the usual way this breaks — prefer a
      single atomic function, an `on conflict ... where` upsert, or a
      unique constraint the second request can fail against cleanly.

## What's been reviewed so far

Migrations 0001-0007 were the original schema. Everything from 0008
onward was audited and hardened in this pass (`0011_security_hardening`,
`0012_leaderboard_group_fix`, `0013_leaderboard_email_verified`,
`0014_typing_tests_indexes`):

- `profiles`: `xp`/`level` protected by trigger; `select` narrowed to
  owner-only (public lookups go through `get_public_profile`/
  `search_profiles`/`get_leaderboard_wpm`, all security-definer).
- `xp_events`: select-only for the owner; all writes go through
  `_award_xp()`.
- `typing_tests`: no direct insert; `submit_test()` validates and writes
  atomically (test row + personal record + xp, one transaction).
- `ai_race_results`: no direct insert; `submit_race()` decides the winner
  server-side instead of trusting the client's claim.
- `daily_challenge_attempts`: unique `(user_id, challenge_date)` constraint
  + `submit_daily_challenge()`, so only the first attempt of the day pays
  out, enforced at the DB level, not just app logic.
- `game_scores`: no direct insert; `submit_game_score()` adds a per-user,
  per-game cooldown.
- `user_lesson_progress`: no direct upsert; `submit_lesson_progress()`
  whitelists lesson ids and does the attempts-increment atomically.
- `user_mission_claims`: no direct insert; `claim_mission()` re-verifies
  progress in SQL and relies on the table's primary key to make a
  duplicate claim fail cleanly under concurrent requests.
- `leaderboard_wpm` (the old abandoned view): dropped — it bypassed RLS
  and nothing referenced it anymore.

Next time a migration touches any of the above, or adds a new table, run
it through this checklist before merging.
