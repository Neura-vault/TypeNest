-- ============================================================
-- 0001: Profiles & Settings
-- Extends Supabase's built-in auth.users with a public profile
-- and a private settings row, auto-created on signup.
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (char_length(username) between 3 and 20),
  avatar_url    text,
  level         integer not null default 1,
  xp            integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles(username);

create table if not exists public.user_settings (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  theme               text not null default 'aurora',
  font_size           integer not null default 16 check (font_size between 12 and 24),
  sound_enabled       boolean not null default true,
  animations_enabled  boolean not null default true,
  reduced_motion      boolean not null default false,
  focus_mode          boolean not null default false,
  updated_at          timestamptz not null default now()
);

-- Auto-create a profile + settings row whenever someone signs up.
-- Username defaults to a short random guest handle; users can change it later.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
    values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true); -- public: needed for leaderboards/usernames

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "settings_owner_only" on public.user_settings;
create policy "settings_owner_only" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
