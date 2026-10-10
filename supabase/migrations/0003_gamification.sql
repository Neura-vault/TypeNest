-- ============================================================
-- 0003: Gamification — XP log, Achievements, Missions
-- ============================================================

create table if not exists public.xp_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_xp_events_user on public.xp_events(user_id, created_at desc);

-- Master list of achievements. Seeded with the same achievements the
-- prototype used locally — safe to extend with more rows later.
create table if not exists public.achievements (
  id      text primary key,
  title   text not null,
  description text not null,
  emoji   text not null default '🏅'
);

insert into public.achievements (id, title, description, emoji) values
  ('first-test',    'First Steps',     'Complete your first test',         '🎯'),
  ('three-tests',   'Warming Up',      'Complete 3 tests in one session',  '🔁'),
  ('accurate-95',   'Sharp Shooter',   'Score 95%+ accuracy in a test',    '🎯'),
  ('perfect-100',   'Flawless',        'Score 100% accuracy in a test',    '💯'),
  ('speed-40',      'Getting Quick',   'Reach 40 WPM',                     '⚡'),
  ('speed-70',      'Speed Demon',     'Reach 70 WPM',                     '🔥'),
  ('first-lesson',  'Academy Starter', 'Pass your first Academy lesson',   '🎓'),
  ('wordsmith',     'Wordsmith',       'Type 500 words in one session',    '📝'),
  ('arcade-rookie', 'Arcade Rookie',   'Play a game in the Typing Arcade', '🕹️'),
  ('arcade-ace',    'Arcade Ace',      'Score 200+ points in Falling Words','🏆'),
  ('challenger',    'Challenger',      'Attempt the Daily Challenge',      '📅'),
  ('ai-slayer',     'AI Slayer',       'Beat an AI opponent in a race',    '🤖')
on conflict (id) do nothing;

create table if not exists public.user_achievements (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  achievement_id  text not null references public.achievements(id) on delete cascade,
  unlocked_at     timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Missions are defined in application code (lib/missions.ts) so the target
-- numbers can change without a migration. This table only stores claim state.
create table if not exists public.user_mission_claims (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  mission_id  text not null,
  claimed_at  timestamptz not null default now(),
  primary key (user_id, mission_id)
);

-- ---------- Row Level Security ----------
alter table public.xp_events enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_mission_claims enable row level security;

drop policy if exists "xp_owner_all" on public.xp_events;
create policy "xp_owner_all" on public.xp_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "achievements_read_all" on public.achievements;
create policy "achievements_read_all" on public.achievements
  for select using (true); -- master list, public/static

drop policy if exists "user_achievements_owner_all" on public.user_achievements;
create policy "user_achievements_owner_all" on public.user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mission_claims_owner_all" on public.user_mission_claims;
create policy "mission_claims_owner_all" on public.user_mission_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
