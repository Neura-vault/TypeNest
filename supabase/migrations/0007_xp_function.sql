-- ============================================================
-- 0007: Atomic XP increment
-- Using a SQL function instead of "read xp, add, write xp" from the
-- client avoids a race condition if two requests land at the same time
-- (e.g. finishing a test in two tabs).
-- ============================================================

create or replace function public.increment_profile_xp(p_user_id uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set xp = xp + p_amount,
      level = floor((xp + p_amount) / 150) + 1,
      updated_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.increment_profile_xp(uuid, int) to authenticated;
