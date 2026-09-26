-- ============================================================
-- 0018: Ghost replay — store a keystroke/progress log with each test
--
-- Adds one nullable jsonb column and one new (optional, default-null)
-- parameter to submit_test. Every existing call site that doesn't pass
-- p_keystrokes keeps working exactly as before — this is purely additive.
--
-- The log itself is a small array of [elapsed_ms, char_position] pairs
-- sampled roughly every second during a test (see TypingEngine.tsx),
-- capped well below anything that could be used to bloat a row.
-- ============================================================

alter table public.typing_tests
  add column if not exists keystrokes jsonb;

drop function if exists public.submit_test(text, text, text, int, int, numeric, numeric, numeric, numeric, int, int, int, boolean, boolean, jsonb);

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
  p_numbers boolean,
  p_char_stats jsonb default '{}'::jsonb,
  p_keystrokes jsonb default null
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
  v_keystrokes jsonb;
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

  -- Same defensive spirit as the wpm/accuracy checks above: only accept a
  -- well-formed, boundedly-sized array. Anything else is silently dropped
  -- (the test still saves — a missing ghost log is not a failure).
  v_keystrokes := null;
  if p_keystrokes is not null
     and jsonb_typeof(p_keystrokes) = 'array'
     and jsonb_array_length(p_keystrokes) <= 2000 then
    v_keystrokes := p_keystrokes;
  end if;

  insert into public.typing_tests (
    user_id, test_type, content_type, language, duration_sec, word_count,
    wpm, raw_wpm, accuracy, consistency, errors, backspaces, characters_typed,
    punctuation, numbers, keystrokes
  ) values (
    v_user_id, p_test_type, coalesce(p_content_type, 'words'), coalesce(p_language, 'en'),
    p_duration_sec, p_word_count, p_wpm, coalesce(p_raw_wpm, p_wpm), p_accuracy, p_consistency,
    coalesce(p_errors, 0), coalesce(p_backspaces, 0), coalesce(p_characters_typed, 0),
    coalesce(p_punctuation, false), coalesce(p_numbers, false), v_keystrokes
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

  -- Per-character weak-key tracking. p_char_stats looks like
  -- {"a": {"attempts": 12, "errors": 2}, "e": {...}}. Capped to a sane
  -- number of keys client-side already; still guard here against a
  -- malformed/oversized payload just in case.
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

  -- Daily practice aggregate — one row per user per day, incremented.
  insert into public.practice_sessions (user_id, session_date, tests_count, words_typed, xp_earned, duration_sec)
  values (v_user_id, current_date, 1, round(coalesce(p_characters_typed, 0) / 5.0)::int, 0, coalesce(p_duration_sec, 0))
  on conflict (user_id, session_date) do update
    set tests_count = public.practice_sessions.tests_count + 1,
        words_typed = public.practice_sessions.words_typed + round(coalesce(p_characters_typed, 0) / 5.0)::int,
        duration_sec = public.practice_sessions.duration_sec + coalesce(p_duration_sec, 0);

  v_xp := greatest(5, round(p_wpm / 3) + round(p_accuracy / 10))::int;
  perform public._award_xp(v_user_id, v_xp, 'Test completed');

  -- Now that xp is known, add it to today's session row too.
  update public.practice_sessions
    set xp_earned = xp_earned + v_xp
    where user_id = v_user_id and session_date = current_date;

  return query select v_test_id, v_xp;
end;
$$;

grant execute on function public.submit_test(text, text, text, int, int, numeric, numeric, numeric, numeric, int, int, int, boolean, boolean, jsonb, jsonb) to authenticated;
