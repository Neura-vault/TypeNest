-- ============================================================
-- 0026: Reliable tournament match room lookup
--
-- The bracket page needs to know "is there a race room for MY current
-- match, and what's its code". The previous approach fetched race_rooms
-- directly from the client-authenticated query, relying on race_rooms'
-- RLS policy (which itself references race_participants) resolving
-- correctly. This function removes that dependency entirely — it runs
-- with elevated privileges and explicitly filters to only the caller's
-- own matches, so there's no ambiguity left to debug.
-- ============================================================

create or replace function public.get_my_tournament_rooms(p_tournament_id uuid)
returns table (match_id uuid, room_code text)
language sql
security definer
set search_path = public
as $$
  select tm.id, r.code
  from public.tournament_matches tm
  join public.race_rooms r on r.id = tm.race_room_id
  where tm.tournament_id = p_tournament_id
    and tm.status <> 'done'
    and (tm.player1_id = auth.uid() or tm.player2_id = auth.uid());
$$;

grant execute on function public.get_my_tournament_rooms(uuid) to authenticated;
