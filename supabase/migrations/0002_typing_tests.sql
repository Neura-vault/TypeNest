-- ============================================================
-- 0002: Typing Tests, Personal Records, Practice Sessions
-- ============================================================

create table if not exists public.typing_tests (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  test_type         text not null check (test_type in ('time','words')),
  content_type      text not null default 'words' check (content_type in ('words','code','quote')),
  language          text not null default 'en',
  duration_sec      integer,          -- set for time-based tests
  word_count        integer,          -- set for word-based tests
  wpm               numeric(6,2) not null check (wpm >= 0),
  raw_wpm           numeric(6,2) not null check (raw_wpm >= 0),
  accuracy          numeric(5,2) not null check (accuracy between 0 and 100),
  consistency       numeric(5,2),
  errors            integer not null default 0,
  backspaces        integer not null default 0,
  characters_typed  integer not null default 0,
  punctuation       boolean not null default false,
  numbers           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_typing_tests_user_created
  on public.typing_tests(user_id, created_at desc);

create table if not exists public.personal_records (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null,        -- e.g. 'time_60', 'words_50'
  best_wpm      numeric(6,2) not null,
  best_accuracy numeric(5,2) not null,
  test_id       bigint references public.typing_tests(id) on delete set null,
  achieved_at   timestamptz not null default now(),
  unique(user_id, category)
);

create table if not exists public.practice_sessions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  session_date  date not null default current_date,
  tests_count   integer not null default 0,
  words_typed   integer not null default 0,
  xp_earned     integer not null default 0,
  duration_sec  integer not null default 0,
  unique(user_id, session_date)
);

-- Per-character weakness tracking (feeds the weak-keys heatmap and AI coach)
create table if not exists public.char_stats (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  char      text not null check (char_length(char) = 1),
  attempts  integer not null default 0,
  errors    integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, char)
);

-- ---------- Row Level Security ----------
alter table public.typing_tests enable row level security;
alter table public.personal_records enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.char_stats enable row level security;

drop policy if exists "tests_owner_select" on public.typing_tests;
create policy "tests_owner_select" on public.typing_tests
  for select using (auth.uid() = user_id);
drop policy if exists "tests_owner_insert" on public.typing_tests;
create policy "tests_owner_insert" on public.typing_tests
  for insert with check (auth.uid() = user_id);

drop policy if exists "records_owner_all" on public.personal_records;
create policy "records_owner_all" on public.personal_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions_owner_all" on public.practice_sessions;
create policy "sessions_owner_all" on public.practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "charstats_owner_all" on public.char_stats;
create policy "charstats_owner_all" on public.char_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
