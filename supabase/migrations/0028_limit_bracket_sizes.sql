-- ============================================================
-- 0028: Limit bracket size to 1v1 / 2v2 / 3v3 / 4v4 (2/4/8/16)
--
-- The UI no longer offers a 32-player bracket, so the database shouldn't
-- accept one either. Internal object names (tournaments, create_tournament,
-- etc.) are unchanged — only user-facing routes, labels, and copy were
-- renamed to "Multiplayer". Renaming tables/functions would touch every
-- migration that references them for zero visible benefit and real risk.
-- ============================================================

alter table public.tournaments drop constraint if exists tournaments_max_participants_check;
alter table public.tournaments add constraint tournaments_max_participants_check
  check (max_participants in (2, 4, 8, 16));

create or replace function public.create_tournament(p_name text, p_max_participants int, p_is_public boolean default false)
returns table (tournament_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_username text;
  v_code text;
  v_id uuid;
  v_attempt int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'tournament name must be between 2 and 60 characters';
  end if;
  if p_max_participants not in (2, 4, 8, 16) then
    raise exception 'bracket size must be 2, 4, 8 or 16';
  end if;

  select username into v_username from public.profiles where id = v_user_id;
  v_username := coalesce(v_username, 'Racer');

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    v_attempt := v_attempt + 1;
    exit when not exists (select 1 from public.tournaments t where t.code = v_code) or v_attempt > 10;
  end loop;

  insert into public.tournaments (name, code, host_id, max_participants, is_public)
  values (v_name, v_code, v_user_id, p_max_participants, coalesce(p_is_public, false))
  returning id into v_id;

  insert into public.tournament_participants (tournament_id, user_id, username)
  values (v_id, v_user_id, v_username);

  return query select v_id, v_code;
end;
$$;

grant execute on function public.create_tournament(text, int, boolean) to authenticated;
