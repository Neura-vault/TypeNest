-- ============================================================
-- 0005: Arcade Scores, Daily Challenge, AI Races
-- ============================================================

create table if not exists public.game_scores (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_id     text not null check (game_id in ('falling-words','speed-rush','accuracy-survival')),
  score       integer not null default 0,
  words_cleared integer not null default 0,
  difficulty  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_game_scores_leaderboard on public.game_scores(game_id, score desc);

create table if not exists public.daily_challenge_attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  challenge_date date not null default current_date,
  wpm           numeric(6,2) not null,
  accuracy      numeric(5,2) not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_daily_challenge_date on public.daily_challenge_attempts(challenge_date, wpm desc);

create table if not exists public.ai_race_results (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  difficulty    text not null,
  won           boolean not null,
  player_wpm    numeric(6,2) not null,
  ai_wpm        numeric(6,2) not null,
  created_at    timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.game_scores enable row level security;
alter table public.daily_challenge_attempts enable row level security;
alter table public.ai_race_results enable row level security;

-- Scores are readable by everyone (needed for leaderboards) but only the
-- owner can insert their own row, and never edit/delete after the fact —
-- this is the basic anti-tamper rule; real anti-cheat validation happens
-- server-side in the API route before the insert, not in the database.
drop policy if exists "game_scores_read_all" on public.game_scores;
create policy "game_scores_read_all" on public.game_scores for select using (true);
drop policy if exists "game_scores_insert_own" on public.game_scores;
create policy "game_scores_insert_own" on public.game_scores
  for insert with check (auth.uid() = user_id);

drop policy if exists "challenge_read_all" on public.daily_challenge_attempts;
create policy "challenge_read_all" on public.daily_challenge_attempts for select using (true);
drop policy if exists "challenge_insert_own" on public.daily_challenge_attempts;
create policy "challenge_insert_own" on public.daily_challenge_attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "race_owner_all" on public.ai_race_results;
create policy "race_owner_all" on public.ai_race_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
