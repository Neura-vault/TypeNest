import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RaceSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`races:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = RaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }
  const d = parsed.data;

  // The client no longer gets to say who won — submit_race compares
  // playerWpm against aiWpm itself (after checking aiWpm actually falls
  // within that difficulty's real range).
  const { data, error } = await supabase
    .rpc("submit_race", { p_difficulty: d.difficulty, p_player_wpm: d.playerWpm, p_ai_wpm: d.aiWpm })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  const row = data as { won: boolean; xp_awarded: number };
  return NextResponse.json({ won: row.won, xpAwarded: row.xp_awarded });
}
