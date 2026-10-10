-- ============================================================
-- 0021: Teams / Clans
--
-- One team per user (enforced by a plain unique constraint on
-- team_members.user_id) — keeps "this user's stats count toward exactly
-- one team's average" unambiguous. Rooms/teams are found by a short code,
-- same UX as multiplayer racing.
-- ============================================================

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 40),
  code        text not null unique,
  emoji       text not null default '🏳️',
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Teams are a public/social feature (unlike race rooms) — anyone signed in
-- can see team names and rosters, which is what makes a team leaderboard
-- possible at all. No insert/update/delete policies on either table: every
-- write goes through the RPCs below.
drop policy if exists "teams_public_select" on public.teams;
create policy "teams_public_select" on public.teams
  for select using (auth.uid() is not null);

drop policy if exists "team_members_public_select" on public.team_members;
create policy "team_members_public_select" on public.team_members
  for select using (auth.uid() is not null);

create or replace function public.create_team(p_name text, p_emoji text default '🏳️')
returns table (team_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_emoji text := left(coalesce(nullif(trim(p_emoji), ''), '🏳️'), 8);
  v_code text;
  v_team_id uuid;
  v_attempt int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'team name must be between 2 and 40 characters';
  end if;

  if exists (select 1 from public.team_members where user_id = v_user_id) then
    raise exception 'you are already in a team — leave it first';
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    v_attempt := v_attempt + 1;
    exit when not exists (select 1 from public.teams where code = v_code) or v_attempt > 10;
  end loop;

  insert into public.teams (name, code, emoji, created_by)
  values (v_name, v_code, v_emoji, v_user_id)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, v_user_id, 'owner');

  return query select v_team_id, v_code;
end;
$$;

grant execute on function public.create_team(text, text) to authenticated;

create or replace function public.join_team(p_code text)
returns table (team_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.team_members where user_id = v_user_id) then
    raise exception 'you are already in a team — leave it first';
  end if;

  select id into v_team_id from public.teams where code = upper(p_code);
  if v_team_id is null then
    raise exception 'team not found';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, v_user_id, 'member');

  return query select v_team_id;
end;
$$;

grant execute on function public.join_team(text) to authenticated;

create or replace function public.leave_team()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_was_owner boolean;
  v_remaining_count int;
  v_next_owner uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select team_id, (role = 'owner') into v_team_id, v_was_owner
    from public.team_members where user_id = v_user_id;

  if v_team_id is null then
    raise exception 'you are not in a team';
  end if;

  delete from public.team_members where user_id = v_user_id;

  select count(*) into v_remaining_count from public.team_members where team_id = v_team_id;

  if v_remaining_count = 0 then
    delete from public.teams where id = v_team_id;
  elsif v_was_owner then
    select user_id into v_next_owner from public.team_members
      where team_id = v_team_id order by joined_at asc limit 1;
    update public.team_members set role = 'owner' where team_id = v_team_id and user_id = v_next_owner;
  end if;
end;
$$;

grant execute on function public.leave_team() to authenticated;

-- Aggregated team roster + each member's best-ever wpm (across any test
-- category). Bypasses personal_records' owner-only RLS deliberately —
-- same technique 0006's get_leaderboard_wpm already uses for typing_tests.
create or replace function public.get_team(p_team_id uuid)
returns table (
  team_id uuid,
  name text,
  code text,
  emoji text,
  member_user_id uuid,
  member_username text,
  member_avatar_url text,
  member_role text,
  member_best_wpm numeric
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.code,
    t.emoji,
    tm.user_id,
    p.username,
    p.avatar_url,
    tm.role,
    (select max(pr.best_wpm) from public.personal_records pr where pr.user_id = tm.user_id)
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  join public.profiles p on p.id = tm.user_id
  where t.id = p_team_id
  order by 9 desc nulls last;
$$;

grant execute on function public.get_team(uuid) to authenticated;

create or replace function public.get_team_leaderboard(limit_count int default 50)
returns table (team_id uuid, name text, emoji text, member_count bigint, avg_wpm numeric)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.emoji,
    count(tm.user_id) as member_count,
    round(avg(best.wpm), 1) as avg_wpm
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  left join lateral (
    select max(pr.best_wpm) as wpm from public.personal_records pr where pr.user_id = tm.user_id
  ) best on true
  group by t.id, t.name, t.emoji
  having count(best.wpm) > 0
  order by avg_wpm desc nulls last
  limit limit_count;
$$;

grant execute on function public.get_team_leaderboard(int) to authenticated;
