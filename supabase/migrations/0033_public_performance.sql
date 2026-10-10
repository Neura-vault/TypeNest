-- Lets a public profile show the same performance charts as the owner's
-- profile. Returns only numbers (no typed text) for the last 365 days.
create or replace function public.get_public_performance(p_username text)
returns table (wpm numeric, accuracy numeric, consistency numeric, characters_typed int, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select t.wpm, t.accuracy, t.consistency, t.characters_typed, t.created_at
  from public.typing_tests t
  join public.profiles p on p.id = t.user_id
  where lower(p.username) = lower(p_username)
    and t.created_at > now() - interval '365 days'
  order by t.created_at
  limit 2000;
$$;
grant execute on function public.get_public_performance(text) to anon, authenticated;
