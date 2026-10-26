-- Personal API keys. Only a SHA-256 hash of each key is stored, so a leaked
-- database cannot reveal working keys. The key itself is shown once, at creation.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_user_idx on public.api_keys (user_id);
alter table public.api_keys enable row level security;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own" on public.api_keys for select using (user_id = auth.uid());
drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own" on public.api_keys for insert with check (user_id = auth.uid());
drop policy if exists "api_keys_revoke_own" on public.api_keys;
create policy "api_keys_revoke_own" on public.api_keys for update using (user_id = auth.uid()) with check (user_id = auth.uid());
