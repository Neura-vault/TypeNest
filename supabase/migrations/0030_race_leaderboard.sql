-- Multiplayer leaderboard, split by how many players were in the race.
-- Ranked by wins, then by the fastest winning WPM. Only finished races count.
create or replace function public.get_race_leaderboard(p_players int)
returns table (username text, avatar_url text, races bigint, wins bigint, best_wpm numeric, avg_wpm numeric)
language sql
stable
security definer
set search_path = public
as $$
  with sizes as (
    select room_id, count(*) as n from public.race_participants group by room_id
  )
  select pr.username,
         pr.avatar_url,
         count(*) as races,
         count(*) filter (where rp.place = 1) as wins,
         coalesce(max(rp.wpm) filter (where rp.place = 1), 0) as best_wpm,
         round(avg(rp.wpm), 1) as avg_wpm
  from public.race_participants rp
  join sizes s on s.room_id = rp.room_id
  join public.race_rooms r on r.id = rp.room_id
  join public.profiles pr on pr.id = rp.user_id
  where r.status = 'finished'
    and rp.finished_at is not null
    and rp.wpm is not null
    and s.n = p_players
  group by pr.id, pr.username, pr.avatar_url
  order by wins desc, best_wpm desc, races desc
  limit 20;
$$;
grant execute on function public.get_race_leaderboard(int) to anon, authenticated;
