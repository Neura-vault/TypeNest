-- ============================================================
-- 0023: Tournament brackets (single elimination)
--
-- Every match is just a 2-player race_rooms row — the existing race UI,
-- realtime progress, and finish_race scoring are reused completely
-- unchanged. This migration only adds bracket bookkeeping and a hook in
-- finish_race that resolves a match and (when a round completes) leaves
-- the "generate the next round" work to the API layer, since word-list
-- generation lives in TypeScript (lib/wordBank.ts), not SQL.
--
-- v1 deliberately requires the participant count to exactly equal
-- max_participants (4/8/16/32) before a tournament can start — no byes,
-- no uneven rounds. Every round therefore has exactly half as many
-- matches as the one before it, all the way down to one final.
-- ============================================================

create table if not exists public.tournaments (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 60),
  code              text not null unique,
  host_id           uuid not null references public.profiles(id) on delete cascade,
  max_participants  int not null check (max_participants in (4, 8, 16, 32)),
  status            text not null default 'registration' check (status in ('registration', 'active', 'finished')),
  champion_id       uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  started_at        timestamptz
);

create table if not exists public.tournament_participants (
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  username       text not null,
  joined_at      timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create table if not exists public.tournament_matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments(id) on delete cascade,
  round           int not null,
  slot            int not null,
  player1_id      uuid not null references public.profiles(id),
  player2_id      uuid not null references public.profiles(id),
  winner_id       uuid references public.profiles(id),
  race_room_id    uuid references public.race_rooms(id),
  status          text not null default 'ready' check (status in ('ready', 'done')),
  created_at      timestamptz not null default now(),
  unique (tournament_id, round, slot)
);

create index if not exists tournament_matches_lookup_idx on public.tournament_matches (tournament_id, round);

alter table public.race_rooms
  add column if not exists tournament_match_id uuid references public.tournament_matches(id);

alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches enable row level security;

-- Public/social, same as teams: anyone signed in can see a tournament's
-- bracket, roster, and match results. No insert/update/delete policies —
-- every write goes through the RPCs below.
drop policy if exists "tournaments_public_select" on public.tournaments;
create policy "tournaments_public_select" on public.tournaments
  for select using (auth.uid() is not null);

drop policy if exists "tournament_participants_public_select" on public.tournament_participants;
create policy "tournament_participants_public_select" on public.tournament_participants
  for select using (auth.uid() is not null);

drop policy if exists "tournament_matches_public_select" on public.tournament_matches;
create policy "tournament_matches_public_select" on public.tournament_matches
  for select using (auth.uid() is not null);

create or replace function public.create_tournament(p_name text, p_max_participants int)
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
  if p_max_participants not in (4, 8, 16, 32) then
    raise exception 'tournament size must be 4, 8, 16 or 32';
  end if;

  select username into v_username from public.profiles where id = v_user_id;
  v_username := coalesce(v_username, 'Racer');

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    v_attempt := v_attempt + 1;
    exit when not exists (select 1 from public.tournaments where code = v_code) or v_attempt > 10;
  end loop;

  insert into public.tournaments (name, code, host_id, max_participants)
  values (v_name, v_code, v_user_id, p_max_participants)
  returning id into v_id;

  insert into public.tournament_participants (tournament_id, user_id, username)
  values (v_id, v_user_id, v_username);

  return query select v_id, v_code;
end;
$$;

grant execute on function public.create_tournament(text, int) to authenticated;

