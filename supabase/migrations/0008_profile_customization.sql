-- ============================================================
-- 0008: Profile Customization
-- Adds bio, country, social links, and a public-safe lookup
-- function so other users can view a profile without exposing
-- private data (email, settings, etc.)
-- ============================================================

alter table public.profiles
  add column if not exists bio text check (char_length(bio) <= 200),
  add column if not exists country text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

-- Usernames become part of a public URL (/u/username), so keep them
-- URL-safe: letters, numbers, underscore, hyphen only.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_-]{3,20}$');

-- social_links is a small, fixed-shape JSON object, validated at the
-- application layer (see lib/profile.ts) — e.g. { "twitter": "...", "github": "..." }.

-- Public, safe profile lookup — used by the /u/[username] page and the
-- "search by username" feature. Deliberately excludes anything private.
create or replace function public.get_public_profile(p_username text)
returns table (
  id uuid,
  username text,
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
  select id, username, avatar_url, bio, country, social_links, level, xp, created_at
  from public.profiles
  where username = p_username;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;

-- Search profiles by partial username match — powers the "find a user" box.
create or replace function public.search_profiles(p_query text, p_limit int default 10)
returns table (username text, avatar_url text, level integer)
language sql
security definer
set search_path = public
as $$
  select username, avatar_url, level
  from public.profiles
  where username ilike '%' || p_query || '%'
  order by username
  limit p_limit;
$$;

grant execute on function public.search_profiles(text, int) to anon, authenticated;
