import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const code = params.code?.toUpperCase();
  if (!code || !/^[A-Z0-9]{4,8}$/.test(code)) {
    return NextResponse.json({ error: "Invalid tournament code." }, { status: 400 });
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, code, host_id, max_participants, status, champion_id, created_at")
    .eq("code", code)
    .maybeSingle();

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("user_id, username, joined_at")
    .eq("tournament_id", tournament.id)
    .order("joined_at", { ascending: true });

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("id, round, slot, player1_id, player2_id, winner_id, race_room_id, status")
    .eq("tournament_id", tournament.id)
    .order("round", { ascending: true })
    .order("slot", { ascending: true });

  const myRoomIds = (matches ?? [])
    .filter((m) => (m.player1_id === user.id || m.player2_id === user.id) && m.race_room_id && m.status !== "done")
    .map((m) => m.race_room_id as string);

  let roomCodeByRoomId = new Map<string, string>();
  if (myRoomIds.length > 0) {
    const { data: rooms } = await supabase.from("race_rooms").select("id, code").in("id", myRoomIds);
    roomCodeByRoomId = new Map((rooms ?? []).map((r) => [r.id, r.code]));
  }

  const enrichedMatches = (matches ?? []).map((m) => ({
    ...m,
    roomCode: m.race_room_id ? roomCodeByRoomId.get(m.race_room_id) ?? null : null
  }));

  const usernameByUserId = new Map((participants ?? []).map((p) => [p.user_id, p.username]));

  return NextResponse.json({
    tournament,
    participants: participants ?? [],
    matches: enrichedMatches,
    usernames: Object.fromEntries(usernameByUserId),
    you: user.id
  });
}
