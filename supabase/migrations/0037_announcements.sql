-- Site-wide announcements (a banner under the top bar). To publish one, insert a
-- row from the Supabase dashboard. Set active = false or ends_at to retire it.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 1 and 280),
  level text not null default 'info' check (level in ('info', 'warning')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  ends_at timestamptz
);
alter table public.announcements enable row level security;

drop policy if exists "announcements_read_active" on public.announcements;
create policy "announcements_read_active" on public.announcements
  for select using (active and (ends_at is null or ends_at > now()));
-- No insert/update/delete policies: only the dashboard (service role) can change them.
