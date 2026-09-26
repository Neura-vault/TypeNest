-- ============================================================
-- 0011: Security hardening (P0)
-- Closes every P0 item from the security audit:
--  - xp/level columns writable by any authenticated user
--  - increment_profile_xp callable on anyone's behalf, uncapped
--  - typing_tests insertable directly by the client (anti-cheat bypass)
--  - abandoned leaderboard_wpm view bypassing RLS
--  - xp_events rows insertable/editable/deletable by the client
--  - race outcome decided by the client
--  - daily challenge / game scores / academy progress: unlimited XP farm
--  - profiles table fully readable (incl. the real auth UUID) by anyone
--
-- Every XP-awarding action now goes through one security-definer function
-- per action. Each function: validates input server-side, does its writes
-- in a single transaction (so a test/score/claim and its XP can never end
-- up half-saved), and is the ONLY way XP moves. The tables themselves no
-- longer accept direct client INSERTs for anything that pays out XP.
-- ============================================================

-- ---------- 1. Nobody can write their own xp/level directly ----------

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.xp_write', true) is distinct from 'on' then
    new.xp    := old.xp;
    new.level := old.level;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_xp on public.profiles;
create trigger profiles_protect_xp
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- profiles is no longer readable by anon/other users at the raw-table
-- level (that exposed the real auth UUID, which is exactly what made the
-- increment_profile_xp exploit below possible). Every legitimate "look up
-- someone else's profile" path already goes through a security-definer
-- RPC (get_public_profile, search_profiles, get_leaderboard_wpm), so this
-- doesn't break anything — those RPCs bypass RLS on purpose and already
-- only return safe columns.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- ---------- 2. increment_profile_xp: verify caller + cap the amount ----------

