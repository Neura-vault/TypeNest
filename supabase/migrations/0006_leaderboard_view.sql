-- ============================================================
-- 0006: Leaderboard view
-- A single, indexed, read-only view the /api/leaderboard route
-- queries from. Keeps ranking logic in one place instead of
-- duplicated across client code.
-- ============================================================

create or replace view public.leaderboard_wpm as
select
  t.user_id,
  p.username,
  p.avatar_url,
  max(t.wpm) as best_wpm,
  count(*) as tests_taken
from public.typing_tests t
join public.profiles p on p.id = t.user_id
group by t.user_id, p.username, p.avatar_url
order by best_wpm desc;

-- Views inherit RLS from their underlying tables automatically in Postgres
-- when created with the invoker's permissions; typing_tests already
-- restricts SELECT to the owner, which would make this view useless for a
-- real leaderboard. So we intentionally expose only the aggregated,
-- non-sensitive columns via a SECURITY DEFINER function instead of relying
-- on the raw view for cross-user reads.
create or replace function public.get_leaderboard_wpm(limit_count int default 50)
returns table (username text, avatar_url text, best_wpm numeric, tests_taken bigint)
language sql
security definer
set search_path = public
as $$
  select p.username, p.avatar_url, max(t.wpm) as best_wpm, count(*) as tests_taken
  from public.typing_tests t
  join public.profiles p on p.id = t.user_id
  group by p.username, p.avatar_url
  order by best_wpm desc
  limit limit_count;
$$;

comment on function public.get_leaderboard_wpm is
  'Public leaderboard read: returns only username/avatar/best-wpm, never raw test rows. Safe to call from anon/authenticated roles.';

grant execute on function public.get_leaderboard_wpm(int) to anon, authenticated;
