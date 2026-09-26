import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TestSchema } from "@/lib/validation";
import { rateLimit, requestIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save your results." }, { status: 401 });
  }

  const limited = rateLimit(`tests:${user.id}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = TestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }
  const d = parsed.data;

  // Everything — the test row, the personal-record upsert (only if it's
  // actually an improvement), the xp_events log, and the profile xp bump —
  // happens inside one database transaction (see submit_test in migration
  // 0011). Either all of it lands, or none of it does.
  const { data, error } = await supabase
    .rpc("submit_test", {
      p_test_type: d.testType,
      p_content_type: d.contentType ?? "words",
      p_language: d.language ?? "en",
      p_duration_sec: d.durationSec ?? null,
      p_word_count: d.wordCount ?? null,
      p_wpm: d.wpm,
      p_raw_wpm: d.rawWpm ?? d.wpm,
      p_accuracy: d.accuracy,
      p_consistency: d.consistency ?? null,
      p_errors: d.errors ?? 0,
      p_backspaces: d.backspaces ?? 0,
      p_characters_typed: d.charactersTyped ?? 0,
      p_punctuation: !!d.punctuation,
      p_numbers: !!d.numbers,
      p_char_stats: d.charStats ?? {},
      p_keystrokes: d.keystrokes ?? null
    })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { test_id: number; xp_awarded: number };
  return NextResponse.json({ testId: row.test_id, xpAwarded: row.xp_awarded });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view your history." }, { status: 401 });
  }

  const limited = rateLimit(`tests-get:${requestIp(request)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 30);

  const { data, error } = await supabase
    .from("typing_tests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tests: data });
}
