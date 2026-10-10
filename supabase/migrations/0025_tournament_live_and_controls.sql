-- ============================================================
-- 0025: Tournament realtime fix + leave/disband + 1v1 + public/private
--
-- ROOT CAUSE of "everyone needs to refresh": tournaments,
-- tournament_participants and tournament_matches were never added to the
-- supabase_realtime publication (teams/team_members had the exact same
-- gap). The bracket page's realtime subscription code was correct all
-- along — Postgres just wasn't sending it any events, because these
-- tables weren't in the publication at all. Fixing that alone should make
-- joins, tournament start, and match-ready all appear live with zero
-- frontend changes.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tournaments'
  ) then
    alter publication supabase_realtime add table public.tournaments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tournament_participants'
  ) then
    alter publication supabase_realtime add table public.tournament_participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tournament_matches'
  ) then
    alter publication supabase_realtime add table public.tournament_matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_members'
  ) then
    alter publication supabase_realtime add table public.team_members;
  end if;
end $$;

-- ---------- 1v1 bracket size + disbanded status ----------

alter table public.tournaments drop constraint if exists tournaments_max_participants_check;
alter table public.tournaments add constraint tournaments_max_participants_check
  check (max_participants in (2, 4, 8, 16, 32));

alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments add constraint tournaments_status_check
  check (status in ('registration', 'active', 'finished', 'disbanded'));

-- ---------- Public / private tournaments ----------

alter table public.tournaments add column if not exists is_public boolean not null default false;

create index if not exists tournaments_public_open_idx
  on public.tournaments (created_at desc)
  where is_public and status = 'registration';

-- create_tournament's signature is changing (adding p_is_public), so the
-- old 2-argument version must be dropped explicitly — otherwise Postgres
-- would keep both as separate overloads instead of replacing it.
drop function if exists public.create_tournament(text, int);

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
  if p_max_participants not in (2, 4, 8, 16, 32) then
    raise exception 'tournament size must be 2, 4, 8, 16 or 32';
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

-- ---------- Leave (before the tournament starts) ----------

create or replace function public.leave_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select host_id, status into v_host_id, v_status from public.tournaments where id = p_tournament_id;
  if v_host_id is null then
    raise exception 'tournament not found';
  end if;

  if v_status <> 'registration' then
    raise exception 'you can only leave before the tournament starts';
  end if;

  if v_host_id = v_user_id then
    raise exception 'the host must disband the tournament instead of leaving';
  end if;

  delete from public.tournament_participants
    where tournament_id = p_tournament_id and user_id = v_user_id;
end;
$$;

grant execute on function public.leave_tournament(uuid) to authenticated;

-- ---------- Disband (host-only, any time before it's finished) ----------

create or replace function public.disband_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_host_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select host_id, status into v_host_id, v_status from public.tournaments where id = p_tournament_id;
  if v_host_id is null then
    raise exception 'tournament not found';
  end if;
  if v_host_id <> v_user_id then
    raise exception 'only the host can disband the tournament';
  end if;
  if v_status = 'finished' then
    raise exception 'tournament already finished';
  end if;

  update public.tournaments set status = 'disbanded' where id = p_tournament_id and status <> 'disbanded';
end;
$$;

grant execute on function public.disband_tournament(uuid) to authenticated;
