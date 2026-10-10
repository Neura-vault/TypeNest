-- Read-only view of a race for spectators. Returns who is racing and how
-- they placed, but never the word list, so watching cannot help a player.
create or replace function public.get_race_spectator(p_code text)
returns table (room_id uuid, status text, max_players int, word_count int,
               user_id uuid, username text, wpm numeric, place int, finished_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.status, r.max_players, coalesce(cardinality(r.word_list), 0),
         p.user_id, pr.username, p.wpm, p.place, p.finished_at
  from public.race_rooms r
  left join public.race_participants p on p.room_id = r.id
  left join public.profiles pr on pr.id = p.user_id
  where r.code = upper(p_code)
  order by p.place nulls last, pr.username;
$$;
grant execute on function public.get_race_spectator(text) to authenticated;