create or replace function public.join_tournament(p_code text)
returns table (tournament_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
  v_tournament public.tournaments%rowtype;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_tournament from public.tournaments where code = upper(p_code);
  if v_tournament.id is null then
    raise exception 'tournament not found';
  end if;

  if exists (select 1 from public.tournament_participants where tournament_id = v_tournament.id and user_id = v_user_id) then
    return query select v_tournament.id;
    return;
  end if;

  if v_tournament.status <> 'registration' then
    raise exception 'registration is closed for this tournament';
  end if;

  select count(*) into v_count from public.tournament_participants where tournament_id = v_tournament.id;
  if v_count >= v_tournament.max_participants then
    raise exception 'tournament is full';
  end if;

  select username into v_username from public.profiles where id = v_user_id;
  v_username := coalesce(v_username, 'Racer');

  insert into public.tournament_participants (tournament_id, user_id, username)
  values (v_tournament.id, v_user_id, v_username);

  return query select v_tournament.id;
end;
$$;

grant execute on function public.join_tournament(text) to authenticated;

-- Persists one full round of matches (each with its own pre-generated
-- word list) atomically, and creates the matching 2-player race rooms.
-- Called by the API layer for round 1 (right after start_tournament
-- authorizes the transition) and for every later round (right after the
-- previous round is detected as complete). The unique (tournament_id,
-- round, slot) constraint makes this naturally idempotent — a duplicate
-- call for a round that already exists fails harmlessly and is ignored
-- by the caller, so two clients racing to advance the same round can't
-- create it twice.
create or replace function public.create_tournament_round(p_tournament_id uuid, p_round int, p_pairings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_pairing jsonb;
  v_player1 uuid;
  v_player2 uuid;
  v_word_list text[];
  v_match_id uuid;
  v_room_id uuid;
  v_code text;
  v_attempt int;
  v_username1 text;
  v_username2 text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select status into v_status from public.tournaments where id = p_tournament_id;
  if v_status is null then
    raise exception 'tournament not found';
  end if;

  if exists (select 1 from public.tournament_matches where tournament_id = p_tournament_id and round = p_round) then
    -- Already created (by this call or a concurrent one) — idempotent no-op.
    return;
  end if;

  if p_round = 1 then
    if v_status <> 'registration' then
      raise exception 'tournament already started';
    end if;
    update public.tournaments set status = 'active', started_at = now() where id = p_tournament_id;
  elsif v_status <> 'active' then
    raise exception 'tournament is not active';
  end if;

  for v_pairing in select * from jsonb_array_elements(p_pairings)
  loop
    v_player1 := (v_pairing->>'player1')::uuid;
    v_player2 := (v_pairing->>'player2')::uuid;

    select array_agg(value) into v_word_list
      from jsonb_array_elements_text(v_pairing->'wordList');

    if v_player1 is null or v_player2 is null or v_word_list is null or array_length(v_word_list, 1) < 10 then
      raise exception 'invalid pairing payload';
    end if;

    insert into public.tournament_matches (tournament_id, round, slot, player1_id, player2_id, status)
    values (p_tournament_id, p_round, (v_pairing->>'slot')::int, v_player1, v_player2, 'ready')
    returning id into v_match_id;

    select username into v_username1 from public.profiles where id = v_player1;
    select username into v_username2 from public.profiles where id = v_player2;

    v_attempt := 0;
    loop
      v_code := upper(substr(md5(random()::text), 1, 6));
      v_attempt := v_attempt + 1;
      exit when not exists (select 1 from public.race_rooms where code = v_code) or v_attempt > 10;
    end loop;

    insert into public.race_rooms (host_id, code, word_list, max_players, status, started_at, tournament_match_id)
    values (v_player1, v_code, v_word_list, 2, 'racing', now() + interval '5 seconds', v_match_id)
    returning id into v_room_id;

    insert into public.race_participants (room_id, user_id, username) values
      (v_room_id, v_player1, coalesce(v_username1, 'Racer')),
      (v_room_id, v_player2, coalesce(v_username2, 'Racer'));

    update public.tournament_matches set race_room_id = v_room_id where id = v_match_id;
  end loop;
end;
$$;

grant execute on function public.create_tournament_round(uuid, int, jsonb) to authenticated;

-- Same signature as 0022 — only the body changes, adding a tournament
-- resolution step that runs after the existing race-finish/Elo logic.
create or replace function public.finish_race(p_room_id uuid, p_wpm numeric, p_accuracy numeric)
returns table (place int, all_finished boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_place int;
  v_total int;
  v_finished int;
  v_xp int;
  v_season text := to_char(now(), 'YYYY-MM');
  v_k numeric := 24;
  rec_i record;
  rec_j record;
  v_expected numeric;
  v_actual numeric;
  v_delta_sum numeric;
  v_delta_count int;
  v_delta int;
  v_new_rating int;
  v_match_id uuid;
  v_match_winner uuid;
  v_match_round int;
  v_match_tournament uuid;
  v_matches_in_round int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_wpm is null or p_wpm < 0 or p_wpm > 350 then
    raise exception 'result rejected: wpm outside plausible range';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'result rejected: invalid accuracy';
  end if;

  select status into v_status from public.race_rooms where id = p_room_id;
  if v_status is null then
    raise exception 'room not found';
  end if;
  if v_status <> 'racing' then
    raise exception 'race is not in progress';
  end if;

  if not exists (select 1 from public.race_participants where room_id = p_room_id and user_id = v_user_id) then
    raise exception 'not a participant in this race';
  end if;

  -- Serialize concurrent finishes for this room so two players finishing
  -- within milliseconds of each other can't both be computed as 1st, and
  -- so the "is everyone done yet" check below can't race either.
  perform 1 from public.race_rooms where id = p_room_id for update;

  select count(*) into v_place from public.race_participants
    where room_id = p_room_id and finished_at is not null;
  v_place := v_place + 1;

  update public.race_participants
    set wpm = p_wpm, accuracy = p_accuracy, place = v_place, finished_at = now()
    where room_id = p_room_id and user_id = v_user_id and finished_at is null;

  select count(*), count(*) filter (where finished_at is not null)
    into v_total, v_finished
    from public.race_participants where room_id = p_room_id;

  if v_finished >= v_total then
    update public.race_rooms set status = 'finished' where id = p_room_id;

    -- Multiplayer Elo: for every finisher, compare against every other
    -- finisher and average the pairwise rating changes into one delta.
    for rec_i in
      select rp.user_id, rp.place, p.elo_rating
      from public.race_participants rp
      join public.profiles p on p.id = rp.user_id
      where rp.room_id = p_room_id and rp.place is not null
    loop
      v_delta_sum := 0;
      v_delta_count := 0;

      for rec_j in
        select rp2.user_id, rp2.place, p2.elo_rating
        from public.race_participants rp2
        join public.profiles p2 on p2.id = rp2.user_id
        where rp2.room_id = p_room_id and rp2.place is not null and rp2.user_id <> rec_i.user_id
      loop
        v_expected := 1.0 / (1.0 + power(10, (rec_j.elo_rating - rec_i.elo_rating) / 400.0));
        v_actual := case when rec_i.place < rec_j.place then 1.0 else 0.0 end;
        v_delta_sum := v_delta_sum + (v_k * (v_actual - v_expected));
        v_delta_count := v_delta_count + 1;
      end loop;

      if v_delta_count > 0 then
        v_delta := round(v_delta_sum / v_delta_count);
        v_new_rating := greatest(100, rec_i.elo_rating + v_delta);

        update public.profiles set elo_rating = v_new_rating where id = rec_i.user_id;

        insert into public.rating_events (user_id, room_id, delta, rating_after, season)
        values (rec_i.user_id, p_room_id, v_delta, v_new_rating, v_season);
      end if;
    end loop;

    -- Tournament resolution: if this room was a bracket match, record the
    -- winner. Generating the *next* round is left to the API layer (word
    -- lists are built in TypeScript) — it detects a fully-done round via
    -- the same realtime updates the bracket page already subscribes to.
    select tournament_match_id into v_match_id from public.race_rooms where id = p_room_id;

    if v_match_id is not null then
      select user_id into v_match_winner from public.race_participants
        where room_id = p_room_id and place = 1;

      select tournament_id, round into v_match_tournament, v_match_round
        from public.tournament_matches where id = v_match_id;

      update public.tournament_matches
        set winner_id = v_match_winner, status = 'done'
        where id = v_match_id;

      select count(*) into v_matches_in_round
        from public.tournament_matches
        where tournament_id = v_match_tournament and round = v_match_round;

      -- A round of exactly one match, once it's done, is the final.
      if v_matches_in_round = 1 then
        update public.tournaments
          set status = 'finished', champion_id = v_match_winner
          where id = v_match_tournament;
      end if;
    end if;
  end if;

  v_xp := greatest(5, round(p_wpm / 4))::int;
  perform public._award_xp(v_user_id, v_xp, 'Multiplayer race');

  return query select v_place, (v_finished >= v_total);
end;
$$;

grant execute on function public.finish_race(uuid, numeric, numeric) to authenticated;
