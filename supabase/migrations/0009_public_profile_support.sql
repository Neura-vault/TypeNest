-- ============================================================
-- 0009: Public Profile Support
-- Two things a visitor needs to see on someone else's profile
-- that the existing owner-only RLS policies correctly block by
-- default: aggregate stats, and which achievements they've earned.
-- Both are exposed narrowly — never raw test rows.
-- ============================================================

-- Aggregate-only stats for a public profile. Never exposes individual
-- test rows (those stay owner-only via the existing RLS policy).
create or replace function public.get_public_profile_stats(p_username text)
returns table (tests_taken bigint, best_wpm numeric, avg_accuracy numeric)
language sql
security definer
set search_path = public
as $$
  select count(*) as tests_taken,
         coalesce(max(t.wpm), 0) as best_wpm,
         coalesce(round(avg(t.accuracy), 1), 0) as avg_accuracy
  from public.typing_tests t
  join public.profiles p on p.id = t.user_id
  where p.username = p_username;
$$;

grant execute on function public.get_public_profile_stats(text) to anon, authenticated;

-- Achievements earned are shown on a person's public profile (like Steam/
-- Xbox badges) — not sensitive, so a public read policy is appropriate
-- here, unlike the private typing_tests table. Insert/update/delete stay
-- owner-only via the existing policy from migration 0003.
drop policy if exists "user_achievements_public_read" on public.user_achievements;
create policy "user_achievements_public_read" on public.user_achievements
  for select using (true);
