-- ============================================================
-- 0014: Indexes for typing_tests
-- Every mission check, the history list, and the leaderboard aggregate all
-- filter/sort by (user_id, created_at) or (user_id, wpm) — without an
-- index matching that shape, Postgres falls back to scanning every row
-- for that user (or the whole table) as it grows past a few thousand rows.
-- ============================================================

create index if not exists idx_typing_tests_user_created
  on public.typing_tests (user_id, created_at desc);

create index if not exists idx_typing_tests_user_wpm
  on public.typing_tests (user_id, wpm desc);
