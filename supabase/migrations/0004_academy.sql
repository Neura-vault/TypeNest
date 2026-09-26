-- ============================================================
-- 0004: Academy — lesson progress
-- Lesson content itself lives in code (lib/academy.ts); this table
-- only tracks which lessons a user has passed.
-- ============================================================

create table if not exists public.user_lesson_progress (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  lesson_id   text not null,
  passed      boolean not null default false,
  best_wpm    numeric(6,2),
  best_accuracy numeric(5,2),
  attempts    integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.user_lesson_progress enable row level security;

drop policy if exists "lesson_progress_owner_all" on public.user_lesson_progress;
create policy "lesson_progress_owner_all" on public.user_lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
