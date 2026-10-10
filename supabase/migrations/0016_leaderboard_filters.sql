-- ============================================================
-- 0016: Leaderboard filters
-- Was a single all-time, any-mode ranking — the same handful of very
-- early, very dedicated users occupy every top spot forever, which is
-- demotivating for anyone newer. Adds a time window (today / this week /
-- this month / all time) and an optional test-mode filter (15s/30s/60s
-- time tests, or 25/50/100-word tests) so there's a leaderboard someone
-- can realistically climb.
-- ============================================================

drop function if exists public.get_leaderboard_wpm(int);
create function public.get_leaderboard_wpm(
  limit_count int default 50,
  p_period text default 'all',
  p_category text default null
)
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
    and (
      p_period = 'all'
      or (p_period = 'daily' and t.created_at >= date_trunc('day', now()))
      or (p_period = 'weekly' and t.created_at >= date_trunc('week', now()))
      or (p_period = 'monthly' and t.created_at >= date_trunc('month', now()))
    )
    and (
      p_category is null
      or (p_category = 'time_15' and t.test_type = 'time' and t.duration_sec = 15)
      or (p_category = 'time_30' and t.test_type = 'time' and t.duration_sec = 30)
      or (p_category = 'time_60' and t.test_type = 'time' and t.duration_sec = 60)
      or (p_category = 'words_25' and t.test_type = 'words' and t.word_count = 25)
      or (p_category = 'words_50' and t.test_type = 'words' and t.word_count = 50)
      or (p_category = 'words_100' and t.test_type = 'words' and t.word_count = 100)
    )
  group by t.user_id, p.username, p.uid, p.avatar_url
  order by best_wpm desc
  limit limit_count;
$$;

comment on function public.get_leaderboard_wpm is
  'Public leaderboard read, filterable by time period (all/daily/weekly/monthly) and test category. Grouped by user_id, restricted to verified emails.';

grant execute on function public.get_leaderboard_wpm(int, text, text) to anon, authenticated;
