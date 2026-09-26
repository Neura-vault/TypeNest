-- ============================================================
-- 0013: Leaderboard eligibility requires a verified email
-- Signing up and saving a test happens before email confirmation is
-- enforced at the UI level (or if the project's "confirm email" setting
-- is ever turned off), which otherwise lets someone script disposable-
-- email accounts straight onto the leaderboard. Gate leaderboard
-- eligibility on auth.users.email_confirmed_at — the account can still
-- practice and save tests either way, it just won't show up publicly
-- until the email is verified.
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
  join auth.users u on u.id = t.user_id
  where u.email_confirmed_at is not null
  group by t.user_id, p.username, p.uid, p.avatar_url
  order by best_wpm desc
  limit limit_count;
$$;

comment on function public.get_leaderboard_wpm is
  'Public leaderboard read. Grouped by user_id, and restricted to accounts with a verified email so scripted disposable-email signups cannot flood it.';

grant execute on function public.get_leaderboard_wpm(int) to anon, authenticated;
