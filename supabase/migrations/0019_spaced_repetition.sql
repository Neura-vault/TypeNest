-- ============================================================
-- 0019: Spaced-repetition state for the weak-key drill
--
-- A small Leitner system: each character the user has drilled sits in a
-- "box" (0-5). A clean review moves it up a box (further out); a missed
-- review drops it back to box 0 (due again tomorrow). This is deliberately
-- simpler than full SM-2 — fewer moving parts, same practical effect for
-- single characters.
-- ============================================================

create table if not exists public.char_review_state (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  char              text not null check (char_length(char) = 1),
  box               int not null default 0 check (box between 0 and 5),
  next_due_at       timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  primary key (user_id, char)
);

alter table public.char_review_state enable row level security;

drop policy if exists "char_review_owner_all" on public.char_review_state;
create policy "char_review_owner_all" on public.char_review_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists char_review_state_due_idx
  on public.char_review_state (user_id, next_due_at);

create or replace function public.submit_char_reviews(p_results jsonb)
returns table (xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_char text;
  v_passed boolean;
  v_item jsonb;
  v_current_box int;
  v_new_box int;
  v_interval_days int;
  v_reviewed_count int := 0;
  v_xp int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    return query select 0;
    return;
  end if;

  if jsonb_array_length(p_results) > 100 then
    raise exception 'too many characters in one submission';
  end if;

  for v_item in select * from jsonb_array_elements(p_results)
  loop
    v_char := v_item->>'char';
    v_passed := coalesce((v_item->>'passed')::boolean, false);

    if v_char is null or char_length(v_char) <> 1 then
      continue;
    end if;

    select box into v_current_box from public.char_review_state
      where user_id = v_user_id and char = v_char;

    v_current_box := coalesce(v_current_box, 0);
    v_new_box := case when v_passed then least(5, v_current_box + 1) else 0 end;

    v_interval_days := case v_new_box
      when 0 then 0
      when 1 then 1
      when 2 then 3
      when 3 then 7
      when 4 then 14
      else 30
    end;

    insert into public.char_review_state (user_id, char, box, next_due_at, last_reviewed_at)
    values (v_user_id, v_char, v_new_box, now() + (v_interval_days || ' days')::interval, now())
    on conflict (user_id, char) do update
      set box = v_new_box,
          next_due_at = now() + (v_interval_days || ' days')::interval,
          last_reviewed_at = now();

    v_reviewed_count := v_reviewed_count + 1;
  end loop;

  if v_reviewed_count > 0 then
    v_xp := 8;
    perform public._award_xp(v_user_id, v_xp, 'Spaced-repetition review');
  end if;

  return query select v_xp;
end;
$$;

grant execute on function public.submit_char_reviews(jsonb) to authenticated;
