-- ============================================================
-- 0027: Fix "Room not found" — reliable race room lookup
--
-- The race room page's GET /api/race-rooms/[code] read race_rooms and
-- race_participants directly through the client-authenticated connection,
-- relying on race_rooms' RLS policy (which itself queries
-- race_participants, which has its own RLS policy referencing itself) to
-- resolve correctly. In practice that chain was not reliably returning
-- rows the caller should absolutely have been allowed to see — the exact
-- same category of issue already worked around for tournaments and teams.
-- This applies the same fix: one SECURITY DEFINER function, no RLS
-- chain to reason about.
-- ============================================================

create or replace function public.get_race_room(p_code text)
returns table (
  room_id uuid,
  code text,
  status text,
  word_list text[],
  max_players int,
  host_id uuid,
  started_at timestamptz,
  tournament_match_id uuid,
  participant_user_id uuid,
  participant_username text,
  participant_wpm numeric,
  participant_accuracy numeric,
  participant_place int,
  participant_finished_at timestamptz,
  participant_joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, r.code, r.status, r.word_list, r.max_players, r.host_id, r.started_at, r.tournament_match_id,
    rp.user_id, rp.username, rp.wpm, rp.accuracy, rp.place, rp.finished_at, rp.joined_at
  from public.race_rooms r
  join public.race_participants rp on rp.room_id = r.id
  where r.code = upper(p_code)
    and exists (
      select 1 from public.race_participants me
      where me.room_id = r.id and me.user_id = auth.uid()
    )
  order by rp.joined_at asc;
$$;

grant execute on function public.get_race_room(text) to authenticated;
