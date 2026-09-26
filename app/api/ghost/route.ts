import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Ghost replay is a signed-in perk (it's racing your own history) —
  // guests just get no ghost, never an error.
  if (!user) {
    return NextResponse.json({ keystrokes: null });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "words" ? "words" : "time";
  const amountRaw = Number(searchParams.get("amount"));

  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return NextResponse.json({ keystrokes: null });
  }

  const amount = Math.round(amountRaw);
  const category = mode === "time" ? `time_${amount}` : `words_${amount}`;

  const { data: record } = await supabase
    .from("personal_records")
    .select("test_id, best_wpm")
    .eq("user_id", user.id)
    .eq("category", category)
    .maybeSingle();

  if (!record?.test_id) {
    return NextResponse.json({ keystrokes: null });
  }

  const { data: test } = await supabase
    .from("typing_tests")
    .select("keystrokes")
    .eq("id", record.test_id)
    .maybeSingle();

  const keystrokes = Array.isArray(test?.keystrokes) ? test.keystrokes : null;

  return NextResponse.json({ keystrokes, bestWpm: record.best_wpm });
}
