import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GameScoreSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required to save your score." }, { status: 401 });

  const limited = rateLimit(`game-score:${user.id}`, 15, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = GameScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }
  const d = parsed.data;

  // submit_game_score rejects a resubmission for the same game within a
  // 20-second cooldown, so one real play session can't be looped to farm XP.
  const { data, error } = await supabase
    .rpc("submit_game_score", {
      p_game_id: d.gameId,
      p_score: d.score,
      p_words_cleared: d.wordsCleared ?? 0,
      p_difficulty: d.difficulty ?? null
    })
    .single();

  if (error) {
    const tooFast = error.message?.includes("slow down");
    return NextResponse.json({ error: error.message }, { status: tooFast ? 429 : 422 });
  }

  const row = data as { xp_awarded: number };
  return NextResponse.json({ xpAwarded: row.xp_awarded });
}
