-- ============================================================
-- 0012: Leaderboard groups by the actual user, not their (changeable)
-- username. Grouping by username meant that if the unique constraint on
-- it were ever relaxed, or it went briefly null during a rename, two
-- different people could get merged into a single leaderboard row.
-- Grouping by the real primary key (t.user_id) is correct regardless.
-- ============================================================

drop function if exists public.get_leaderboard_wpm(int);
create function public.get_leaderboard_wpm(limit_count int default 50)
returns table (username text, uid text, avatar_url text, best_wpm numeric, tests_taken bigint)
language sql
security definer
set search_path = public
as $$
  select p.username, p.uid, p.avatar_url, max(t.wpm) as best_wpm, count(*) as tests_taken
  from public.typing_tests t
  join public.profiles p on p.id = t.user_id
  group by t.user_id, p.username, p.uid, p.avatar_url
  order by best_wpm desc
  limit limit_count;
$$;

comment on function public.get_leaderboard_wpm is
  'Public leaderboard read: returns only username/uid/avatar/best-wpm, never raw test rows. Safe to call from anon/authenticated roles. Grouped by the real user_id, not the mutable username.';

grant execute on function public.get_leaderboard_wpm(int) to anon, authenticated;
