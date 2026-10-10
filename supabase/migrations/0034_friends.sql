-- Friends: a request is "pending" until the other person accepts it.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
-- One row per pair, whichever direction the request went.
create unique index if not exists friendships_pair_uniq
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select using (auth.uid() in (requester, addressee));

-- Requests are created through send_friend_request(); only the person who
-- received a request may accept it; either side may remove the friendship.
drop policy if exists "friendships_accept" on public.friendships;
create policy "friendships_accept" on public.friendships
  for update using (addressee = auth.uid() and status = 'pending')
  with check (addressee = auth.uid() and status = 'accepted');

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete using (auth.uid() in (requester, addressee));

create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_existing record;
begin
  if v_me is null then raise exception 'Sign in required.'; end if;
  select id into v_other from public.profiles where lower(username) = lower(trim(p_username));
  if v_other is null then raise exception 'No player with that username.'; end if;
  if v_other = v_me then raise exception 'You cannot add yourself.'; end if;

  select * into v_existing from public.friendships
   where (requester = v_me and addressee = v_other) or (requester = v_other and addressee = v_me);
  if found then
    if v_existing.status = 'accepted' then return 'already_friends'; end if;
    if v_existing.requester = v_other then
      update public.friendships set status = 'accepted' where id = v_existing.id;
      return 'accepted';
    end if;
    return 'already_requested';
  end if;

  insert into public.friendships (requester, addressee) values (v_me, v_other);
  return 'requested';
end;
$$;
grant execute on function public.send_friend_request(text) to authenticated;

create or replace function public.list_friends()
returns table (friendship_id uuid, user_id uuid, username text, avatar_url text, level int, relation text)
language sql
stable
security definer
set search_path = public
as $$
  select f.id,
         p.id,
         p.username,
         p.avatar_url,
         p.level,
         case when f.status = 'accepted' then 'friend'
              when f.addressee = auth.uid() then 'incoming'
              else 'outgoing' end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.created_at desc;
$$;
grant execute on function public.list_friends() to authenticated;
