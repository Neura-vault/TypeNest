import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TournamentAdvanceSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { generateWordList, WORD_BANK } from "@/lib/wordBank";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`tournament-advance:${user.id}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = TournamentAdvanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }

  const { tournamentId } = parsed.data;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  if (tournament.status !== "active") {
    return NextResponse.json({ advanced: false });
  }

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("round, slot, winner_id, status")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: false });

  if (!matches || matches.length === 0) {
    return NextResponse.json({ advanced: false });
  }

  const currentRound = matches[0].round;
  const currentRoundMatches = matches
    .filter((m) => m.round === currentRound)
    .sort((a, b) => a.slot - b.slot);

  const allDone = currentRoundMatches.every((m) => m.status === "done" && m.winner_id);
  if (!allDone || currentRoundMatches.length === 1) {
    // Either still in progress, or that was the final (finish_race itself
    // marks the tournament finished when a 1-match round completes).
    return NextResponse.json({ advanced: false });
  }

  const winners = currentRoundMatches.map((m) => m.winner_id as string);
  const pairings = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairings.push({
      slot: i / 2 + 1,
      player1: winners[i],
      player2: winners[i + 1],
      wordList: generateWordList(80, false, false, WORD_BANK)
    });
  }

  const { error } = await supabase.rpc("create_tournament_round", {
    p_tournament_id: tournamentId,
    p_round: currentRound + 1,
    p_pairings: pairings
  });

  if (error) {
    // Most likely someone else's concurrent call already created this
    // round — not a real failure from the caller's point of view.
    return NextResponse.json({ advanced: false });
  }

  return NextResponse.json({ advanced: true });
}