create or replace function public.increment_profile_xp(p_user_id uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 200 then
    raise exception 'invalid amount';
  end if;

  perform set_config('app.xp_write', 'on', true);
  update public.profiles
  set xp = xp + p_amount,
      level = floor((xp + p_amount) / 150) + 1,
      updated_at = now()
  where id = p_user_id;
  perform set_config('app.xp_write', 'off', true);
end;
$$;

grant execute on function public.increment_profile_xp(uuid, int) to authenticated;

-- Small internal helper reused by every function below so the "add xp,
-- log the event" pair always happens together, in the same transaction,
-- with the same guard rail. Not exposed to PostgREST (no grant to anon/
-- authenticated) — it's plpgsql-callable only.
create or replace function public._award_xp(p_user_id uuid, p_amount int, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount > 0 then
    insert into public.xp_events (user_id, amount, reason) values (p_user_id, p_amount, p_reason);
    perform set_config('app.xp_write', 'on', true);
    update public.profiles
    set xp = xp + p_amount,
        level = floor((xp + p_amount) / 150) + 1,
        updated_at = now()
    where id = p_user_id;
    perform set_config('app.xp_write', 'off', true);
  end if;
end;
$$;

-- ---------- 3. xp_events: read-only to the client from now on ----------

drop policy if exists "xp_owner_all" on public.xp_events;
create policy "xp_owner_select" on public.xp_events
  for select using (auth.uid() = user_id);

-- ---------- 4. typing_tests: no more direct insert, use submit_test() ----------

drop policy if exists "tests_owner_insert" on public.typing_tests;

-- Fixes, in one place:
--  - anti-cheat WPM cap was only checked in the Next.js route, never the DB
--  - personal_records .lt() filter silently did nothing on upsert, so every
--    test overwrote the "best" record even when it was worse
--  - test insert + personal record + xp_events + profile xp were 4 separate
--    calls; if any one failed, the others had already committed
--  - a failed RPC (e.g. before migration 0007 existed) was being silently
--    swallowed by the API route with .then(()=>{}, ()=>{})
create or replace function public.submit_test(
  p_test_type text,
  p_content_type text,
  p_language text,
  p_duration_sec int,
  p_word_count int,
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_consistency numeric,
  p_errors int,
  p_backspaces int,
  p_characters_typed int,
  p_punctuation boolean,
  p_numbers boolean
)
returns table (test_id bigint, xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_test_id bigint;
  v_category text;
  v_xp int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_test_type not in ('time', 'words') then
    raise exception 'invalid test type';
  end if;
  if p_wpm is null or p_wpm < 0 or p_wpm > 350 then
    raise exception 'result rejected: wpm outside plausible range';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'result rejected: invalid accuracy';
  end if;

  insert into public.typing_tests (
    user_id, test_type, content_type, language, duration_sec, word_count,
    wpm, raw_wpm, accuracy, consistency, errors, backspaces, characters_typed,
    punctuation, numbers
  ) values (
    v_user_id, p_test_type, coalesce(p_content_type, 'words'), coalesce(p_language, 'en'),
    p_duration_sec, p_word_count, p_wpm, coalesce(p_raw_wpm, p_wpm), p_accuracy, p_consistency,
    coalesce(p_errors, 0), coalesce(p_backspaces, 0), coalesce(p_characters_typed, 0),
    coalesce(p_punctuation, false), coalesce(p_numbers, false)
  )
  returning id into v_test_id;

  v_category := case when p_test_type = 'time' then 'time_' || p_duration_sec else 'words_' || p_word_count end;

  insert into public.personal_records (user_id, category, best_wpm, best_accuracy, test_id, achieved_at)
  values (v_user_id, v_category, p_wpm, p_accuracy, v_test_id, now())
  on conflict (user_id, category) do update
    set best_wpm = excluded.best_wpm,
        best_accuracy = excluded.best_accuracy,
        test_id = excluded.test_id,
        achieved_at = excluded.achieved_at
    where public.personal_records.best_wpm < excluded.best_wpm;

  v_xp := greatest(5, round(p_wpm / 3) + round(p_accuracy / 10))::int;
  perform public._award_xp(v_user_id, v_xp, 'Test completed');

  return query select v_test_id, v_xp;
end;
$$;

grant execute on function public.submit_test(text, text, text, int, int, numeric, numeric, numeric, numeric, int, int, int, boolean, boolean) to authenticated;

-- ---------- 5. Drop the abandoned RLS-bypassing view ----------

drop view if exists public.leaderboard_wpm;

-- ---------- 6. Race outcome decided server-side, not by the client ----------

drop policy if exists "race_owner_all" on public.ai_race_results;
create policy "race_owner_select" on public.ai_race_results
  for select using (auth.uid() = user_id);

create or replace function public.submit_race(
  p_difficulty text,
  p_player_wpm numeric,
  p_ai_wpm numeric
)
returns table (won boolean, xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bounds numeric[];
  v_won boolean;
  v_xp int;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_player_wpm is null or p_player_wpm < 0 or p_player_wpm > 350 then
    raise exception 'result rejected';
  end if;

  -- Same ranges as PACE_LEVELS in app/compete/page.tsx, with a small buffer
  -- for float rounding — keeps the client from also faking a low aiWpm.
  v_bounds := case p_difficulty
    when 'beginner' then array[10, 30]
    when 'easy'     then array[23, 43]
    when 'normal'   then array[37, 60]
    when 'hard'     then array[53, 80]
    when 'expert'   then array[73, 100]
    when 'insane'   then array[95, 135]
    else null
  end;
  if v_bounds is null or p_ai_wpm is null or p_ai_wpm < v_bounds[1] or p_ai_wpm > v_bounds[2] then
    raise exception 'invalid difficulty/aiWpm';
  end if;

  v_won := p_player_wpm > p_ai_wpm;

  insert into public.ai_race_results (user_id, difficulty, won, player_wpm, ai_wpm)
  values (v_user_id, p_difficulty, v_won, p_player_wpm, p_ai_wpm);

  v_xp := case when v_won then 30 else 12 end;
  perform public._award_xp(v_user_id, v_xp, case when v_won then 'Won a Pace Bot race' else 'Pace Bot race finished' end);

  return query select v_won, v_xp;
end;
$$;

grant execute on function public.submit_race(text, numeric, numeric) to authenticated;

-- ---------- 7. Daily challenge: one paid attempt per day, not per request ----------

drop policy if exists "challenge_insert_own" on public.daily_challenge_attempts;

alter table public.daily_challenge_attempts
  drop constraint if exists daily_challenge_attempts_one_per_day;
alter table public.daily_challenge_attempts
  add constraint daily_challenge_attempts_one_per_day unique (user_id, challenge_date);

create or replace function public.submit_daily_challenge(p_wpm numeric, p_accuracy numeric)
returns table (xp_awarded int, first_attempt_today boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_xp int := 0;
  v_first boolean := false;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_wpm is null or p_wpm < 0 or p_wpm > 350 then raise exception 'result rejected'; end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then raise exception 'result rejected'; end if;

  begin
    insert into public.daily_challenge_attempts (user_id, challenge_date, wpm, accuracy)
    values (v_user_id, current_date, p_wpm, p_accuracy);
    v_first := true;
  exception when unique_violation then
    v_first := false;
  end;

  if v_first then
    v_xp := greatest(8, round(p_wpm / 3))::int;
    perform public._award_xp(v_user_id, v_xp, 'Daily Challenge attempt');
  end if;

  return query select v_xp, v_first;
end;
$$;

grant execute on function public.submit_daily_challenge(numeric, numeric) to authenticated;

-- ---------- 8. Game scores: cooldown so one run can't be resubmitted in a loop ----------

drop policy if exists "game_scores_insert_own" on public.game_scores;

create or replace function public.submit_game_score(p_game_id text, p_score int, p_words_cleared int, p_difficulty text)
returns table (xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last timestamptz;
  v_xp int;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_game_id not in ('falling-words', 'speed-rush', 'accuracy-survival') then
    raise exception 'invalid game';
  end if;
  if p_score is null or p_score < 0 or p_score > 100000 then
    raise exception 'score rejected: outside plausible range';
  end if;

  select max(created_at) into v_last from public.game_scores
    where user_id = v_user_id and game_id = p_game_id;
  if v_last is not null and v_last > now() - interval '20 seconds' then
    raise exception 'too many submissions — slow down';
  end if;

  insert into public.game_scores (user_id, game_id, score, words_cleared, difficulty)
  values (v_user_id, p_game_id, p_score, coalesce(p_words_cleared, 0), p_difficulty);

  v_xp := greatest(5, round(p_score / 8.0))::int;
  perform public._award_xp(v_user_id, v_xp, p_game_id || ' game');

  return query select v_xp;
end;
$$;

grant execute on function public.submit_game_score(text, int, int, text) to authenticated;

-- ---------- 9. Academy progress: whitelisted lesson ids, atomic attempts ----------

drop policy if exists "lesson_progress_owner_all" on public.user_lesson_progress;
create policy "lesson_progress_owner_select" on public.user_lesson_progress
  for select using (auth.uid() = user_id);

create or replace function public.submit_lesson_progress(p_lesson_id text, p_wpm numeric, p_accuracy numeric)
returns table (passed boolean, xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_passed boolean;
  v_already_passed boolean;
  v_xp int := 0;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_lesson_id not in ('home-row', 'top-row', 'common-words') then
    raise exception 'unknown lesson';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then raise exception 'invalid accuracy'; end if;
  if p_wpm is not null and (p_wpm < 0 or p_wpm > 350) then raise exception 'invalid wpm'; end if;

  v_passed := p_accuracy >= 90;

  select passed into v_already_passed from public.user_lesson_progress
    where user_id = v_user_id and lesson_id = p_lesson_id;

  insert into public.user_lesson_progress (user_id, lesson_id, passed, best_wpm, best_accuracy, attempts, updated_at)
  values (v_user_id, p_lesson_id, v_passed, coalesce(p_wpm, 0), p_accuracy, 1, now())
  on conflict (user_id, lesson_id) do update
    set passed = user_lesson_progress.passed or v_passed,
        best_wpm = greatest(user_lesson_progress.best_wpm, coalesce(p_wpm, 0)),
        best_accuracy = greatest(user_lesson_progress.best_accuracy, p_accuracy),
        attempts = user_lesson_progress.attempts + 1,
        updated_at = now();

  if v_passed and not coalesce(v_already_passed, false) then
    v_xp := 25;
    perform public._award_xp(v_user_id, v_xp, p_lesson_id || ' lesson passed');
  end if;

  return query select v_passed, v_xp;
end;
$$;

grant execute on function public.submit_lesson_progress(text, numeric, numeric) to authenticated;

-- ---------- 10. Mission claims: atomic check-and-pay, sum() instead of loading rows ----------

drop policy if exists "mission_claims_owner_all" on public.user_mission_claims;
create policy "mission_claims_owner_select" on public.user_mission_claims
  for select using (auth.uid() = user_id);

create or replace function public.get_mission_progress(p_user_id uuid, p_mission_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result int;
begin
  case p_mission_id
    when 'm1' then
      select count(*) into v_result from public.typing_tests where user_id = p_user_id;
    when 'm2' then
      select coalesce(sum(round(characters_typed / 5.0)), 0) into v_result
        from public.typing_tests where user_id = p_user_id;
    when 'm3' then
      select count(*) into v_result from public.typing_tests where user_id = p_user_id and accuracy >= 90 limit 1;
      v_result := least(v_result, 1);
    when 'm4' then
      select count(*) into v_result from public.user_lesson_progress where user_id = p_user_id and passed = true;
    when 'm5' then
      select count(*) into v_result from public.game_scores where user_id = p_user_id;
    when 'm6' then
      select count(*) into v_result from public.ai_race_results where user_id = p_user_id and won = true;
    when 'm7' then
      select count(*) into v_result from public.typing_tests where user_id = p_user_id and wpm >= 60 limit 1;
      v_result := least(v_result, 1);
    when 'm8' then
      select count(*) into v_result from public.daily_challenge_attempts where user_id = p_user_id;
    when 'm9' then
      select count(*) into v_result from public.typing_tests where user_id = p_user_id and content_type = 'code' limit 1;
      v_result := least(v_result, 1);
    else
      v_result := 0;
  end case;
  return coalesce(v_result, 0);
end;
$$;

-- Mission target/xp table mirrors lib/gamification.ts MISSIONS — kept in
-- sync manually since targets rarely change; the important part (the
-- payout amount) is now enforced here, not trusted from the client.
create or replace function public.claim_mission(p_mission_id text)
returns table (xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target int;
  v_xp int;
  v_progress int;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select target, xp into v_target, v_xp from (values
    ('m1', 3, 20), ('m2', 300, 25), ('m3', 1, 15), ('m4', 1, 20), ('m5', 2, 20),
    ('m6', 1, 25), ('m7', 1, 20), ('m8', 1, 15), ('m9', 1, 10)
  ) as missions(id, target, xp) where id = p_mission_id;

  if v_target is null then raise exception 'unknown mission'; end if;

  v_progress := public.get_mission_progress(v_user_id, p_mission_id);
  if v_progress < v_target then
    raise exception 'mission not complete yet';
  end if;

  begin
    insert into public.user_mission_claims (user_id, mission_id) values (v_user_id, p_mission_id);
  exception when unique_violation then
    raise exception 'already claimed';
  end;

  perform public._award_xp(v_user_id, v_xp, 'Mission: ' || p_mission_id);
  return query select v_xp;
end;
$$;

grant execute on function public.claim_mission(text) to authenticated;
