import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TournamentStartSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { generateWordList, WORD_BANK } from "@/lib/wordBank";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const limited = rateLimit(`tournament-start:${user.id}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = TournamentStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 422 });
  }

  const { tournamentId } = parsed.data;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, host_id, status, max_participants")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  if (tournament.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can start the tournament." }, { status: 403 });
  }
  if (tournament.status !== "registration") {
    return NextResponse.json({ error: "Tournament already started." }, { status: 422 });
  }

  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("user_id")
    .eq("tournament_id", tournamentId);

  const ids = (participants ?? []).map((p) => p.user_id);
  if (ids.length !== tournament.max_participants) {
    return NextResponse.json(
      { error: `Need exactly ${tournament.max_participants} participants to start (have ${ids.length}).` },
      { status: 422 }
    );
  }

  const shuffled = shuffle(ids);
  const pairings = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairings.push({
      slot: i / 2 + 1,
      player1: shuffled[i],
      player2: shuffled[i + 1],
      wordList: generateWordList(80, false, false, WORD_BANK)
    });
  }

  const { error } = await supabase.rpc("create_tournament_round", {
    p_tournament_id: tournamentId,
    p_round: 1,
    p_pairings: pairings
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
