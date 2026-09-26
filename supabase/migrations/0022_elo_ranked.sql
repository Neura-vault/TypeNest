-- ============================================================
-- 0022: ELO / Ranked seasons
--
-- Every multiplayer race is rated. When the LAST participant finishes
-- (the same instant race_rooms flips to 'finished'), every finisher's
-- rating is updated by comparing them pairwise against every other
-- finisher in that race (standard multiplayer-Elo-via-pairwise-comparison
-- — there's no single "opponent" in an 8-player race, so each pair counts
-- as one mini match). Seasons are simply calendar months (rating_events.season,
-- e.g. "2026-09") — no separate season table to manage/seed.
-- ============================================================

alter table public.profiles
  add column if not exists elo_rating int not null default 1000;

create table if not exists public.rating_events (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  room_id       uuid not null references public.race_rooms(id) on delete cascade,
  delta         int not null,
  rating_after  int not null,
  season        text not null,
  created_at    timestamptz not null default now()
);

create index if not exists rating_events_user_idx on public.rating_events (user_id, created_at desc);
create index if not exists rating_events_season_idx on public.rating_events (season);

alter table public.rating_events enable row level security;

drop policy if exists "rating_events_owner_select" on public.rating_events;
create policy "rating_events_owner_select" on public.rating_events
  for select using (auth.uid() = user_id);

-- No insert/update/delete policies — rating_events rows are only ever
-- written by finish_race below.

-- Lets everyone who raced together see each other's rating change for
-- that specific race, without opening rating_events up globally. Mirrors
-- the same "own-only table RLS + a scoped SECURITY DEFINER read" pattern
-- used for typing_tests (get_leaderboard_wpm) and personal_records
-- (get_team / get_team_leaderboard).
create or replace function public.get_room_rating_events(p_room_id uuid)
returns table (user_id uuid, delta int, rating_after int)
language sql
security definer
set search_path = public
as $$
  select re.user_id, re.delta, re.rating_after
  from public.rating_events re
  where re.room_id = p_room_id
    and exists (
      select 1 from public.race_participants rp
      where rp.room_id = p_room_id and rp.user_id = auth.uid()
    );
$$;

grant execute on function public.get_room_rating_events(uuid) to authenticated;

create or replace function public.get_ranked_leaderboard(limit_count int default 50)
returns table (username text, avatar_url text, elo_rating int)
language sql
security definer
set search_path = public
as $$
  select username, avatar_url, elo_rating
  from public.profiles
  order by elo_rating desc
  limit limit_count;
$$;

grant execute on function public.get_ranked_leaderboard(int) to anon, authenticated;

-- Same signature as before (0020) — existing callers are unaffected. Only
-- the body changes: once everyone has finished, apply the rating update.
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
    -- Ties can't happen here since place is a strict 1..N ordering.
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
  end if;

  v_xp := greatest(5, round(p_wpm / 4))::int;
  perform public._award_xp(v_user_id, v_xp, 'Multiplayer race');

  return query select v_place, (v_finished >= v_total);
end;
$$;

grant execute on function public.finish_race(uuid, numeric, numeric) to authenticated;

-- get_public_profile (0010) predates elo_rating — extend it so public
-- profiles can show rank too, matching the private profile page.
drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_username text)
returns table (
  id uuid,
  username text,
  uid text,
  avatar_url text,
  bio text,
  country text,
  social_links jsonb,
  level integer,
  xp integer,
  elo_rating integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, username, uid, avatar_url, bio, country, social_links, level, xp, elo_rating, created_at
  from public.profiles
  where username = p_username or uid = p_username;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
