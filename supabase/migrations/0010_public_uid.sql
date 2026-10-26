-- ============================================================
-- 0010: Public UID
-- Every profile gets a permanent, unique, non-editable identity
-- number (e.g. "TN-100042") separate from the username. Username
-- can be changed by the owner at any time; the uid never changes,
-- so it's the one stable way to reference/search for a person.
-- ============================================================

create sequence if not exists public.profiles_uid_seq start 100000;

alter table public.profiles
  add column if not exists uid text;

-- Backfill any existing profiles that don't have a uid yet, oldest
-- account first, so ids are assigned in a stable, predictable order.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where uid is null order by created_at asc loop
    update public.profiles
      set uid = 'TN-' || lpad(nextval('public.profiles_uid_seq')::text, 6, '0')
      where id = r.id;
  end loop;
end $$;

alter table public.profiles
  alter column uid set not null;

drop index if exists idx_profiles_uid;
create unique index idx_profiles_uid on public.profiles(uid);

-- Auto-assign a uid to every new profile from now on.
create or replace function public.assign_profile_uid()
returns trigger as $$
begin
  if new.uid is null then
    new.uid := 'TN-' || lpad(nextval('public.profiles_uid_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_assign_uid on public.profiles;
create trigger on_profile_assign_uid
  before insert on public.profiles
  for each row execute function public.assign_profile_uid();

-- ---------- Update public-facing functions to expose + search uid ----------

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
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, username, uid, avatar_url, bio, country, social_links, level, xp, created_at
  from public.profiles
  where username = p_username or uid = p_username;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;

-- Search now matches on username OR uid, so entering someone's ID number
-- finds them just like typing their name does.
drop function if exists public.search_profiles(text, int);
create function public.search_profiles(p_query text, p_limit int default 10)
returns table (username text, uid text, avatar_url text, level integer)
language sql
security definer
set search_path = public
as $$
  select username, uid, avatar_url, level
  from public.profiles
  where username ilike '%' || p_query || '%' or uid ilike '%' || p_query || '%'
  order by username
  limit p_limit;
$$;

grant execute on function public.search_profiles(text, int) to anon, authenticated;

drop function if exists public.get_leaderboard_wpm(int);
create function public.get_leaderboard_wpm(limit_count int default 50)
returns table (username text, uid text, avatar_url text, best_wpm numeric, tests_taken bigint)
language sql
security definer
set search_path = public
as $$
  select p.username, p.uid, p.avatar_url, max(t.wpm) as best_wpm, count(*) as tests_taken
  from public.typing_tests t
  join public.profiles p on p.id = t.user_id
  group by p.username, p.uid, p.avatar_url
  order by best_wpm desc
  limit limit_count;
$$;

comment on function public.get_leaderboard_wpm is
  'Public leaderboard read: returns only username/uid/avatar/best-wpm, never raw test rows. Safe to call from anon/authenticated roles.';

grant execute on function public.get_leaderboard_wpm(int) to anon, authenticated;
