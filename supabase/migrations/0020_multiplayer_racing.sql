-- ============================================================
-- 0020: Real-time multiplayer racing
--
-- race_rooms / race_participants hold room setup and final results only.
-- Live mid-race progress bars are powered by a Supabase Realtime Broadcast
-- channel named `race:<room_id>` (client-side, no schema needed for that
-- part) — exactly the "no new backend infra" approach, since Broadcast is
-- already part of the Supabase project this app runs on.
-- ============================================================

create table if not exists public.race_rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  host_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'waiting' check (status in ('waiting', 'racing', 'finished')),
  word_list     text[] not null,
  max_players   int not null default 8 check (max_players between 2 and 8),
  started_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.race_participants (
  room_id       uuid not null references public.race_rooms(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  username      text not null,
  wpm           numeric,
  accuracy      numeric,
  place         int,
  finished_at   timestamptz,
  joined_at     timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists race_participants_room_idx on public.race_participants (room_id);

alter table public.race_rooms enable row level security;
alter table public.race_participants enable row level security;

-- No insert/update/delete policies on either table on purpose — every
-- write happens through the RPCs below, which validate state transitions
-- (can't start twice, can't join a full/started room, can't finish twice,
-- only the host can start). Direct client writes are simply not possible.

drop policy if exists "race_rooms_participant_select" on public.race_rooms;
create policy "race_rooms_participant_select" on public.race_rooms
  for select using (
    auth.uid() = host_id
    or exists (
      select 1 from public.race_participants rp
      where rp.room_id = race_rooms.id and rp.user_id = auth.uid()
    )
  );

drop policy if exists "race_participants_roommate_select" on public.race_participants;
create policy "race_participants_roommate_select" on public.race_participants
  for select using (
    exists (
      select 1 from public.race_participants rp2
      where rp2.room_id = race_participants.room_id and rp2.user_id = auth.uid()
    )
  );

create or replace function public.create_race_room(p_word_list text[], p_max_players int default 8)
returns table (room_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
  v_code text;
  v_room_id uuid;
  v_attempt int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_word_list is null or array_length(p_word_list, 1) is null
     or array_length(p_word_list, 1) < 10 or array_length(p_word_list, 1) > 400 then
    raise exception 'invalid word list';
  end if;

  select username into v_username from public.profiles where id = v_user_id;
  v_username := coalesce(v_username, 'Racer');

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    v_attempt := v_attempt + 1;
    exit when not exists (select 1 from public.race_rooms where code = v_code) or v_attempt > 10;
  end loop;

  insert into public.race_rooms (host_id, code, word_list, max_players)
  values (v_user_id, v_code, p_word_list, greatest(2, least(8, coalesce(p_max_players, 8))))
  returning id into v_room_id;

  insert into public.race_participants (room_id, user_id, username)
  values (v_room_id, v_user_id, v_username);

  return query select v_room_id, v_code;
end;
$$;

grant execute on function public.create_race_room(text[], int) to authenticated;

create or replace function public.join_race_room(p_code text)
returns table (room_id uuid, word_list text[], max_players int, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
  v_room public.race_rooms%rowtype;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_room from public.race_rooms where code = upper(p_code);
  if v_room.id is null then
    raise exception 'room not found';
  end if;

  -- Already in? Let them back in even after the race started (so a
  -- refresh doesn't lock someone out of a race they're already in).
  if exists (select 1 from public.race_participants where room_id = v_room.id and user_id = v_user_id) then
    return query select v_room.id, v_room.word_list, v_room.max_players, v_room.status;
    return;
  end if;

  if v_room.status <> 'waiting' then
    raise exception 'race already started';
  end if;

  select count(*) into v_count from public.race_participants where room_id = v_room.id;
  if v_count >= v_room.max_players then
    raise exception 'room is full';
  end if;

  select username into v_username from public.profiles where id = v_user_id;
  v_username := coalesce(v_username, 'Racer');

  insert into public.race_participants (room_id, user_id, username)
  values (v_room.id, v_user_id, v_username)
  on conflict (room_id, user_id) do nothing;

  return query select v_room.id, v_room.word_list, v_room.max_players, v_room.status;
end;
$$;

grant execute on function public.join_race_room(text) to authenticated;

create or replace function public.start_race(p_room_id uuid)
returns table (started_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_status text;
  v_start timestamptz;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select host_id, status into v_host_id, v_status from public.race_rooms where id = p_room_id;

  if v_host_id is null then
    raise exception 'room not found';
  end if;
  if v_host_id <> v_user_id then
    raise exception 'only the host can start the race';
  end if;
  if v_status <> 'waiting' then
    raise exception 'race already started';
  end if;

  -- Countdown is server-timed: every client compares its own clock to
  -- this shared future timestamp, so a slow network doesn't give anyone
  -- an earlier or later start than everyone else.
  v_start := now() + interval '3 seconds';

  update public.race_rooms set status = 'racing', started_at = v_start where id = p_room_id;

  return query select v_start;
end;
$$;

grant execute on function public.start_race(uuid) to authenticated;

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
  -- within milliseconds of each other can't both be computed as 1st.
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
  end if;

  v_xp := greatest(5, round(p_wpm / 4))::int;
  perform public._award_xp(v_user_id, v_xp, 'Multiplayer race');

  return query select v_place, (v_finished >= v_total);
end;
$$;

grant execute on function public.finish_race(uuid, numeric, numeric) to authenticated;

-- Postgres Changes only fires for tables added to this publication. Guarded
-- so re-running this migration doesn't error on "already a member".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'race_participants'
  ) then
    alter publication supabase_realtime add table public.race_participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'race_rooms'
  ) then
    alter publication supabase_realtime add table public.race_rooms;
  end if;
end $$;
