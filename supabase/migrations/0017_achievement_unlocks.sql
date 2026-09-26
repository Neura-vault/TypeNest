-- ============================================================
-- 0017: Achievement unlock logic
-- The achievements table (0003) was already seeded with all 12 rows, and
-- profile pages already read from user_achievements to display them —
-- what was missing is the one piece that actually inserts a row there.
-- This adds check_and_unlock_achievements(), called at the end of every
-- action that could complete one (test, lesson, game, race, challenge),
-- so achievements unlock the moment they're actually earned.
-- ============================================================

-- Also fold the "AI" rename into the seed data — title/description are
-- user-facing, unlike the id (an internal key, left alone so nothing
-- that already references 'ai-slayer' needs to change).
update public.achievements
  set title = 'Bot Buster', description = 'Beat a Pace Bot in a race'
  where id = 'ai-slayer';

create or replace function public.check_and_unlock_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test_count int;
  v_max_accuracy numeric;
  v_max_wpm numeric;
  v_total_words numeric;
  v_lesson_passed boolean;
  v_game_count int;
  v_arcade_best int;
  v_challenge_count int;
  v_race_won boolean;
begin
  select count(*), coalesce(max(accuracy), 0), coalesce(max(wpm), 0), coalesce(sum(characters_typed), 0) / 5.0
    into v_test_count, v_max_accuracy, v_max_wpm, v_total_words
    from public.typing_tests where user_id = p_user_id;

  select exists(select 1 from public.user_lesson_progress where user_id = p_user_id and passed = true) into v_lesson_passed;
  select count(*) into v_game_count from public.game_scores where user_id = p_user_id;
  select coalesce(max(score), 0) into v_arcade_best from public.game_scores where user_id = p_user_id and game_id = 'falling-words';
  select count(*) into v_challenge_count from public.daily_challenge_attempts where user_id = p_user_id;
  select exists(select 1 from public.ai_race_results where user_id = p_user_id and won = true) into v_race_won;

  -- Each insert is a no-op if already unlocked (primary key on
  -- user_id+achievement_id), so calling this repeatedly is always safe.
  insert into public.user_achievements (user_id, achievement_id)
  select p_user_id, id from (values
    ('first-test',   v_test_count >= 1),
    ('three-tests',  v_test_count >= 3),
    ('accurate-95',  v_max_accuracy >= 95),
    ('perfect-100',  v_max_accuracy >= 100),
    ('speed-40',     v_max_wpm >= 40),
    ('speed-70',     v_max_wpm >= 70),
    ('first-lesson', v_lesson_passed),
    ('wordsmith',    v_total_words >= 500),
    ('arcade-rookie', v_game_count >= 1),
    ('arcade-ace',   v_arcade_best >= 200),
    ('challenger',   v_challenge_count >= 1),
    ('ai-slayer',    v_race_won)
  ) as conditions(id, met)
  where met
  on conflict (user_id, achievement_id) do nothing;
end;
$$;

-- Not exposed to PostgREST directly (no grant to anon/authenticated) —
-- it's only ever called from inside the other security-definer functions
-- below, right after they do their real work.

create or replace function public.submit_test(
  p_test_type text, p_content_type text, p_language text, p_duration_sec int, p_word_count int,
  p_wpm numeric, p_raw_wpm numeric, p_accuracy numeric, p_consistency numeric, p_errors int,
  p_backspaces int, p_characters_typed int, p_punctuation boolean, p_numbers boolean,
  p_char_stats jsonb default '{}'::jsonb
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
  v_char text;
  v_stat jsonb;
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

  if p_char_stats is not null and jsonb_typeof(p_char_stats) = 'object' then
    for v_char, v_stat in select * from jsonb_each(p_char_stats)
    loop
      if char_length(v_char) = 1
         and (v_stat->>'attempts') ~ '^[0-9]+$'
         and (v_stat->>'errors') ~ '^[0-9]+$' then
        insert into public.char_stats (user_id, char, attempts, errors, updated_at)
        values (v_user_id, v_char, least((v_stat->>'attempts')::int, 10000), least((v_stat->>'errors')::int, 10000), now())
        on conflict (user_id, char) do update
          set attempts = public.char_stats.attempts + excluded.attempts,
              errors = public.char_stats.errors + excluded.errors,
              updated_at = now();
      end if;
    end loop;
  end if;

  insert into public.practice_sessions (user_id, session_date, tests_count, words_typed, xp_earned, duration_sec)
  values (v_user_id, current_date, 1, round(coalesce(p_characters_typed, 0) / 5.0)::int, 0, coalesce(p_duration_sec, 0))
  on conflict (user_id, session_date) do update
    set tests_count = public.practice_sessions.tests_count + 1,
        words_typed = public.practice_sessions.words_typed + round(coalesce(p_characters_typed, 0) / 5.0)::int,
        duration_sec = public.practice_sessions.duration_sec + coalesce(p_duration_sec, 0);

  v_xp := greatest(5, round(p_wpm / 3) + round(p_accuracy / 10))::int;
  perform public._award_xp(v_user_id, v_xp, 'Test completed');

  update public.practice_sessions
    set xp_earned = xp_earned + v_xp
    where user_id = v_user_id and session_date = current_date;

  perform public.check_and_unlock_achievements(v_user_id);

  return query select v_test_id, v_xp;
end;
$$;

grant execute on function public.submit_test(text, text, text, int, int, numeric, numeric, numeric, numeric, int, int, int, boolean, boolean, jsonb) to authenticated;

-- The other action functions just get the one new line added at the end.

create or replace function public.submit_race(p_difficulty text, p_player_wpm numeric, p_ai_wpm numeric)
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
  perform public.check_and_unlock_achievements(v_user_id);

  return query select v_won, v_xp;
end;
$$;

grant execute on function public.submit_race(text, numeric, numeric) to authenticated;

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

  perform public.check_and_unlock_achievements(v_user_id);

  return query select v_xp, v_first;
end;
$$;

grant execute on function public.submit_daily_challenge(numeric, numeric) to authenticated;

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
  perform public.check_and_unlock_achievements(v_user_id);

  return query select v_xp;
end;
$$;

grant execute on function public.submit_game_score(text, int, int, text) to authenticated;

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

  perform public.check_and_unlock_achievements(v_user_id);

  return query select v_passed, v_xp;
end;
$$;

grant execute on function public.submit_lesson_progress(text, numeric, numeric) to authenticated;
