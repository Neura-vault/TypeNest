-- Disconnect handling. Once someone has finished a race, any player who is
-- still unfinished 30 seconds later is treated as gone: they are recorded as
-- last place (0 WPM) so the race can close and Elo can be settled for
-- everyone else. Only a participant of the room can trigger this.
--
-- finish_race() reads auth.uid(), so each absent player is finished by
-- temporarily setting the request's user id to theirs for this transaction.
create or replace function public.settle_stale_race(p_room_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_first timestamptz;
  v_n int := 0;
  r record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.race_participants where room_id = p_room_id and user_id = v_uid) then
    raise exception 'not a participant in this race';
  end if;
  if coalesce((select status from public.race_rooms where id = p_room_id), '') <> 'racing' then
    return 0;
  end if;

  select min(finished_at) into v_first
    from public.race_participants where room_id = p_room_id and finished_at is not null;
  if v_first is null or v_first > now() - interval '30 seconds' then
    return 0;
  end if;

  for r in
    select user_id from public.race_participants
    where room_id = p_room_id and finished_at is null and user_id <> v_uid
  loop
    perform set_config('request.jwt.claim.sub', r.user_id::text, true);
    perform public.finish_race(p_room_id, 0, 0);
    v_n := v_n + 1;
  end loop;

  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  return v_n;
end;
$$;
grant execute on function public.settle_stale_race(uuid) to authenticated;
